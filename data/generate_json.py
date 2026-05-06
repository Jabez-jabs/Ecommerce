"""
Generate static JSON from data.csv for the frontend.
Outputs: ecommerce-frontend/src/data/dataset.json
"""
import csv, collections, json, re
from datetime import datetime

path = r'd:\Intern\MiniProject\ecommerce\data\data.csv'
out  = r'd:\Intern\MiniProject\ecommerce\ecommerce-frontend\src\data\dataset.json'

rows = []
with open(path, encoding='latin-1') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

print(f'Loaded {len(rows)} rows')

# ── Parse each row ──────────────────────────────────────────────────────────
valid = []
for r in rows:
    try:
        qty   = float(r['Quantity'])
        price = float(r['UnitPrice'])
        if qty <= 0 or price <= 0 or not r['InvoiceDate']:
            continue
        date_str = r['InvoiceDate'].strip()
        # Normalize date: both M/D/YYYY H:MM and similar formats
        dt = None
        for fmt in ('%m/%d/%Y %H:%M', '%d/%m/%Y %H:%M', '%m/%d/%Y %H:%M:%S'):
            try:
                dt = datetime.strptime(date_str, fmt)
                break
            except:
                pass
        if dt is None:
            continue
        valid.append({
            'invoice': r['InvoiceNo'].strip(),
            'sku':     r['StockCode'].strip(),
            'desc':    r['Description'].strip(),
            'qty':     qty,
            'price':   price,
            'rev':     round(qty * price, 2),
            'date':    dt.strftime('%Y-%m-%d'),
            'month':   dt.strftime('%Y-%m'),
            'customer':r['CustomerID'].strip(),
            'country': r['Country'].strip(),
        })
    except:
        pass

print(f'Valid rows: {len(valid)}')

# ── KPIs ────────────────────────────────────────────────────────────────────
total_revenue   = sum(r['rev'] for r in valid)
total_orders    = len(set(r['invoice'] for r in valid))
total_customers = len(set(r['customer'] for r in valid if r['customer']))
total_products  = len(set(r['sku'] for r in valid))
avg_order_val   = total_revenue / total_orders if total_orders else 0

# ── Monthly revenue (for line chart) ──────────────────────────────────────
monthly = collections.defaultdict(lambda: {'revenue': 0.0, 'orders': set(), 'customers': set()})
for r in valid:
    monthly[r['month']]['revenue']   += r['rev']
    monthly[r['month']]['orders'].add(r['invoice'])
    monthly[r['month']]['customers'].add(r['customer'])

monthly_chart = sorted([
    {
        'month':     m,
        'revenue':   round(v['revenue'], 2),
        'orders':    len(v['orders']),
        'customers': len(v['customers']),
    }
    for m, v in monthly.items()
], key=lambda x: x['month'])

# ── Top products (by revenue) ─────────────────────────────────────────────
prod_stats = collections.defaultdict(lambda: {'qty': 0.0, 'revenue': 0.0, 'orders': set()})
for r in valid:
    prod_stats[r['desc']]['qty']     += r['qty']
    prod_stats[r['desc']]['revenue'] += r['rev']
    prod_stats[r['desc']]['orders'].add(r['invoice'])

top_products = sorted(
    [{'name': k, 'qty': round(v['qty']), 'revenue': round(v['revenue'], 2), 'orders': len(v['orders'])}
     for k, v in prod_stats.items() if k],
    key=lambda x: -x['revenue']
)[:15]

# ── Top countries ─────────────────────────────────────────────────────────
country_stats = collections.defaultdict(float)
for r in valid:
    country_stats[r['country']] += r['rev']

top_countries = sorted(
    [{'country': k, 'revenue': round(v, 2)} for k, v in country_stats.items()],
    key=lambda x: -x['revenue']
)[:10]

# ── Customer segments (RFM-like) ──────────────────────────────────────────
# Recency: days since last purchase; Frequency: orders; Monetary: total spend
max_date = max(r['date'] for r in valid)
max_dt   = datetime.strptime(max_date, '%Y-%m-%d')

cust_data = collections.defaultdict(lambda: {'orders': set(), 'revenue': 0.0, 'last_date': '2000-01-01'})
for r in valid:
    if not r['customer']:
        continue
    cust_data[r['customer']]['orders'].add(r['invoice'])
    cust_data[r['customer']]['revenue'] += r['rev']
    if r['date'] > cust_data[r['customer']]['last_date']:
        cust_data[r['customer']]['last_date'] = r['date']

customers_list = []
for cid, v in cust_data.items():
    last_dt  = datetime.strptime(v['last_date'], '%Y-%m-%d')
    recency  = (max_dt - last_dt).days
    freq     = len(v['orders'])
    monetary = round(v['revenue'], 2)
    # Simple segment
    if recency <= 30 and freq >= 5:
        segment = 'Champions'
    elif recency <= 90 and freq >= 3:
        segment = 'Loyal'
    elif recency <= 30:
        segment = 'Recent'
    elif recency > 180:
        segment = 'At Risk'
    else:
        segment = 'Occasional'
    customers_list.append({'id': cid, 'recency': recency, 'frequency': freq, 'monetary': monetary, 'segment': segment})

segment_counts = collections.Counter(c['segment'] for c in customers_list)
customer_segments = [{'segment': k, 'count': v} for k, v in segment_counts.items()]

# ── Quantity distribution (for demand analysis) ───────────────────────────
qty_bands = {'1-5': 0, '6-20': 0, '21-100': 0, '100+': 0}
for r in valid:
    q = r['qty']
    if q <= 5:      qty_bands['1-5'] += 1
    elif q <= 20:   qty_bands['6-20'] += 1
    elif q <= 100:  qty_bands['21-100'] += 1
    else:           qty_bands['100+'] += 1

# ── Repeat purchase rate ──────────────────────────────────────────────────
churned  = sum(1 for c in customers_list if c['recency'] > 180)
loyal    = sum(1 for c in customers_list if c['frequency'] >= 3)
churn_rate = round(churned / len(customers_list) * 100, 1) if customers_list else 0

# ── Final JSON ────────────────────────────────────────────────────────────
result = {
    'meta': {
        'source': 'UCI Online Retail Dataset',
        'total_rows': len(valid),
        'date_range': f"{monthly_chart[0]['month']} to {monthly_chart[-1]['month']}",
    },
    'kpis': {
        'total_revenue':   round(total_revenue, 2),
        'total_orders':    total_orders,
        'total_customers': total_customers,
        'total_products':  total_products,
        'avg_order_value': round(avg_order_val, 2),
        'churn_rate_pct':  churn_rate,
        'loyal_customers': loyal,
    },
    'monthly_revenue':   monthly_chart,
    'top_products':      top_products,
    'top_countries':     top_countries,
    'customer_segments': customer_segments,
    'quantity_distribution': [{'band': k, 'count': v} for k, v in qty_bands.items()],
}

import os
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w') as f:
    json.dump(result, f, indent=2)

print('Written to', out)
print('KPIs:', result['kpis'])
print('Monthly data points:', len(monthly_chart))
print('Top product:', top_products[0])
print('Segments:', customer_segments)
