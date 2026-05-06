"""
Generate products.json and categories.json from data.csv
for the ShopAI frontend — rich product catalog with categories,
ratings, variants, prices, descriptions, tags.
"""
import csv, collections, json, re, os, hashlib, random

SRC  = r'd:\Intern\MiniProject\ecommerce\data\data.csv'
DEST = r'd:\Intern\MiniProject\ecommerce\ecommerce-frontend\src\data'

random.seed(42)

# ── Category keyword map ─────────────────────────────────────────────────────
CAT_RULES = [
    ('Christmas & Seasonal', ['christmas','xmas','santa','reindeer','snowflake','advent','angel','star','wreath','holly','noel']),
    ('Home Decor',  ['heart','vintage','shabby','lantern','light','candle','holder','frame','picture','mirror','clock','vase','floral','flower','rose']),
    ('Kitchen & Dining', ['kitchen','mug','cup','plate','bowl','tin','jar','storage','cake','tea','coffee','baking','spoon','fork','lunch','pantry']),
    ('Bags & Accessories', ['bag','tote','purse','pouch','wallet','case','suitcase','clutch']),
    ('Stationery',  ['pen','pencil','notebook','notepad','journal','pad','book','diary','letter','envelope','card','sticker','stamps']),
    ('Toys & Games', ['toy','game','doll','puppet','bear','rabbit','animal','children','kids','baby','play','puzzle']),
    ('Garden & Outdoor', ['garden','pot','plant','seed','outdoor','patio','fence','bird','bee']),
    ('Clothing & Accessories', ['scarf','gloves','hat','apron','dress','skirt','shirt','jumper','coat','sock','slippers']),
    ('Gift & Novelty', ['gift','bunting','banner','balloon','party','celebration','birthday','wedding','love','friend','metal','sign','hanging','charm','vintage']),
    ('Storage & Organisation', ['storage','box','basket','crate','bin','shelf','rack','organis','tray','chest','trunk']),
]

def categorise(desc):
    d = desc.lower()
    for cat, kw in CAT_RULES:
        if any(k in d for k in kw):
            return cat
    return 'General'

def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def fake_description(name, cat):
    templates = {
        'Christmas & Seasonal': f"Celebrate the season with our {name.title()}. A beautiful festive piece perfect for holiday decorating and gifting.",
        'Home Decor':   f"Add charm to your living space with the {name.title()}. A stylish accent piece that brings warmth and character to any room.",
        'Kitchen & Dining': f"Elevate your kitchen with the {name.title()}. Practical, stylish, and perfect for everyday use.",
        'Bags & Accessories': f"The {name.title()} is your perfect carry companion — spacious, durable, and beautifully crafted.",
        'Stationery':   f"Write, plan, and create with our {name.title()}. Premium quality stationery for work and home.",
        'Toys & Games': f"Delight young ones with the {name.title()} — a fun, safe, and imaginative toy for children of all ages.",
        'Garden & Outdoor': f"Bring life to your garden with the {name.title()}. Weather-resistant and beautifully designed for outdoor spaces.",
        'Clothing & Accessories': f"Stay stylish with our {name.title()}. Soft, comfortable, and made to last every season.",
        'Gift & Novelty': f"The perfect gift! Our {name.title()} makes a unique and thoughtful present for any occasion.",
        'Storage & Organisation': f"Keep your space tidy with our {name.title()}. Smart, practical storage that looks great too.",
    }
    return templates.get(cat, f"Premium quality {name.title()}. A popular bestseller loved by customers worldwide.")

# ── Read CSV ─────────────────────────────────────────────────────────────────
rows = []
with open(SRC, encoding='latin-1') as f:
    for r in csv.DictReader(f):
        try:
            qty   = float(r['Quantity'])
            price = float(r['UnitPrice'])
            if qty > 0 and price > 0 and r['StockCode'].strip() and r['Description'].strip():
                rows.append(r)
        except: pass

print(f'Valid rows: {len(rows)}')

# ── Aggregate by StockCode ────────────────────────────────────────────────────
products_raw = collections.defaultdict(lambda: {
    'descriptions': collections.Counter(),
    'prices': [],
    'qty_total': 0,
    'invoice_count': 0,
    'invoices': set(),
})

for r in rows:
    sku = r['StockCode'].strip()
    products_raw[sku]['descriptions'][r['Description'].strip()] += 1
    products_raw[sku]['prices'].append(float(r['UnitPrice']))
    products_raw[sku]['qty_total'] += float(r['Quantity'])
    products_raw[sku]['invoices'].add(r['InvoiceNo'])

# ── Build final product list ──────────────────────────────────────────────────
BRANDS = ['ArtiCraft', 'HomeTouch', 'NovaBright', 'CraftWorks', 'Elegance Co.', 
          'GreenLeaf', 'Whimsy & Co.', 'Heritage Crafts', 'The Vintage Shop', 'Bloom & Co.']

COLORS = ['White', 'Red', 'Blue', 'Green', 'Pink', 'Black', 'Natural', 'Gold', 'Silver']
SIZES  = ['Small', 'Medium', 'Large', 'One Size']

products_out  = []
categories_set = collections.Counter()

# Sort by invoice count (popularity) — take top 300
sorted_skus = sorted(products_raw.items(), key=lambda x: len(x[1]['invoices']), reverse=True)

for sku, data in sorted_skus[:350]:
    # Skip weird SKUs (non-alphanumeric, too short, postage etc)
    if not re.match(r'^[A-Za-z0-9]{4,}', sku):
        continue
    name = data['descriptions'].most_common(1)[0][0]
    if any(bad in name.upper() for bad in ['POSTAGE','MANUAL','DOTCOM','AMAZON','CRUK','BANK CHARGES','ADJUST']):
        continue
    if len(name) < 5:
        continue

    prices     = data['prices']
    base_price = round(sorted(prices)[len(prices)//2], 2)   # median
    if base_price <= 0:
        continue

    invoice_count = len(data['invoices'])
    cat   = categorise(name)
    categories_set[cat] += 1

    # Make a slightly higher "original" price for discount display
    discount = random.choice([0, 0, 5, 10, 15, 20])
    orig = round(base_price / (1 - discount/100), 2) if discount > 0 else base_price

    # Rating based on popularity (more orders → higher rating, with noise)
    base_rating = min(5.0, 3.0 + (invoice_count / 300) * 2.0)
    avg_rating  = round(base_rating + random.uniform(-0.3, 0.3), 1)
    avg_rating  = max(2.5, min(5.0, avg_rating))
    review_count = max(5, invoice_count + random.randint(-10, 30))

    # Generate 1-3 variants
    n_variants = random.choice([1, 1, 2, 3])
    variants = []
    for i in range(n_variants):
        if n_variants == 1:
            color, size = None, None
            modifier    = 0.0
            v_sku       = sku
        else:
            color    = random.choice(COLORS)
            size     = random.choice(SIZES) if random.random() > 0.5 else None
            modifier = round(random.choice([-0.5, 0, 0, 0.5, 1.0, 2.0]), 2)
            v_sku    = f"{sku}-{i+1}"
        stock = random.randint(0, 150)
        variants.append({
            'id':              v_sku,
            'sku':             v_sku,
            'color':           color,
            'size':            size,
            'stock_available': stock,
            'restock_threshold': 10,
            'price_modifier':  modifier,
            'is_low_stock':    stock <= 10,
        })

    # Tags from description words
    tags = [w.lower() for w in re.findall(r'[A-Z][A-Z]+', name) if len(w) > 2][:5]

    # Assign a deterministic brand
    brand_idx = int(hashlib.md5(sku.encode()).hexdigest(), 16) % len(BRANDS)

    # views_last_24h proxy: popular products = more views
    views = max(1, int(invoice_count * random.uniform(0.5, 2.0)))

    pid = sku  # use StockCode as ID

    products_out.append({
        'id':              pid,
        'sku':             sku,
        'name':            name.title(),
        'slug':            slug(name),
        'description':     fake_description(name, cat),
        'brand':           BRANDS[brand_idx],
        'category':        cat,
        'category_id':     slug(cat),
        'current_price':   base_price,
        'base_price':      base_price,
        'original_price':  orig,
        'min_price':       round(base_price * 0.8, 2),
        'max_price':       round(base_price * 1.5, 2),
        'discount_pct':    discount,
        'avg_rating':      avg_rating,
        'review_count':    review_count,
        'views_last_24h':  views,
        'add_to_cart_rate': round(random.uniform(0.05, 0.35), 3),
        'conversion_rate': round(random.uniform(0.02, 0.15), 3),
        'tags':            tags,
        'image_urls':      [],
        'is_active':       True,
        'variants':        variants,
    })

print(f'Products generated: {len(products_out)}')
print(f'Categories: {dict(categories_set)}')

# ── Categories list ───────────────────────────────────────────────────────────
categories_out = [
    {'id': slug(cat), 'name': cat, 'slug': slug(cat), 'count': cnt}
    for cat, cnt in sorted(categories_set.items(), key=lambda x: -x[1])
]

# ── Write files ───────────────────────────────────────────────────────────────
os.makedirs(DEST, exist_ok=True)

with open(os.path.join(DEST, 'products.json'), 'w') as f:
    json.dump(products_out, f, indent=2)
print('Written products.json —', len(products_out), 'products')

with open(os.path.join(DEST, 'categories.json'), 'w') as f:
    json.dump(categories_out, f, indent=2)
print('Written categories.json —', len(categories_out), 'categories')

# Preview
for p in products_out[:3]:
    print(f"  {p['id']} | {p['name'][:40]} | £{p['current_price']} | {p['category']} | {len(p['variants'])} variants")
