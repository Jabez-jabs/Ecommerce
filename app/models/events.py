import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Enum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin
from sqlalchemy import DateTime, func


class EventType(str, enum.Enum):
    view = "view"               # user viewed a product page
    search = "search"           # user ran a search
    add_to_cart = "add_to_cart"
    remove_from_cart = "remove_from_cart"
    wishlist = "wishlist"
    purchase = "purchase"
    review = "review"
    click = "click"             # clicked a recommendation


class UserEvent(Base):
    """
    Core behavior table — every user action is logged here.
    This feeds the recommendation engine, dynamic pricing,
    churn scoring, and funnel analytics.
    """
    __tablename__ = "user_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=True)

    event_type = Column(Enum(EventType), nullable=False, index=True)
    metadata = Column(JSONB, default=dict)   # flexible: search query, referrer, position in list, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", back_populates="events")
    product = relationship("Product")

    __table_args__ = (
        # Efficient queries: "all purchase events for product X in last 7 days"
        Index("ix_events_product_type_time", "product_id", "event_type", "created_at"),
        # Efficient queries: "all events by user Y, newest first"
        Index("ix_events_user_time", "user_id", "created_at"),
    )


class ProductRecommendation(Base):
    """
    Precomputed co-occurrence recommendations.
    Rebuilt by the ML job every night.
    source_product → [recommended_products with scores]
    """
    __tablename__ = "product_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    recommended_product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)             # co-occurrence / jaccard similarity score
    recommendation_type = Column(String(50), default="co_purchase")  # "co_purchase" | "co_view" | "similar"
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    source_product = relationship("Product", foreign_keys=[source_product_id])
    recommended_product = relationship("Product", foreign_keys=[recommended_product_id])

    __table_args__ = (
        Index("ix_rec_source_score", "source_product_id", "score"),
    )


class SearchLog(Base):
    """
    Captures every search query with what the user clicked.
    Used to improve search ranking over time.
    """
    __tablename__ = "search_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    query = Column(String(500), nullable=False, index=True)
    results_count = Column(Integer, default=0)
    clicked_product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    clicked_position = Column(Integer, nullable=True)   # rank of clicked result (1-based)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
