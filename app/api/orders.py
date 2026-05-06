from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.database import get_db
from app.models.order import Cart, CartItem, Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import ProductVariant
from app.models.user import User
from app.models.events import UserEvent, EventType

router = APIRouter()


# ── Pydantic schemas (inline for brevity) ─────────────────────────────────────

class AddToCartRequest(BaseModel):
    variant_id: str
    quantity: int = 1
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class CheckoutRequest(BaseModel):
    cart_id: str
    user_id: str
    address_id: str
    payment_method: str = "upi"
    coupon_code: Optional[str] = None


# ── Cart ──────────────────────────────────────────────────────────────────────

@router.post("/cart/add")
def add_to_cart(req: AddToCartRequest, db: Session = Depends(get_db)):
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == uuid.UUID(req.variant_id)
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    if variant.stock_available < req.quantity:
        raise HTTPException(status_code=400, detail=f"Only {variant.stock_available} units available")

    # Find or create cart
    cart = None
    if req.user_id:
        cart = db.query(Cart).filter(Cart.user_id == uuid.UUID(req.user_id)).first()
    elif req.session_id:
        cart = db.query(Cart).filter(Cart.session_id == req.session_id).first()

    if not cart:
        cart = Cart(
            id=uuid.uuid4(),
            user_id=uuid.UUID(req.user_id) if req.user_id else None,
            session_id=req.session_id,
        )
        db.add(cart)
        db.flush()

    # Check if item already in cart — update quantity
    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.variant_id == variant.id,
    ).first()

    unit_price = round(variant.product.current_price + variant.price_modifier, 2)

    if existing:
        existing.quantity += req.quantity
        existing.unit_price = unit_price   # refresh price
    else:
        item = CartItem(
            id=uuid.uuid4(),
            cart_id=cart.id,
            variant_id=variant.id,
            quantity=req.quantity,
            unit_price=unit_price,
        )
        db.add(item)

    # Log event
    event = UserEvent(
        id=uuid.uuid4(),
        user_id=uuid.UUID(req.user_id) if req.user_id else None,
        session_id=req.session_id,
        product_id=variant.product_id,
        variant_id=variant.id,
        event_type=EventType.add_to_cart,
    )
    db.add(event)
    db.commit()

    return {"cart_id": str(cart.id), "message": "Added to cart"}


@router.get("/cart/{cart_id}")
def get_cart(cart_id: str, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.id == uuid.UUID(cart_id)).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = []
    for item in cart.items:
        v = item.variant
        items.append({
            "cart_item_id": str(item.id),
            "sku": v.sku,
            "product_name": v.product.name,
            "variant": f"{v.color or ''} / {v.size or 'One Size'}".strip(" /"),
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "line_total": round(item.quantity * item.unit_price, 2),
            "stock_available": v.stock_available,
        })

    return {
        "cart_id": str(cart.id),
        "items": items,
        "subtotal": round(cart.subtotal, 2),
        "discount": round(cart.discount_amount, 2),
        "total": round(cart.total, 2),
        "item_count": len(items),
    }


@router.delete("/cart/{cart_id}/item/{item_id}")
def remove_cart_item(cart_id: str, item_id: str, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(
        CartItem.id == uuid.UUID(item_id),
        CartItem.cart_id == uuid.UUID(cart_id),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item removed"}


# ── Checkout ──────────────────────────────────────────────────────────────────

@router.post("/checkout")
def checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.id == uuid.UUID(req.cart_id)).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty or not found")

    # Reserve stock
    for item in cart.items:
        variant = item.variant
        if variant.stock_available < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"'{variant.product.name}' only has {variant.stock_available} units left",
            )
        variant.stock_available -= item.quantity
        variant.stock_reserved += item.quantity

    subtotal = round(cart.subtotal, 2)
    discount = round(cart.discount_amount, 2)
    shipping = 0.0 if subtotal > 500 else 49.0
    tax = round((subtotal - discount) * 0.18, 2)
    total = round(subtotal - discount + shipping + tax, 2)

    # Build shipping snapshot
    from app.models.user import Address
    address = db.query(Address).filter(Address.id == uuid.UUID(req.address_id)).first()
    address_snapshot = {}
    if address:
        address_snapshot = {
            "street": address.street, "city": address.city,
            "state": address.state, "pincode": address.pincode,
        }

    order = Order(
        id=uuid.uuid4(),
        user_id=uuid.UUID(req.user_id),
        address_id=uuid.UUID(req.address_id),
        status=OrderStatus.confirmed,
        payment_status=PaymentStatus.paid,
        payment_method=req.payment_method,
        subtotal=subtotal,
        discount_amount=discount,
        shipping_charge=shipping,
        tax_amount=tax,
        total=total,
        coupon_code=req.coupon_code,
        shipping_address_snapshot=address_snapshot,
    )
    db.add(order)
    db.flush()

    for item in cart.items:
        v = item.variant
        oi = OrderItem(
            id=uuid.uuid4(),
            order_id=order.id,
            variant_id=v.id,
            product_name=v.product.name,
            sku=v.sku,
            variant_label=f"{v.color or ''} / {v.size or 'OS'}".strip(" /"),
            unit_price=item.unit_price,
            quantity=item.quantity,
            line_total=round(item.unit_price * item.quantity, 2),
        )
        db.add(oi)

        # Log purchase event
        db.add(UserEvent(
            id=uuid.uuid4(),
            user_id=uuid.UUID(req.user_id),
            product_id=v.product_id,
            variant_id=v.id,
            event_type=EventType.purchase,
            metadata={"order_id": str(order.id)},
        ))

    # Clear cart
    for item in cart.items:
        db.delete(item)

    # Update user stats
    user = db.query(User).filter(User.id == uuid.UUID(req.user_id)).first()
    if user:
        user.total_orders += 1
        user.total_spent = round(user.total_spent + total, 2)
        user.avg_order_value = round(user.total_spent / user.total_orders, 2)
        user.days_since_last_order = 0

    db.commit()

    return {
        "order_id": str(order.id),
        "status": order.status,
        "total": total,
        "shipping": shipping,
        "tax": tax,
        "message": "Order placed successfully!",
    }


# ── Order history ─────────────────────────────────────────────────────────────

@router.get("/user/{user_id}")
def user_orders(user_id: str, db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .filter(Order.user_id == uuid.UUID(user_id))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        {
            "order_id": str(o.id),
            "status": o.status,
            "total": o.total,
            "items": len(o.items),
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]


@router.get("/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "order_id": str(order.id),
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "subtotal": order.subtotal,
        "discount": order.discount_amount,
        "shipping": order.shipping_charge,
        "tax": order.tax_amount,
        "total": order.total,
        "shipping_address": order.shipping_address_snapshot,
        "items": [
            {
                "product_name": i.product_name,
                "sku": i.sku,
                "variant": i.variant_label,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "line_total": i.line_total,
            }
            for i in order.items
        ],
        "created_at": order.created_at.isoformat(),
    }


# ── Admin: update order status ─────────────────────────────────────────────────

@router.patch("/{order_id}/status")
def update_order_status(
    order_id: str,
    status: OrderStatus,
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = status

    # Release reserved stock on cancellation
    if status == OrderStatus.cancelled:
        for item in order.items:
            if item.variant:
                item.variant.stock_available += item.quantity
                item.variant.stock_reserved = max(0, item.variant.stock_reserved - item.quantity)

    db.commit()
    return {"order_id": order_id, "old_status": old_status, "new_status": status}
