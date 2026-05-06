from pydantic import BaseModel
from typing import Optional
import uuid


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


class VariantOut(BaseModel):
    id: uuid.UUID
    sku: str
    size: Optional[str]
    color: Optional[str]
    stock_available: int
    price_modifier: float
    is_low_stock: bool

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    brand: Optional[str]
    current_price: float
    base_price: float
    discount_pct: float
    avg_rating: float
    review_count: int
    tags: list[str]
    image_urls: list[str]

    class Config:
        from_attributes = True


class ProductDetail(ProductOut):
    description: Optional[str]
    views_last_24h: int
    add_to_cart_rate: float
    conversion_rate: float
    variants: list[VariantOut]
    category: Optional[CategoryOut]

    class Config:
        from_attributes = True
