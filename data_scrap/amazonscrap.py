"""
Amazon India Product Scraper — Enhanced v2
==========================================
Scrapes multiple Amazon India category pages, extracts rich product data,
stores in MongoDB Atlas, and exports to JSON for the frontend.

Fixes in v2:
  - Wider price selectors (catches more formats incl. Sports items)
  - Multiple URL patterns per category for better coverage
  - Export no longer drops price-less items — uses category default instead
  - Polite random delays, headless Chrome anti-detection

Usage:
    python data_scrap/amazonscrap.py

Outputs:
    - MongoDB Atlas  -> amazon_scraper.products
    - JSON export    -> ecommerce-frontend/src/data/scraped_products.json
"""

import os, re, time, json, random, hashlib
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ── Config ───────────────────────────────────────────────────────────────────
MONGO_URI       = "mongodb+srv://jabs262006_db_user:Jabs_2628@cluster0.a7jjqun.mongodb.net/"
DB_NAME         = "amazon_scraper"
COLLECTION_NAME = "products"
JSON_OUT        = r"d:\Intern\MiniProject\ecommerce\ecommerce-frontend\src\data\scraped_products.json"

# Typical INR price ranges per category (used when price CSS fails)
CATEGORY_DEFAULT_PRICE = {
    "Electronics":       2999,
    "Home & Kitchen":     799,
    "Books":              299,
    "Fashion":            599,
    "Toys & Games":       499,
    "Sports & Outdoors":  999,
}

# Amazon India categories — multiple URL variants per category
CATEGORIES_TO_SCRAPE = [
    ("Electronics",
        "https://www.amazon.in/s?k=electronics+gadgets&rh=n%3A976419031"),
    ("Home & Kitchen",
        "https://www.amazon.in/s?k=home+kitchen+appliances&rh=n%3A976442031"),
    ("Books",
        "https://www.amazon.in/s?k=bestseller+books+india&rh=n%3A976389031"),
    ("Fashion",
        "https://www.amazon.in/s?k=men+clothing+india&rh=n%3A1571271031"),
    ("Toys & Games",
        "https://www.amazon.in/s?k=kids+toys+india&rh=n%3A1350380031"),
    ("Sports & Outdoors",
        "https://www.amazon.in/s?k=cricket+bat+india&rh=n%3A3401251031"),
]

HEADERS_JS = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
"""

random.seed(42)

# ── Selenium driver ───────────────────────────────────────────────────────────
def setup_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--lang=en-US")
    opts.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0.0.0 Safari/537.36")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    service = Service(ChromeDriverManager().install())
    driver  = webdriver.Chrome(service=service, options=opts)
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": HEADERS_JS})
    return driver


# ── Price parser ──────────────────────────────────────────────────────────────
def parse_price(text):
    if not text:
        return None
    text = text.replace(",", "").replace("₹", "").replace("\u20b9", "").strip()
    m = re.search(r"[\d]+\.?\d*", text)
    return float(m.group()) if m else None


def extract_price(card):
    """
    Try multiple CSS selector strategies to find price.
    Returns float or None.
    """
    selectors = [
        ".a-price .a-offscreen",          # most common
        ".a-color-price",                  # some categories
        ".a-price-whole",                  # whole number only
        "[data-a-color='price'] .a-offscreen",
        ".s-price-instructions-style .a-offscreen",
        ".a-section .a-price .a-offscreen",
    ]
    for sel in selectors:
        el = card.select_one(sel)
        if el:
            p = parse_price(el.get_text())
            if p and p > 0:
                return p
    # Last resort: scan all text for ₹NNN pattern
    text = card.get_text()
    m = re.search(r"[₹\u20b9]\s*([\d,]+)", text)
    if m:
        p = parse_price(m.group(1))
        if p and p > 0:
            return p
    return None


# ── Scrape one search-results page ────────────────────────────────────────────
def scrape_search_page(driver, url, category, page=1):
    paged_url = url + f"&page={page}"
    driver.get(paged_url)

    # Wait for results
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-component-type='s-search-result']"))
        )
    except Exception:
        print(f"  [warn] No search results found on page {page} for '{category}'")
        return []

    # Scroll to load lazy images
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.4);")
    time.sleep(1.2)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.8);")
    time.sleep(1.2)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(1.0)

    soup     = BeautifulSoup(driver.page_source, "html.parser")
    cards    = soup.select("[data-component-type='s-search-result']")
    products = []

    for card in cards:
        try:
            # Skip ad placeholders with no ASIN
            asin = card.get("data-asin", "").strip()
            if not asin or len(asin) < 5:
                continue

            # Title
            title_el = card.select_one("h2 .a-text-normal, h2 a span, .a-size-medium.a-text-normal")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            # URL
            link_el = card.select_one("h2 a")
            href    = link_el.get("href", "") if link_el else ""
            product_url = urljoin("https://www.amazon.in", href) if href else ""

            # Price — use multi-selector strategy
            price = extract_price(card)

            # Original / strikethrough price
            orig_el    = card.select_one(".a-price.a-text-price .a-offscreen")
            orig_price = parse_price(orig_el.get_text() if orig_el else None)

            # Discount label
            disc_el      = card.select_one(".a-badge-label-inner, .a-badge-text")
            disc_text    = disc_el.get_text(strip=True) if disc_el else ""
            disc_m       = re.search(r"(\d+)%", disc_text)
            discount_pct = int(disc_m.group(1)) if disc_m else (
                round((1 - price / orig_price) * 100)
                if price and orig_price and orig_price > price else 0
            )

            # Rating
            star_el = card.select_one(".a-icon-alt")
            rating  = None
            if star_el:
                m = re.search(r"([\d.]+)\s+out of 5", star_el.get_text())
                rating = float(m.group(1)) if m else None

            # Review count
            rev_el    = card.select_one(".s-underline-text, [aria-label*='ratings'], .a-size-base.s-underline-link-text")
            rev_count = None
            if rev_el:
                m = re.search(r"[\d,]+", rev_el.get_text().replace(",", ""))
                rev_count = int(m.group().replace(",", "")) if m else None

            # Image
            img_el    = card.select_one(".s-image")
            image_url = img_el.get("src", "") if img_el else ""

            # Brand
            brand_el = card.select_one(".a-size-base-plus.a-color-base, .a-size-small + .a-size-base")
            brand    = brand_el.get_text(strip=True) if brand_el else ""
            if len(brand) > 40 or "\n" in brand:
                brand = ""

            # Badge (Best Seller, Limited Deal, etc.)
            badge_el = card.select_one(".a-badge-text")
            badge    = badge_el.get_text(strip=True) if badge_el else ""

            products.append({
                "asin":          asin,
                "title":         title,
                "brand":         brand or "Amazon",
                "category":      category,
                "url":           product_url,
                "price":         price,          # may be None — handled in export
                "original_price": orig_price or price,
                "discount_pct":  discount_pct,
                "rating":        rating or round(random.uniform(3.5, 5.0), 1),
                "review_count":  rev_count or random.randint(50, 5000),
                "image_url":     image_url,
                "badge":         badge,
                "source":        "amazon_in",
            })
        except Exception:
            continue

        print(f"  [ok] Page {page}: {len(products)} products from '{category}'")
    return products


# ── MongoDB store ─────────────────────────────────────────────────────────────
def store_mongodb(products, uri):
    client     = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db         = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    ops = [
        UpdateOne({"asin": p["asin"]}, {"$set": p}, upsert=True)
        for p in products if p.get("asin")
    ]
    if ops:
        result = collection.bulk_write(ops)
        print(f"  MongoDB: {result.upserted_count} inserted, {result.modified_count} updated")
    client.close()


# ── Fetch all from MongoDB and export JSON ────────────────────────────────────
def export_to_json(uri, out_path):
    client     = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db         = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    docs       = list(collection.find({}, {"_id": 0}))
    client.close()

    frontend_products = []
    for d in docs:
        if not d.get("title"):
            continue

        # Use scraped price; fall back to category default if missing
        raw_price = d.get("price")
        if not raw_price or float(raw_price) <= 0:
            raw_price = CATEGORY_DEFAULT_PRICE.get(d.get("category", ""), 499)
            print(f"  [default price] {d['title'][:50]} -> INR {raw_price}")

        price = float(raw_price)
        orig  = float(d.get("original_price") or price * 1.2)  # generate orig if missing
        disc  = int(d.get("discount_pct") or 0)
        asin  = d["asin"]

        slug = re.sub(r"[^a-z0-9]+", "-", d["title"].lower()).strip("-")[:60]

        frontend_products.append({
            "id":             asin,
            "sku":            asin,
            "name":           d["title"],
            "slug":           slug,
            "description":    (
                f"{d['title']} — a top-rated product on Amazon India "
                f"in the {d['category']} category."
            ),
            "brand":          d.get("brand") or "Amazon",
            "category":       d["category"],
            "category_id":    re.sub(r"[^a-z0-9]+", "-", d["category"].lower()).strip("-"),
            "current_price":  round(price, 2),
            "base_price":     round(price, 2),
            "original_price": round(orig, 2),
            "min_price":      round(price * 0.85, 2),
            "max_price":      round(price * 1.25, 2),
            "discount_pct":   disc,
            "avg_rating":     float(d.get("rating") or 4.0),
            "review_count":   int(d.get("review_count") or 100),
            "views_last_24h": random.randint(20, 500),
            "add_to_cart_rate": round(random.uniform(0.05, 0.40), 3),
            "conversion_rate":  round(random.uniform(0.02, 0.18), 3),
            "tags":           [w.lower() for w in d["title"].split()[:4] if len(w) > 3],
            "image_url":      d.get("image_url", ""),
            "amazon_url":     d.get("url", ""),
            "badge":          d.get("badge", ""),
            "source":         "amazon_in",
            "is_active":      True,
            "variants": [{
                "id":              asin + "-default",
                "sku":             asin,
                "color":           None,
                "size":            None,
                "stock_available": random.randint(5, 200),
                "restock_threshold": 10,
                "price_modifier":  0.0,
                "is_low_stock":    False,
            }],
        })

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(frontend_products, f, indent=2, ensure_ascii=False)

    print(f"\n[done] Exported {len(frontend_products)} products -> {out_path}")
    return frontend_products


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  ShopAI — Amazon India Product Scraper v2")
    print("=" * 60)

    driver = setup_driver()
    all_products = []

    try:
        for cat_name, cat_url in CATEGORIES_TO_SCRAPE:
            print(f"\n>> Scraping: {cat_name}")
            cat_total = 0
            for page in range(1, 4):   # 3 pages per category ≈ 60 products/cat
                products = scrape_search_page(driver, cat_url, cat_name, page)
                if not products:
                    print(f"  [skip] No results on page {page}, moving on")
                    break
                all_products.extend(products)
                cat_total += len(products)
                time.sleep(random.uniform(2.0, 3.5))   # polite delay
            print(f"  >> {cat_name} total: {cat_total} products")

    finally:
        driver.quit()

    print(f"\n{'='*60}")
    print(f"Total scraped this run: {len(all_products)} products")

    if all_products:
        print("\n>> Storing in MongoDB Atlas...")
        try:
            store_mongodb(all_products, MONGO_URI)
        except Exception as e:
            print(f"  [warn] MongoDB store error: {e}")

        print("\n>> Exporting to frontend JSON...")
        try:
            export_to_json(MONGO_URI, JSON_OUT)
        except Exception as e:
            print(f"  [warn] MongoDB export error: {e}")
            # Fallback: export directly from in-memory scraped data
            print("  [fallback] Exporting from in-memory data...")
            frontend = []
            for d in all_products:
                slug  = re.sub(r"[^a-z0-9]+", "-", d["title"].lower()).strip("-")[:60]
                price = float(d.get("price") or CATEGORY_DEFAULT_PRICE.get(d.get("category",""), 499))
                orig  = float(d.get("original_price") or price * 1.2)
                asin  = d["asin"]
                frontend.append({
                    "id": asin, "sku": asin, "name": d["title"],
                    "slug": slug, "brand": d.get("brand") or "Amazon",
                    "category": d["category"],
                    "category_id": re.sub(r"[^a-z0-9]+", "-", d["category"].lower()).strip("-"),
                    "description": f"{d['title']} — available on Amazon India.",
                    "current_price":  round(price, 2), "base_price": round(price, 2),
                    "original_price": round(orig, 2),
                    "discount_pct":   int(d.get("discount_pct") or 0),
                    "avg_rating":  float(d.get("rating") or 4.0),
                    "review_count": int(d.get("review_count") or 100),
                    "views_last_24h": random.randint(20, 300),
                    "add_to_cart_rate": round(random.uniform(0.05, 0.35), 3),
                    "conversion_rate":  round(random.uniform(0.02, 0.15), 3),
                    "tags": [w.lower() for w in d["title"].split()[:4] if len(w) > 3],
                    "image_url": d.get("image_url", ""),
                    "amazon_url": d.get("url", ""),
                    "badge": d.get("badge", ""),
                    "source": "amazon_in", "is_active": True,
                    "variants": [{
                        "id": asin + "-default", "sku": asin,
                        "color": None, "size": None,
                        "stock_available": random.randint(5, 200),
                        "restock_threshold": 10,
                        "price_modifier": 0.0, "is_low_stock": False,
                    }],
                })
            os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
            with open(JSON_OUT, "w", encoding="utf-8") as f:
                json.dump(frontend, f, indent=2, ensure_ascii=False)
            print(f"  [fallback] Exported {len(frontend)} products -> {JSON_OUT}")
    else:
        print("No products scraped. Amazon may be blocking requests.")
        print("Trying to export existing MongoDB data...")
        try:
            export_to_json(MONGO_URI, JSON_OUT)
        except Exception as e:
            print(f"  [error] {e}")