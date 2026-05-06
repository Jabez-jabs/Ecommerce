from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables
from app.api import products, users, orders, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    print(f"✅ {settings.APP_NAME} is running — visit http://localhost:8000/docs")
    yield
    print("👋 Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-powered e-commerce system — semantic search, recommendations, dynamic pricing, analytics.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,     prefix="/api/users",     tags=["Users & Auth"])
app.include_router(products.router,  prefix="/api/products",  tags=["Products & Search"])
app.include_router(orders.router,    prefix="/api/orders",    tags=["Cart & Orders"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics Dashboard"])


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "docs": "/docs",
        "endpoints": {
            "search":          "GET  /api/products/search?q=running+shoes",
            "recommendations": "GET  /api/products/{id}/recommendations",
            "add_to_cart":     "POST /api/orders/cart/add",
            "checkout":        "POST /api/orders/checkout",
            "dashboard":       "GET  /api/analytics/summary",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
