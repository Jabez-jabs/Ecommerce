from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.core.database import get_db
from app.models.product import Product, ProductVariant, Category
from app.models.events import UserEvent, EventType, SearchLog
from app.ml.search import search_engine
from app.ml.recommender import recommender
from app.schemas.product import ProductOut, ProductDetail, CategoryOut

router = APIRouter()


# ── Categories ─────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


# ── Product listing ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[ProductOut])
def list_products(
    category_id: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("created_at", enum=["price_asc", "price_desc", "rating", "popularity", "created_at"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.is_active == True)

    if category_id:
        q = q.filter(Product.category_id == category_id)
    if brand:
        q = q.filter(Product.brand.ilike(f"%{brand}%"))
    if min_price is not None:
        q = q.filter(Product.current_price >= min_price)
    if max_price is not None:
        q = q.filter(Product.current_price <= max_price)
    if min_rating is not None:
        q = q.filter(Product.avg_rating >= min_rating)

    sort_map = {
        "price_asc":   Product.current_price.asc(),
        "price_desc":  Product.current_price.desc(),
        "rating":      Product.avg_rating.desc(),
        "popularity":  Product.views_last_24h.desc(),
        "created_at":  Product.created_at.desc(),
    }
    q = q.order_by(sort_map[sort_by])

    offset = (page - 1) * page_size
    return q.offset(offset).limit(page_size).all()


# ── Semantic search ───────────────────────────────────────────────────────────

@router.get("/search", response_model=list[dict])
def search_products(
    q: str = Query(..., min_length=1),
    category_id: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    top_n: int = Query(20, le=50),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    results = search_engine.search(
        query=q,
        db=db,
        top_n=top_n,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
    )

    # Log search
    log = SearchLog(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id) if user_id else None,
        query=q,
        results_count=len(results),
    )
    db.add(log)
    db.commit()

    return results


# ── Product detail ────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductDetail)
def get_product(
    product_id: str,
    user_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    product = db.query(Product).filter(Product.id == pid, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Log view event
    event = UserEvent(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id) if user_id else None,
        session_id=session_id,
        product_id=pid,
        event_type=EventType.view,
        metadata={"source": "product_page"},
    )
    db.add(event)
    # Increment demand signal
    product.views_last_24h += 1
    db.commit()

    return product


# ── Recommendations for a product ─────────────────────────────────────────────

@router.get("/{product_id}/recommendations")
def get_recommendations(product_id: str, db: Session = Depends(get_db)):
    return recommender.get_recommendations(product_id, db)


# ── Low stock alert list (admin) ──────────────────────────────────────────────

@router.get("/admin/low-stock")
def low_stock_products(threshold: int = Query(10), db: Session = Depends(get_db)):
    variants = (
        db.query(ProductVariant)
        .filter(ProductVariant.stock_available <= threshold)
        .order_by(ProductVariant.stock_available.asc())
        .limit(50)
        .all()
    )
    return [
        {
            "sku": v.sku,
            "product_name": v.product.name,
            "stock": v.stock_available,
            "restock_threshold": v.restock_threshold,
            "color": v.color,
            "size": v.size,
        }
        for v in variants
    ]
