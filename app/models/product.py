import uuid
from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    ForeignKey, Text, ARRAY, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)

    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    brand = Column(String(100), nullable=True, index=True)
    tags = Column(ARRAY(String), default=list)        # e.g. ["waterproof", "running", "casual"]
    image_urls = Column(ARRAY(String), default=list)
    is_active = Column(Boolean, default=True)

    # Pricing — base price + dynamic engine fields
    base_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)     # updated by dynamic pricing engine
    min_price = Column(Float, nullable=False)         # floor — never go below this
    max_price = Column(Float, nullable=False)         # ceiling — never go above this
    discount_pct = Column(Float, default=0.0)         # current active discount %

    # Demand signals — updated by background jobs every hour
    views_last_24h = Column(Integer, default=0)
    add_to_cart_rate = Column(Float, default=0.0)     # cart_adds / views
    conversion_rate = Column(Float, default=0.0)      # purchases / views
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    # Search vector — TF-IDF precomputed (stored as JSON dict: {term: weight})
    search_vector = Column(JSONB, default=dict)

    # Relationships
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product")
    price_history = relationship("PriceHistory", back_populates="product")

    def __repr__(self):
        return f"<Product {self.name} ₹{self.current_price}>"


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    sku = Column(String(100), unique=True, nullable=False, index=True)
    size = Column(String(50), nullable=True)
    color = Column(String(50), nullable=True)
    material = Column(String(100), nullable=True)
    extra_attributes = Column(JSONB, default=dict)   # flexible: {"wattage": "60W"} etc.

    # Inventory
    stock_available = Column(Integer, default=0, nullable=False)
    stock_reserved = Column(Integer, default=0)      # held in active carts/orders
    restock_threshold = Column(Integer, default=10)  # trigger alert below this
    price_modifier = Column(Float, default=0.0)      # added to product.current_price

    product = relationship("Product", back_populates="variants")

    @property
    def final_price(self):
        return self.product.current_price + self.price_modifier

    @property
    def is_low_stock(self):
        return self.stock_available <= self.restock_threshold

    def __repr__(self):
        return f"<Variant {self.sku} stock={self.stock_available}>"


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)          # 1–5
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    verified_purchase = Column(Boolean, default=False)
    helpful_votes = Column(Integer, default=0)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class PriceHistory(Base):
    """Tracks every price change with reason — powers pricing analytics."""
    __tablename__ = "price_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    reason = Column(String(100), nullable=True)   # "low_stock", "high_demand", "scheduled_sale"
    triggered_by = Column(String(50), default="system")  # "system" | "admin"
    from sqlalchemy import Column as C, DateTime, func
    changed_at = C(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="price_history")
