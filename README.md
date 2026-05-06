# E-Commerce AI Product System
### Stack: FastAPI + PostgreSQL + SQLAlchemy + scikit-learn

A full-stack intelligent e-commerce backend with semantic search,
AI-powered recommendations, dynamic pricing, and an analytics dashboard.

---

## Project Structure

```
ecommerce/
├── main.py                        # FastAPI app entry point
├── scheduler.py                   # Background ML job scheduler
├── requirements.txt
├── alembic.ini
├── .env.example
│
├── app/
│   ├── models/
│   │   ├── base.py                # SQLAlchemy Base + TimestampMixin
│   │   ├── user.py                # User, Address
│   │   ├── product.py             # Category, Product, Variant, Review, PriceHistory
│   │   ├── order.py               # Cart, CartItem, Coupon, Order, OrderItem
│   │   └── events.py              # UserEvent, Recommendations, SearchLog
│   ├── api/
│   │   ├── products.py            # Listing, semantic search, recommendations
│   │   ├── orders.py              # Cart, checkout, order lifecycle
│   │   ├── users.py               # Register, login (JWT), churn score
│   │   └── analytics.py          # Revenue, funnel, churn risk, inventory
│   ├── ml/
│   │   ├── search.py              # TF-IDF semantic search engine
│   │   ├── recommender.py         # Item co-occurrence + Jaccard similarity
│   │   └── pricing.py             # Dynamic pricing engine
│   ├── schemas/
│   │   └── product.py             # Pydantic response schemas
│   └── core/
│       ├── config.py              # Settings (pydantic-settings + .env)
│       └── database.py            # SQLAlchemy engine + session
│
├── alembic/env.py                 # Alembic migration environment
├── scripts/seed.py                # Seed data generator
└── sql/schema.sql                 # Raw PostgreSQL schema
```

---

## Quick Start

```bash
# 1. Install
pip install -r requirements.txt

# 2. Configure
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY

# 3. Create DB and seed
createdb ecommerce_db
python scripts/seed.py        # 300 products, 200 users, 800 orders, 5000 events

# 4. Run
python main.py
# Swagger docs → http://localhost:8000/docs
```

---

## Key API Endpoints

| Feature | Endpoint |
|---------|----------|
| Semantic search | `GET /api/products/search?q=running+shoes` |
| AI recommendations | `GET /api/products/{id}/recommendations` |
| Add to cart | `POST /api/orders/cart/add` |
| Checkout | `POST /api/orders/checkout` |
| Analytics dashboard | `GET /api/analytics/summary` |
| Churn risk users | `GET /api/analytics/churn-risk` |
| Low stock alert | `GET /api/products/admin/low-stock` |
| Dynamic pricing run | Auto — runs every hour via scheduler |

---

## Innovative Features

1. **Semantic Search** — TF-IDF over name+description+tags. Finds "cheap red shoes for monsoon" correctly.
2. **Recommendations** — Jaccard co-occurrence from purchase history. "Users who bought X also bought Y."
3. **Dynamic Pricing** — Price adjusts automatically based on views/24h, cart rate, stock level.
4. **Churn Scoring** — Every user gets a 0–1 churn risk score. High-risk users flagged for campaigns.
5. **Full Analytics** — Revenue by day, conversion funnel, top products, inventory health.

---

## Tech Stack

FastAPI 0.111 · SQLAlchemy 2.0 · PostgreSQL 14+ · JWT Auth · numpy/scikit-learn · Alembic · APScheduler · Faker
