"""
Seed Script
===========
Generates realistic Indian e-commerce data:
  - 10 categories
  - 300 products with variants
  - 200 users
  - 5,000 behavior events
  - 800 orders with items

Run:  python scripts/seed.py
Requires a live PostgreSQL connection (set DATABASE_URL in .env)
"""
DATABASE_URL = "postgresql://postgres:password@localhost:5432/ecommerce_db"
import sys
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, Boolean

from app.models.base import Base
from app.models.user import User, Address, UserRole
from app.models.product import Category, Product, ProductVariant, Review, PriceHistory
from app.models.order import Cart, CartItem, Order, OrderItem, OrderStatus, PaymentStatus
from app.models.events import UserEvent, EventType, SearchLog

fake = Faker("en_IN")
random.seed(42)

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ecommerce_db")
engine = create_engine(DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)

# ── Catalog data ──────────────────────────────────────────────────────────────
CATEGORIES = [
    {"name": "Footwear",      "slug": "footwear"},
    {"name": "Men's Clothing","slug": "mens-clothing"},
    {"name": "Women's Clothing","slug": "womens-clothing"},
    {"name": "Electronics",   "slug": "electronics"},
    {"name": "Home & Kitchen","slug": "home-kitchen"},
    {"name": "Books",         "slug": "books"},
    {"name": "Sports",        "slug": "sports"},
    {"name": "Beauty",        "slug": "beauty"},
    {"name": "Toys",          "slug": "toys"},
    {"name": "Groceries",     "slug": "groceries"},
]

PRODUCTS_BY_CATEGORY = {
    "Footwear":        ["Running Shoes", "Casual Sneakers", "Formal Leather Shoes", "Sandals", "Boots",
                        "Sports Shoes", "Loafers", "Flip Flops", "Wedge Heels", "Canvas Shoes"],
    "Men's Clothing":  ["Polo T-Shirt", "Slim Fit Jeans", "Formal Shirt", "Hooded Sweatshirt",
                        "Chinos", "Track Pants", "Ethnic Kurta", "Bomber Jacket", "Cargo Shorts", "Blazer"],
    "Women's Clothing":["Saree", "Salwar Kameez", "Kurti", "Midi Dress", "Formal Blazer",
                        "Palazzo Pants", "Leggings", "Crop Top", "Maxi Skirt", "Denim Jacket"],
    "Electronics":     ["Wireless Earbuds", "Bluetooth Speaker", "Smart Watch", "Power Bank",
                        "USB-C Hub", "Mechanical Keyboard", "Gaming Mouse", "Webcam", "LED Desk Lamp", "Phone Stand"],
    "Home & Kitchen":  ["Non-stick Cookware Set", "Air Fryer", "Coffee Maker", "Water Purifier",
                        "Steel Tiffin Box", "Dinner Set", "Chopping Board Set", "Kettle", "Mixer Grinder", "Pillow Set"],
    "Books":           ["Python Programming", "Data Structures", "Machine Learning Basics", "The Alchemist",
                        "Atomic Habits", "Rich Dad Poor Dad", "Wings of Fire", "Ikigai", "Deep Work", "Zero to One"],
    "Sports":          ["Yoga Mat", "Resistance Bands", "Cricket Bat", "Football", "Badminton Racket",
                        "Gym Gloves", "Skipping Rope", "Dumbbell Set", "Cycling Helmet", "Swimming Goggles"],
    "Beauty":          ["Sunscreen SPF50", "Face Serum", "Moisturizer", "Shampoo", "Conditioner",
                        "Lipstick", "Foundation", "Kajal", "Face Wash", "Hair Oil"],
    "Toys":            ["LEGO Blocks", "Remote Control Car", "Puzzle Set", "Barbie Doll", "Nerf Gun",
                        "Board Game", "Action Figure", "Stuffed Teddy", "Play-Doh Set", "Magnetic Tiles"],
    "Groceries":       ["Basmati Rice 5kg", "Toor Dal 1kg", "Cold Pressed Coconut Oil", "Green Tea",
                        "Organic Honey", "Multigrain Atta", "Almonds 500g", "Turmeric Powder", "Oats 1kg", "Ghee 500g"],
}

TAGS_BY_CATEGORY = {
    "Footwear":        ["comfortable", "durable", "waterproof", "lightweight", "sporty", "casual", "formal"],
    "Men's Clothing":  ["slim-fit", "cotton", "formal", "casual", "breathable", "summer", "winter"],
    "Women's Clothing":["ethnic", "western", "cotton", "silk", "casual", "party-wear", "office-wear"],
    "Electronics":     ["wireless", "portable", "fast-charging", "noise-cancelling", "gaming", "usb-c", "bluetooth"],
    "Home & Kitchen":  ["non-stick", "stainless-steel", "easy-clean", "energy-saving", "BPA-free", "premium"],
    "Books":           ["bestseller", "self-help", "programming", "fiction", "non-fiction", "motivational"],
    "Sports":          ["gym", "outdoor", "yoga", "cricket", "fitness", "portable", "anti-slip"],
    "Beauty":          ["organic", "paraben-free", "dermatologist-tested", "spf", "moisturizing", "vegan"],
    "Toys":            ["educational", "age-3+", "stem", "outdoor", "creative", "safe-materials"],
    "Groceries":       ["organic", "premium", "natural", "low-sugar", "high-protein", "fresh"],
}

SIZES_BY_CATEGORY = {
    "Footwear":        ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
    "Men's Clothing":  ["S", "M", "L", "XL", "XXL"],
    "Women's Clothing":["XS", "S", "M", "L", "XL"],
    "default":         [None],
}

COLORS = ["Black", "White", "Navy", "Red", "Green", "Grey", "Blue", "Brown", "Beige", "Pink"]


def rand_price(base: float) -> tuple[float, float, float, float]:
    """Returns (base, current, min, max) prices."""
    current = round(base * random.uniform(0.85, 1.15), 2)
    min_p = round(base * 0.70, 2)
    max_p = round(base * 1.25, 2)
    return base, current, min_p, max_p


BASE_PRICES = {
    "Footwear": (800, 5000), "Men's Clothing": (400, 3000), "Women's Clothing": (500, 4000),
    "Electronics": (500, 8000), "Home & Kitchen": (300, 6000), "Books": (200, 800),
    "Sports": (200, 5000), "Beauty": (100, 1500), "Toys": (200, 3000), "Groceries": (50, 500),
}


# ── Seeder functions ──────────────────────────────────────────────────────────

def seed_categories(db):
    cats = {}
    for c in CATEGORIES:
        cat = Category(id=uuid.uuid4(), name=c["name"], slug=c["slug"],
                       description=f"Shop the best {c['name'].lower()} online.")
        db.add(cat)
        cats[c["name"]] = cat
    db.flush()
    print(f"  ✓ {len(cats)} categories")
    return cats


def seed_products(db, categories: dict):
    products = []
    for cat_name, cat_obj in categories.items():
        prod_names = PRODUCTS_BY_CATEGORY.get(cat_name, [])
        tags_pool = TAGS_BY_CATEGORY.get(cat_name, [])
        price_range = BASE_PRICES.get(cat_name, (200, 2000))
        sizes = SIZES_BY_CATEGORY.get(cat_name, SIZES_BY_CATEGORY["default"])

        for pname in prod_names:
            base = round(random.uniform(*price_range), 2)
            base_p, curr_p, min_p, max_p = rand_price(base)
            slug = pname.lower().replace(" ", "-") + "-" + fake.lexify("????")
            tags = random.sample(tags_pool, k=min(4, len(tags_pool)))

            product = Product(
                id=uuid.uuid4(),
                category_id=cat_obj.id,
                name=f"{random.choice(['Premium', 'Classic', 'Pro', 'Ultra', ''])} {pname}".strip(),
                slug=slug,
                description=fake.paragraph(nb_sentences=4),
                brand=fake.company().split()[0],
                tags=tags,
                image_urls=[f"https://images.example.com/{slug}-{i}.jpg" for i in range(1, 4)],
                base_price=base_p,
                current_price=curr_p,
                min_price=min_p,
                max_price=max_p,
                discount_pct=round(random.choice([0, 0, 0, 5, 10, 15, 20]), 1),
                views_last_24h=random.randint(0, 500),
                add_to_cart_rate=round(random.uniform(0, 0.25), 3),
                conversion_rate=round(random.uniform(0, 0.12), 3),
                avg_rating=round(random.uniform(3.0, 5.0), 1),
                review_count=random.randint(0, 500),
            )
            db.add(product)
            products.append(product)

            # Variants
            colors = random.sample(COLORS, k=random.randint(2, 4))
            for size in sizes:
                for color in colors:
                    sku = f"{slug[:8].upper()}-{(size or 'OS')[:2].upper()}-{color[:3].upper()}-{fake.lexify('???').upper()}"
                    variant = ProductVariant(
                        id=uuid.uuid4(),
                        product_id=product.id,
                        sku=sku,
                        size=size,
                        color=color,
                        stock_available=random.randint(0, 200),
                        stock_reserved=random.randint(0, 10),
                        restock_threshold=random.choice([5, 10, 15, 20]),
                        price_modifier=round(random.choice([0, 0, 0, 50, 100, -50]), 2),
                    )
                    db.add(variant)

    db.flush()
    print(f"  ✓ {len(products)} products with variants")
    return products


def seed_users(db, n=200):
    users = []
    for i in range(n):
        u = User(
            id=uuid.uuid4(),
            email=fake.unique.email(),
            hashed_password="$2b$12$placeholder_hashed_password",
            full_name=fake.name(),
            phone=fake.phone_number()[:15],
            role=UserRole.admin if i == 0 else UserRole.customer,
            total_orders=random.randint(0, 30),
            total_spent=round(random.uniform(0, 50000), 2),
            days_since_last_order=random.choice([None, 1, 7, 15, 30, 90, 180]),
            churn_risk_score=round(random.uniform(0, 1), 2),
        )
        db.add(u)
        users.append(u)

        addr = Address(
            id=uuid.uuid4(),
            user_id=u.id,
            label="Home",
            street=fake.street_address(),
            city=random.choice(["Chennai", "Mumbai", "Delhi", "Bangalore", "Hyderabad",
                                 "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Coimbatore"]),
            state=fake.state(),
            pincode=fake.postcode()[:6],
            is_default=True,
        )
        db.add(addr)

    db.flush()
    print(f"  ✓ {len(users)} users")
    return users


def seed_events(db, users, products, n=5000):
    event_weights = {
        EventType.view: 50, EventType.search: 20, EventType.add_to_cart: 15,
        EventType.wishlist: 8, EventType.purchase: 5, EventType.click: 2,
    }
    event_types = list(event_weights.keys())
    weights = list(event_weights.values())

    base_time = datetime.now(timezone.utc) - timedelta(days=90)
    events = []
    for _ in range(n):
        user = random.choice(users)
        product = random.choice(products)
        etype = random.choices(event_types, weights=weights, k=1)[0]
        event_time = base_time + timedelta(
            days=random.randint(0, 90),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )
        ev = UserEvent(
            id=uuid.uuid4(),
            user_id=user.id,
            product_id=product.id,
            event_type=etype,
            created_at=event_time,
            metadata={"source": random.choice(["search", "home", "category", "recommendation"])},
        )
        db.add(ev)

    db.flush()
    print(f"  ✓ {n} behavior events")


def seed_orders(db, users, products, n=800):
    variants_by_product = {}
    for p in products:
        if p.variants:
            variants_by_product[p.id] = p.variants

    orders_created = 0
    statuses = list(OrderStatus)
    status_weights = [5, 10, 10, 15, 50, 8, 2]

    for _ in range(n):
        user = random.choice(users)
        n_items = random.randint(1, 5)
        chosen_products = random.sample(products, k=min(n_items, len(products)))

        order_items_data = []
        subtotal = 0.0
        for p in chosen_products:
            variants = variants_by_product.get(p.id, [])
            if not variants:
                continue
            variant = random.choice(variants)
            qty = random.randint(1, 3)
            unit_price = round(p.current_price + variant.price_modifier, 2)
            line_total = round(unit_price * qty, 2)
            subtotal += line_total
            order_items_data.append({
                "variant": variant, "product_name": p.name,
                "sku": variant.sku, "unit_price": unit_price,
                "quantity": qty, "line_total": line_total,
                "variant_label": f"{variant.color or ''} / {variant.size or 'OS'}".strip(" /"),
            })

        if not order_items_data:
            continue

        subtotal = round(subtotal, 2)
        discount = round(subtotal * random.choice([0, 0, 0, 0.05, 0.10, 0.15]), 2)
        shipping = 0.0 if subtotal > 500 else 49.0
        tax = round((subtotal - discount) * 0.18, 2)
        total = round(subtotal - discount + shipping + tax, 2)

        status = random.choices(statuses, weights=status_weights, k=1)[0]
        order = Order(
            id=uuid.uuid4(),
            user_id=user.id,
            status=status,
            payment_status=PaymentStatus.paid if status != OrderStatus.pending else PaymentStatus.pending,
            payment_method=random.choice(["upi", "card", "cod", "wallet"]),
            subtotal=subtotal,
            discount_amount=discount,
            shipping_charge=shipping,
            tax_amount=tax,
            total=total,
        )
        db.add(order)

        for item_data in order_items_data:
            oi = OrderItem(
                id=uuid.uuid4(),
                order_id=order.id,
                variant_id=item_data["variant"].id,
                product_name=item_data["product_name"],
                sku=item_data["sku"],
                variant_label=item_data["variant_label"],
                unit_price=item_data["unit_price"],
                quantity=item_data["quantity"],
                line_total=item_data["line_total"],
            )
            db.add(oi)

        orders_created += 1

    db.flush()
    print(f"  ✓ {orders_created} orders with items")


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    print("\n🌱 Seeding e-commerce database...")
    Base.metadata.create_all(engine)

    with Session() as db:
        print("\n[1/5] Categories")
        categories = seed_categories(db)

        print("[2/5] Products + Variants")
        products = seed_products(db, categories)

        print("[3/5] Users + Addresses")
        users = seed_users(db)

        print("[4/5] Behavior Events")
        seed_events(db, users, products)

        print("[5/5] Orders")
        seed_orders(db, users, products)

        db.commit()

    print("\n✅ Seed complete! Database is ready.\n")
    print("  Admin user: users[0] — update email/password after seeding.")
    print("  Next step:  python main.py  (starts FastAPI on port 8000)\n")


if __name__ == "__main__":
    run()
