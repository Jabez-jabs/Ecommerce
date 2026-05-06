"""
Pre-flight check — run this BEFORE seed.py or main.py
to verify everything is configured correctly.

Usage:
    python test_connection.py
"""

import sys

def check(label, fn):
    try:
        fn()
        print(f"  ✓  {label}")
        return True
    except Exception as e:
        print(f"  ✗  {label}")
        print(f"     → {e}")
        return False


print("\n🔍 E-Commerce AI System — Pre-flight Check\n")
results = []

# 1. Python version
def check_python():
    major, minor = sys.version_info[:2]
    assert major == 3 and minor >= 11, f"Python 3.11+ required, got {major}.{minor}"
results.append(check("Python 3.11+", check_python))

# 2. Core packages
def check_fastapi():
    import fastapi
    assert fastapi.__version__ >= "0.100"
results.append(check("FastAPI installed", check_fastapi))

def check_sqlalchemy():
    import sqlalchemy
    assert sqlalchemy.__version__ >= "2.0"
results.append(check("SQLAlchemy 2.x installed", check_sqlalchemy))

def check_pydantic():
    import pydantic
    assert pydantic.__version__ >= "2.0"
results.append(check("Pydantic v2 installed", check_pydantic))

def check_psycopg2():
    import psycopg2
results.append(check("psycopg2 installed", check_psycopg2))

def check_faker():
    import faker
results.append(check("Faker installed (for seed.py)", check_faker))

def check_jose():
    import jose
results.append(check("python-jose installed (JWT auth)", check_jose))

def check_passlib():
    import passlib
results.append(check("passlib installed (password hashing)", check_passlib))

def check_numpy():
    import numpy
results.append(check("numpy installed (ML engine)", check_numpy))

# 3. Project modules
def check_models():
    from app.models.base import Base, TimestampMixin
    from app.models.user import User, Address
    from app.models.product import Product, ProductVariant, Category
    from app.models.order import Order, OrderItem, Cart
    from app.models.events import UserEvent, ProductRecommendation
results.append(check("All SQLAlchemy models import", check_models))

def check_ml():
    from app.ml.search import search_engine
    from app.ml.recommender import recommender
    from app.ml.pricing import pricing_engine
results.append(check("All ML engines import", check_ml))

def check_api():
    from app.api import products, orders, users, analytics
results.append(check("All API routers import", check_api))

def check_config():
    from app.core.config import settings
    assert settings.DATABASE_URL, "DATABASE_URL not set in .env"
results.append(check("Config + .env loaded", check_config))

# 4. Database connection
def check_db():
    from app.core.database import engine
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
results.append(check("PostgreSQL connection", check_db))

# 5. Tables exist (after seed)
def check_tables():
    from app.core.database import engine
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    required = ["users", "products", "product_variants", "orders", "user_events"]
    missing = [t for t in required if t not in tables]
    assert not missing, f"Missing tables: {missing}. Run seed.py first."
results.append(check("DB tables exist", check_tables))

# Summary
passed = sum(results)
total = len(results)
print(f"\n{'='*45}")
print(f"  Result: {passed}/{total} checks passed")
print(f"{'='*45}")

if passed == total:
    print("\n✅ Everything looks good! You can now run:")
    print("   python scripts/seed.py   ← load sample data")
    print("   python main.py           ← start API server")
    print("   Open: http://localhost:8000/docs\n")
elif passed >= total - 2:
    print("\n⚠️  Almost there — fix the failing checks above.")
    if not results[-2]:
        print("   → Can't connect to PostgreSQL.")
        print("     Make sure PostgreSQL is running and DATABASE_URL in .env is correct.")
        print("     Quick start with Docker: docker-compose up -d db\n")
else:
    print("\n❌ Several checks failed.")
    print("   Run:  pip install -r requirements.txt\n")
