import csv, collections

path = r'd:\Intern\MiniProject\ecommerce\data\data.csv'
rows = []
with open(path, encoding='latin-1') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

print('TOTAL rows:', len(rows))

daily_rev = collections.defaultdict(float)
daily_orders = collections.defaultdict(set)
countries_rev = collections.defaultdict(float)
product_sales = collections.defaultdict(lambda: {'qty': 0, 'revenue': 0.0})

for r in rows:
    try:
        qty = float(r['Quantity'])
        price = float(r['UnitPrice'])
        if qty <= 0 or price <= 0:
            continue
        rev = qty * price
        date_str = r['InvoiceDate'].split(' ')[0]
        daily_rev[date_str] += rev
        daily_orders[date_str].add(r['InvoiceNo'])
        countries_rev[r['Country']] += rev
        desc = r['Description'].strip()
        product_sales[desc]['qty'] += qty
        product_sales[desc]['revenue'] += rev
    except:
        pass

top_dates = sorted(daily_rev.items())[:10]
print('Sample dates:')
for d, rev in top_dates:
    print(f'  {d}: {rev:.2f}')

top_countries = sorted(countries_rev.items(), key=lambda x: -x[1])[:10]
print('Top countries:')
for c, rev in top_countries:
    print(f'  {c}: {rev:.2f}')

top_products = sorted(product_sales.items(), key=lambda x: -x[1]['revenue'])[:10]
print('Top products:')
for p, s in top_products:
    print(f'  {p[:40]}: qty={s["qty"]:.0f}')

total_rev = sum(daily_rev.values())
total_orders = len(set(r['InvoiceNo'] for r in rows if r['InvoiceNo']))
total_customers = len(set(r['CustomerID'] for r in rows if r['CustomerID']))
total_products = len(set(r['StockCode'] for r in rows if r['StockCode']))
print(f'Total revenue: {total_rev:.2f}')
print(f'Total orders: {total_orders}')
print(f'Total customers: {total_customers}')
print(f'Total products: {total_products}')
