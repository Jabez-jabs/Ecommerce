from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.models.events import UserEvent, EventType

router = APIRouter()


def date_n_days_ago(n: int):
    return datetime.now(timezone.utc) - timedelta(days=n)


# ── Revenue overview ──────────────────────────────────────────────────────────

@router.get("/revenue")
def revenue_overview(days: int = Query(30, le=365), db: Session = Depends(get_db)):
    since = date_n_days_ago(days)

    total = db.query(func.sum(Order.total)).filter(
        Order.created_at >= since,
        Order.status != OrderStatus.cancelled,
    ).scalar() or 0

    order_count = db.query(func.count(Order.id)).filter(
        Order.created_at >= since,
        Order.status != OrderStatus.cancelled,
    ).scalar() or 0

    avg_order = round(total / order_count, 2) if order_count else 0

    # Daily revenue for chart
    daily = (
        db.query(
            cast(Order.created_at, Date).label("date"),
            func.sum(Order.total).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(Order.created_at >= since, Order.status != OrderStatus.cancelled)
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
        .all()
    )

    return {
        "period_days": days,
        "total_revenue": round(total, 2),
        "total_orders": order_count,
        "avg_order_value": avg_order,
        "daily": [
            {"date": str(row.date), "revenue": round(row.revenue, 2), "orders": row.orders}
            for row in daily
        ],
    }


# ── Funnel analytics ──────────────────────────────────────────────────────────

@router.get("/funnel")
def conversion_funnel(days: int = Query(30), db: Session = Depends(get_db)):
    since = date_n_days_ago(days)

    views = db.query(func.count(UserEvent.id)).filter(
        UserEvent.event_type == EventType.view,
        UserEvent.created_at >= since,
    ).scalar() or 0

    add_to_carts = db.query(func.count(UserEvent.id)).filter(
        UserEvent.event_type == EventType.add_to_cart,
        UserEvent.created_at >= since,
    ).scalar() or 0

    purchases = db.query(func.count(UserEvent.id)).filter(
        UserEvent.event_type == EventType.purchase,
        UserEvent.created_at >= since,
    ).scalar() or 0

    def rate(num, denom):
        return round((num / denom) * 100, 1) if denom else 0

    return {
        "period_days": days,
        "funnel": [
            {"stage": "Product views",    "count": views,        "conversion": 100.0},
            {"stage": "Add to cart",      "count": add_to_carts, "conversion": rate(add_to_carts, views)},
            {"stage": "Purchase",         "count": purchases,    "conversion": rate(purchases, views)},
        ],
        "cart_to_purchase_rate": rate(purchases, add_to_carts),
    }


# ── Top products ──────────────────────────────────────────────────────────────

@router.get("/top-products")
def top_products(days: int = Query(30), limit: int = Query(10), db: Session = Depends(get_db)):
    since = date_n_days_ago(days)

    rows = (
        db.query(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= since, Order.status != OrderStatus.cancelled)
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "product_name": row.product_name,
            "units_sold": int(row.units_sold),
            "revenue": round(row.revenue, 2),
        }
        for row in rows
    ]


# ── Churn risk users ──────────────────────────────────────────────────────────

@router.get("/churn-risk")
def churn_risk_users(
    min_score: float = Query(0.7, ge=0, le=1),
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.churn_risk_score >= min_score, User.is_active == True)
        .order_by(User.churn_risk_score.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "user_id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "churn_score": u.churn_risk_score,
            "total_orders": u.total_orders,
            "days_since_last_order": u.days_since_last_order,
            "total_spent": u.total_spent,
            "action": "Send re-engagement coupon" if u.churn_risk_score > 0.8 else "Send reminder email",
        }
        for u in users
    ]


# ── Inventory health ──────────────────────────────────────────────────────────

@router.get("/inventory-health")
def inventory_health(db: Session = Depends(get_db)):
    from app.models.product import ProductVariant
    from sqlalchemy import case

    total = db.query(func.count(ProductVariant.id)).scalar() or 0

    out_of_stock = db.query(func.count(ProductVariant.id)).filter(
        ProductVariant.stock_available == 0
    ).scalar() or 0

    low_stock = db.query(func.count(ProductVariant.id)).filter(
        ProductVariant.stock_available > 0,
        ProductVariant.stock_available <= ProductVariant.restock_threshold,
    ).scalar() or 0

    healthy = total - out_of_stock - low_stock

    return {
        "total_skus": total,
        "healthy": healthy,
        "low_stock": low_stock,
        "out_of_stock": out_of_stock,
        "health_pct": round((healthy / total) * 100, 1) if total else 0,
    }


# ── Summary dashboard (single endpoint for frontend) ─────────────────────────

@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    since_30 = date_n_days_ago(30)
    since_7  = date_n_days_ago(7)

    revenue_30 = db.query(func.sum(Order.total)).filter(
        Order.created_at >= since_30,
        Order.status != OrderStatus.cancelled,
    ).scalar() or 0

    revenue_7 = db.query(func.sum(Order.total)).filter(
        Order.created_at >= since_7,
        Order.status != OrderStatus.cancelled,
    ).scalar() or 0

    orders_30 = db.query(func.count(Order.id)).filter(
        Order.created_at >= since_30,
    ).scalar() or 0

    new_users_30 = db.query(func.count(User.id)).filter(
        User.created_at >= since_30,
    ).scalar() or 0

    high_churn = db.query(func.count(User.id)).filter(
        User.churn_risk_score >= 0.7,
    ).scalar() or 0

    from app.models.product import ProductVariant
    low_stock_count = db.query(func.count(ProductVariant.id)).filter(
        ProductVariant.stock_available <= ProductVariant.restock_threshold,
        ProductVariant.stock_available > 0,
    ).scalar() or 0

    return {
        "revenue_last_30_days": round(revenue_30, 2),
        "revenue_last_7_days": round(revenue_7, 2),
        "orders_last_30_days": orders_30,
        "new_users_last_30_days": new_users_30,
        "high_churn_risk_users": high_churn,
        "low_stock_skus": low_stock_count,
        "week_over_week_revenue": round(
            ((revenue_7 - (revenue_30 - revenue_7) / 3) / max(1, (revenue_30 - revenue_7) / 3)) * 100, 1
        ),
    }
