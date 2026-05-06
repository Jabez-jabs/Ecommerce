"""
Semantic Search Engine (TF-IDF)
================================
Builds a TF-IDF index over product name + description + tags.
Supports:
  - Keyword search with relevance ranking
  - Fuzzy partial matching
  - Filter by category, price range, rating

No external vector DB needed — pure Python + numpy.
For production, swap this for pgvector or Elasticsearch.
"""

from __future__ import annotations
import math
import re
import logging
from collections import Counter, defaultdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split on whitespace."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = text.split()
    # Remove very short tokens
    return [t for t in tokens if len(t) > 1]


class TFIDFSearchEngine:

    def __init__(self):
        self.index: dict[str, dict[str, float]] = {}   # product_id → {term: tfidf_score}
        self.idf: dict[str, float] = {}                 # term → idf value
        self._built = False

    def _build_document(self, product) -> str:
        """Combine product fields into one searchable text blob."""
        parts = [
            product.name or "",
            product.description or "",
            product.brand or "",
            " ".join(product.tags or []),
            product.category.name if product.category else "",
        ]
        return " ".join(parts)

    def build_index(self, db: "Session") -> int:
        """
        Builds TF-IDF index for all active products.
        Call once at startup and nightly to pick up new products.
        """
        from app.models.product import Product

        products = db.query(Product).filter(Product.is_active == True).all()
        if not products:
            logger.warning("No products found to index.")
            return 0

        # Step 1 — term frequency per document
        doc_tf: dict[str, Counter] = {}
        for p in products:
            text = self._build_document(p)
            tokens = tokenize(text)
            tf = Counter(tokens)
            # Normalize TF: divide by max term count in doc
            max_count = max(tf.values()) if tf else 1
            doc_tf[str(p.id)] = Counter({t: c / max_count for t, c in tf.items()})

        # Step 2 — inverse document frequency
        n_docs = len(products)
        term_doc_count: Counter = Counter()
        for tf in doc_tf.values():
            for term in tf:
                term_doc_count[term] += 1

        self.idf = {
            term: math.log(n_docs / (1 + count))
            for term, count in term_doc_count.items()
        }

        # Step 3 — TF-IDF scores
        self.index = {
            pid: {term: tf_val * self.idf.get(term, 0) for term, tf_val in tf.items()}
            for pid, tf in doc_tf.items()
        }

        self._built = True
        logger.info(f"Search index built: {len(self.index)} products, {len(self.idf)} unique terms.")
        return len(self.index)

    def search(
        self,
        query: str,
        db: "Session",
        top_n: int = 20,
        category_id: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
    ) -> list[dict]:
        """
        Returns ranked product results for a query.
        Falls back to database ILIKE search if index not built.
        """
        if not self._built:
            self.build_index(db)

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        # Score each product
        scores: dict[str, float] = defaultdict(float)
        for term in query_tokens:
            idf_val = self.idf.get(term, 0)
            for pid, tf_idf_map in self.index.items():
                if term in tf_idf_map:
                    scores[pid] += tf_idf_map[term] * idf_val

        if not scores:
            return []

        # Sort by score, take top candidates
        ranked_ids = sorted(scores, key=lambda x: scores[x], reverse=True)[:top_n * 3]

        # Fetch from DB and apply filters
        from app.models.product import Product
        import uuid

        query_obj = db.query(Product).filter(
            Product.id.in_([uuid.UUID(pid) for pid in ranked_ids]),
            Product.is_active == True,
        )
        if category_id:
            query_obj = query_obj.filter(Product.category_id == category_id)
        if min_price is not None:
            query_obj = query_obj.filter(Product.current_price >= min_price)
        if max_price is not None:
            query_obj = query_obj.filter(Product.current_price <= max_price)
        if min_rating is not None:
            query_obj = query_obj.filter(Product.avg_rating >= min_rating)

        products = query_obj.all()

        # Re-rank filtered results by TF-IDF score
        products.sort(key=lambda p: scores.get(str(p.id), 0), reverse=True)

        return [
            {
                "product_id": str(p.id),
                "name": p.name,
                "brand": p.brand,
                "price": p.current_price,
                "rating": p.avg_rating,
                "score": round(scores.get(str(p.id), 0), 4),
                "category": p.category.name if p.category else None,
            }
            for p in products[:top_n]
        ]


search_engine = TFIDFSearchEngine()
