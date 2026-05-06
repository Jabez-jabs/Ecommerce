"""
Recommendation Engine
=====================
Builds an item-item co-occurrence matrix from purchase history.

Algorithm (simple but effective):
  For every pair of products bought together in the same order,
  increment their co-occurrence count. Normalize by product popularity
  to get a Jaccard-like score. Store top-N pairs in DB.

Run nightly as a background job.
"""

from __future__ import annotations
import logging
from collections import defaultdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class RecommendationEngine:

    def __init__(self, top_n: int = 10, min_co_occurrences: int = 2):
        self.top_n = top_n
        self.min_co_occurrences = min_co_occurrences

    def build_co_occurrence_matrix(self, db: "Session") -> dict[str, dict[str, int]]:
        """
        Reads all delivered orders and builds:
          co_occurrence[product_A][product_B] = number_of_orders_containing_both
        """
        from app.models.order import Order, OrderItem, OrderStatus

        # Fetch all delivered orders with their items
        orders = (
            db.query(Order)
            .filter(Order.status == OrderStatus.delivered)
            .all()
        )

        co_occurrence: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        product_frequency: dict[str, int] = defaultdict(int)

        for order in orders:
            product_ids = list({str(item.variant.product_id) for item in order.items if item.variant})
            for pid in product_ids:
                product_frequency[pid] += 1
            # All pairs
            for i in range(len(product_ids)):
                for j in range(i + 1, len(product_ids)):
                    a, b = product_ids[i], product_ids[j]
                    co_occurrence[a][b] += 1
                    co_occurrence[b][a] += 1

        return co_occurrence, product_frequency

    def compute_jaccard_scores(
        self,
        co_occurrence: dict,
        product_frequency: dict,
    ) -> dict[str, list[tuple[str, float]]]:
        """
        Jaccard similarity: |A ∩ B| / |A ∪ B|
        = co_occur(A,B) / (freq(A) + freq(B) - co_occur(A,B))
        Returns top-N recommendations per product.
        """
        recommendations: dict[str, list[tuple[str, float]]] = {}

        for product_a, related in co_occurrence.items():
            scores = []
            freq_a = product_frequency.get(product_a, 1)
            for product_b, count in related.items():
                if count < self.min_co_occurrences:
                    continue
                freq_b = product_frequency.get(product_b, 1)
                union = freq_a + freq_b - count
                jaccard = count / union if union > 0 else 0
                scores.append((product_b, round(jaccard, 4)))
            scores.sort(key=lambda x: x[1], reverse=True)
            recommendations[product_a] = scores[: self.top_n]

        return recommendations

    def save_recommendations(self, recommendations: dict, db: "Session") -> int:
        """Clears old recommendations and writes fresh ones."""
        from app.models.events import ProductRecommendation
        import uuid

        # Clear stale data
        db.query(ProductRecommendation).delete()

        rows = []
        for source_id, recs in recommendations.items():
            for rec_id, score in recs:
                rows.append(
                    ProductRecommendation(
                        source_product_id=uuid.UUID(source_id),
                        recommended_product_id=uuid.UUID(rec_id),
                        score=score,
                        recommendation_type="co_purchase",
                    )
                )
        db.bulk_save_objects(rows)
        db.commit()
        logger.info(f"Saved {len(rows)} recommendation pairs.")
        return len(rows)

    def run(self, db: "Session") -> dict:
        """Full pipeline: build matrix → score → save. Run nightly."""
        logger.info("Starting recommendation engine rebuild...")
        co_occurrence, product_frequency = self.build_co_occurrence_matrix(db)
        if not co_occurrence:
            logger.warning("No purchase data found. Skipping recommendation rebuild.")
            return {"pairs_saved": 0}
        recommendations = self.compute_jaccard_scores(co_occurrence, product_frequency)
        pairs_saved = self.save_recommendations(recommendations, db)
        return {"pairs_saved": pairs_saved, "products_covered": len(recommendations)}

    def get_recommendations(self, product_id: str, db: "Session") -> list[dict]:
        """Fetch precomputed recommendations for a product (used by API)."""
        from app.models.events import ProductRecommendation
        from app.models.product import Product

        recs = (
            db.query(ProductRecommendation)
            .filter(ProductRecommendation.source_product_id == product_id)
            .order_by(ProductRecommendation.score.desc())
            .limit(self.top_n)
            .all()
        )
        return [
            {
                "product_id": str(r.recommended_product_id),
                "name": r.recommended_product.name,
                "price": r.recommended_product.current_price,
                "score": r.score,
            }
            for r in recs
        ]


recommender = RecommendationEngine()
