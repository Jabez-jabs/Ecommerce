import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class Cart(Base, TimestampMixin):
    __tablename__ = "carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)  # for guest carts
    coupon_code = Column(String(50), nullable=True)
    discount_amount = Column(Float, default=0.0)

    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")
    user = relationship("User")

    @property
    def subtotal(self):
        return sum(item.quantity * item.unit_price for item in self.items)

    @property
    def total(self):
        return max(0, self.subtotal - self.discount_amount)


class CartItem(Base, TimestampMixin):
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)   # snapshot of price at add-to-cart time

    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant")


class Coupon(Base, TimestampMixin):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    discount_type = Column(String(20), default="percent")   # "percent" | "flat"
    discount_value = Column(Float, nullable=False)
    min_order_value = Column(Float, default=0.0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    from sqlalchemy import Boolean, DateTime
    expires_at = Column(DateTime(timezone=True), nullable=True)


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    address_id = Column(UUID(as_uuid=True), ForeignKey("addresses.id"), nullable=True)

    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False, index=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    payment_method = Column(String(50), nullable=True)   # "upi", "card", "cod", "wallet"

    subtotal = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0)
    shipping_charge = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)

    coupon_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Snapshot of shipping address (so address changes don't affect past orders)
    shipping_address_snapshot = Column(JSONB, default=dict)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.id} status={self.status} total=₹{self.total}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=True)

    # Snapshot fields — preserve exactly what was ordered at purchase time
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    variant_label = Column(String(100), nullable=True)   # e.g. "Red / XL"
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Float, nullable=False)           # unit_price * quantity

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant")
