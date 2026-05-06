"""
Dynamic Pricing Engine
======================
Adjusts product prices based on:
  1. Demand signals  — views in last 24h, add-to-cart rate, conversion rate
  2. Stock level     — low stock triggers scarcity premium
  3. Time of day     — peak hours get a small bump
  4. Competitor gap  — (stub) hook for external price feed

Run this as a background task every hour via APScheduler or a cron job.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class DynamicPricingEngine:

    def __init__(
        self,
        high_demand_views: int = 100,
        low_stock_units: int = 10,
        max_increase_pct: float = 0.20,
        max_decrease_pct: float = 0.30,
    ):
        self.high_demand_views = high_demand_views
        self.low_stock_units = low_stock_units
        self.max_increase_pct = max_increase_pct
        self.max_decrease_pct = max_decrease_pct

    def compute_price_multiplier(
        self,
        views_24h: int,
        add_to_cart_rate: float,
        conversion_rate: float,
        stock_available: int,
        restock_threshold: int,
    ) -> float:
        """
        Returns a multiplier (e.g. 1.10 = 10% increase, 0.90 = 10% decrease).
        Logic is intentionally simple and readable — extend it as needed.
        """
        multiplier = 1.0

        # --- Demand signal ---
        if views_24h >= self.high_demand_views:
            # High traffic: raise price slightly
            demand_boost = min(0.15, (views_24h - self.high_demand_views) / 500)
            multiplier += demand_boost

        if add_to_cart_rate > 0.15:
            # 15%+ add-to-cart rate = hot product
            multiplier += 0.05

        if conversion_rate > 0.10:
            # 10%+ conversion = very strong demand
            multiplier += 0.05

        # --- Stock scarcity ---
        if stock_available <= restock_threshold:
            scarcity_factor = 1 - (stock_available / max(restock_threshold, 1))
            multiplier += scarcity_factor * 0.10   # up to +10% when near zero stock

        # --- Low demand — discount to clear ---
        if views_24h < 10 and add_to_cart_rate < 0.02:
            multiplier -= 0.05   # nudge price down to attract clicks

        # Clamp within allowed range
        multiplier = max(1 - self.max_decrease_pct, min(1 + self.max_increase_pct, multiplier))
        return round(multiplier, 4)

    def update_product_price(self, product, db: "Session") -> bool:
        """
        Recalculates and saves the new price for one product.
        Returns True if price changed.
        """
        from app.models.product import PriceHistory

        # Use the lowest stock across all active variants as the signal
        stock = min(
            (v.stock_available for v in product.variants if v.stock_available >= 0),
            default=0,
        )
        restock = max(
            (v.restock_threshold for v in product.variants),
            default=10,
        )

        multiplier = self.compute_price_multiplier(
            views_24h=product.views_last_24h,
            add_to_cart_rate=product.add_to_cart_rate,
            conversion_rate=product.conversion_rate,
            stock_available=stock,
            restock_threshold=restock,
        )

        new_price = round(product.base_price * multiplier, 2)
        new_price = max(product.min_price, min(product.max_price, new_price))

        if new_price == product.current_price:
            return False

        # Determine human-readable reason
        if stock <= restock:
            reason = "low_stock"
        elif product.views_last_24h >= self.high_demand_views:
            reason = "high_demand"
        elif product.views_last_24h < 10:
            reason = "low_demand_discount"
        else:
            reason = "routine_adjustment"

        # Log price change
        history = PriceHistory(
            product_id=product.id,
            old_price=product.current_price,
            new_price=new_price,
            reason=reason,
        )
        db.add(history)
        product.current_price = new_price
        logger.info(f"Price updated: {product.name} ₹{history.old_price} → ₹{new_price} ({reason})")
        return True

    def run(self, db: "Session") -> dict:
        """Run pricing update across all active products. Call from scheduler."""
        from app.models.product import Product

        products = db.query(Product).filter(Product.is_active == True).all()
        updated = 0
        for product in products:
            if self.update_product_price(product, db):
                updated += 1
        db.commit()
        logger.info(f"Pricing run complete: {updated}/{len(products)} products updated.")
        return {"total": len(products), "updated": updated}


pricing_engine = DynamicPricingEngine()
