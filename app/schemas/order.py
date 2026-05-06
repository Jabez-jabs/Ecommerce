from pydantic import BaseModel
from typing import Optional
from enum import Enum
import uuid


class OrderStatusEnum(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class CartItemOut(BaseModel):
    cart_item_id: str
    sku: str
    product_name: str
    variant: str
    quantity: int
    unit_price: float
    line_total: float
    stock_available: int


class CartOut(BaseModel):
    cart_id: str
    items: list[CartItemOut]
    subtotal: float
    discount: float
    total: float
    item_count: int


class OrderItemOut(BaseModel):
    product_name: str
    sku: str
    variant: Optional[str]
    quantity: int
    unit_price: float
    line_total: float


class OrderOut(BaseModel):
    order_id: str
    status: OrderStatusEnum
    payment_status: str
    payment_method: Optional[str]
    subtotal: float
    discount: float
    shipping: float
    tax: float
    total: float
    shipping_address: dict
    items: list[OrderItemOut]
    created_at: str


class OrderSummary(BaseModel):
    order_id: str
    status: OrderStatusEnum
    total: float
    items: int
    created_at: str
