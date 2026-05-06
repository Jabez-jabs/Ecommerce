from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str
    full_name: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_active: bool
    total_orders: int
    total_spent: float
    avg_order_value: float
    churn_risk_score: float

    class Config:
        from_attributes = True


class AddressOut(BaseModel):
    id: uuid.UUID
    label: str
    street: str
    city: str
    state: str
    pincode: str
    is_default: bool

    class Config:
        from_attributes = True


class AddressCreate(BaseModel):
    label: str = "Home"
    street: str
    city: str
    state: str
    pincode: str
    is_default: bool = False
