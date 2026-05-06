import uuid
from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"
    seller = "seller"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.customer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # ML features — updated by background jobs
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    avg_order_value = Column(Float, default=0.0)
    days_since_last_order = Column(Integer, nullable=True)
    churn_risk_score = Column(Float, default=0.0)  # 0.0 (loyal) to 1.0 (churning)

    # Relationships
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    events = relationship("UserEvent", back_populates="user")
    reviews = relationship("Review", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"


class Address(Base, TimestampMixin):
    __tablename__ = "addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(50), default="Home")   # Home, Work, Other
    street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="addresses")
