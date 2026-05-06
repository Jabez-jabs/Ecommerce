import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import dataset from '../data/dataset.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const C = {
  accent: 'hsl(245,80%,65%)',
  accentBg: 'rgba(88,80,220,0.15)',
  teal: 'hsl(175,70%,50%)',
  tealBg: 'rgba(38,200,160,0.15)',
  warn: 'hsl(38,90%,55%)',
  danger: 'hsl(0,75%,55%)',
  success: 'hsl(145,63%,45%)',
  purple: 'hsl(265,70%,60%)',
};

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#8b97b8', font: { family: 'Inter', size: 11 } } },
    tooltip: { backgroundColor: '#121929', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, titleColor: '#f0f2ff', bodyColor: '#8b97b8' },
  },
  scales: {
    x: { ticks: { color: '#4a5470', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#4a5470', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
  },
};

const fmt = (n) => n >= 1_000_000
  ? `£${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `£${(n / 1_000).toFixed(1)}K`
  : `£${n.toFixed(0)}`;

const segColors = {
  Champions: C.teal,
  Loyal: C.accent,
  Recent: C.success,
  Occasional: C.warn,
  'At Risk': C.danger,
};
const segBg = {
  Champions: 'rgba(38,200,160,0.7)',
  Loyal: 'rgba(88,80,220,0.7)',
  Recent: 'rgba(50,190,100,0.7)',
  Occasional: 'rgba(240,160,40,0.7)',
  'At Risk': 'rgba(220,60,60,0.7)',
};

export default function DataInsights() {
  const { kpis, monthly_revenue, top_products, top_countries, customer_segments, quantity_distribution, meta } = dataset;

  // Filter out DOTCOM / POSTAGE noise from top products for cleaner chart
  const cleanProducts = top_products
    .filter(p => !['DOTCOM POSTAGE','POSTAGE','Manual',''].includes(p.name))
    .slice(0, 10);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Data Insights</h1>
          <p>
            Real retail dataset · {meta.source} · {meta.date_range} ·{' '}
            <span style={{ color: 'var(--accent-light)' }}>{kpis.total_orders.toLocaleString()} orders</span>
          </p>
        </div>

        {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Total Revenue',    value: fmt(kpis.total_revenue),         sub: 'Lifetime sales',         accent: C.accent },
            { label: 'Orders',           value: kpis.total_orders.toLocaleString(), sub: 'Unique invoices',       accent: C.teal },
            { label: 'Customers',        value: kpis.total_customers.toLocaleString(), sub: 'Registered buyers',  accent: C.success },
            { label: 'Products',         value: kpis.total_products.toLocaleString(), sub: 'Unique SKUs',         accent: C.warn },
            { label: 'Avg Order Value',  value: fmt(kpis.avg_order_value),        sub: 'Per invoice',            accent: C.purple },
            { label: 'Churn Rate',       value: `${kpis.churn_rate_pct}%`,        sub: 'Inactive >180 days',     accent: C.danger },
          ].map(k => (
            <div className="stat-card" key={k.label}>
              <div className="stat-label">{k.label}</div>
              <div className="stat-value" style={{ fontSize: '1.6rem', color: k.accent }}>{k.value}</div>
              <div className="stat-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Monthly Revenue Line ─────────────────────────────────────────────── */}
        <div className="glass chart-card" style={{ marginBottom: 28 }}>
          <h3 className="chart-title">📈 Monthly Revenue &amp; Orders</h3>
          <div style={{ height: 280 }}>
            <Line
              data={{
                labels: monthly_revenue.map(m => m.month),
                datasets: [
                  {
                    label: 'Revenue (£)',
                    data: monthly_revenue.map(m => m.revenue),
                    borderColor: C.accent,
                    backgroundColor: C.accentBg,
                    fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
                  },
                  {
                    label: 'Orders',
                    data: monthly_revenue.map(m => m.orders),
                    borderColor: C.teal,
                    backgroundColor: 'transparent',
                    tension: 0.4, pointRadius: 3, borderDash: [4,3], yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                ...baseOpts,
                scales: {
                  x: baseOpts.scales.x,
                  y:  { ...baseOpts.scales.y, position: 'left',  ticks: { ...baseOpts.scales.y.ticks, callback: v => `£${(v/1000).toFixed(0)}K` } },
                  y1: { ...baseOpts.scales.y, position: 'right', grid: { display: false }, ticks: { ...baseOpts.scales.y.ticks } },
                },
              }}
            />
          </div>
        </div>

        {/* ── 2-col: Top Products + Countries ────────────────────────────────── */}
        <div className="grid-2" style={{ marginBottom: 28 }}>
          {/* Top Products horizontal bar */}
          <div className="glass chart-card">
            <h3 className="chart-title">🏆 Top Products by Revenue</h3>
            <div style={{ height: 300 }}>
              <Bar
                data={{
                  labels: cleanProducts.map(p => p.name.length > 28 ? p.name.slice(0,28)+'…' : p.name),
                  datasets: [{
                    label: 'Revenue (£)',
                    data: cleanProducts.map(p => p.revenue),
                    backgroundColor: cleanProducts.map((_, i) =>
                      `hsla(${245 + i * 12},70%,60%,0.75)`),
                    borderRadius: 5,
                  }],
                }}
                options={{ ...baseOpts, indexAxis: 'y', plugins: { legend: { display: false } } }}
              />
            </div>
          </div>

          {/* Top Countries bar */}
          <div className="glass chart-card">
            <h3 className="chart-title">🌍 Revenue by Country</h3>
            <div style={{ height: 300 }}>
              <Bar
                data={{
                  labels: top_countries.map(c => c.country),
                  datasets: [{
                    label: 'Revenue (£)',
                    data: top_countries.map(c => c.revenue),
                    backgroundColor: top_countries.map((_, i) =>
                      `hsla(${175 + i * 18},65%,50%,0.75)`),
                    borderRadius: 5,
                  }],
                }}
                options={{ ...baseOpts, plugins: { legend: { display: false } }, scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, ticks: { ...baseOpts.scales.x.ticks, maxRotation: 40 } } } }}
              />
            </div>
          </div>
        </div>

        {/* ── 2-col: Customer Segments Doughnut + Qty Distribution ───────────── */}
        <div className="grid-2" style={{ marginBottom: 28 }}>
          {/* Customer Segments */}
          <div className="glass chart-card">
            <h3 className="chart-title">👥 Customer Segments (RFM)</h3>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', height: 220 }}>
              <div style={{ flex: 1, height: '100%' }}>
                <Doughnut
                  data={{
                    labels: customer_segments.map(s => s.segment),
                    datasets: [{
                      data: customer_segments.map(s => s.count),
                      backgroundColor: customer_segments.map(s => segBg[s.segment] || 'rgba(88,80,220,0.6)'),
                      borderWidth: 0,
                    }],
                  }}
                  options={{ ...baseOpts, cutout: '60%', scales: undefined }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customer_segments.map(s => (
                  <div key={s.segment} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ background: segBg[s.segment], color: segColors[s.segment] || '#fff' }}>
                      {s.segment}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
              Based on Recency · Frequency · Monetary (RFM) analysis
            </p>
          </div>

          {/* Quantity Distribution */}
          <div className="glass chart-card">
            <h3 className="chart-title">📦 Order Quantity Distribution</h3>
            <div style={{ height: 220 }}>
              <Bar
                data={{
                  labels: quantity_distribution.map(q => q.band),
                  datasets: [{
                    label: 'Transactions',
                    data: quantity_distribution.map(q => q.count),
                    backgroundColor: [C.tealBg.replace('0.15','0.7'), C.accentBg.replace('0.15','0.7'), 'rgba(240,160,40,0.7)', 'rgba(220,60,60,0.7)'],
                    borderRadius: 6,
                  }],
                }}
                options={{ ...baseOpts, plugins: { legend: { display: false } } }}
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
              {kpis.total_orders.toLocaleString()} total transactions across {kpis.total_products.toLocaleString()} unique products
            </p>
          </div>
        </div>

        {/* ── Top Products Table ────────────────────────────────────────────────── */}
        <div className="glass chart-card">
          <h3 className="chart-title">📋 Product Sales Breakdown (Top 10)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Avg/Order</th>
                </tr>
              </thead>
              <tbody>
                {cleanProducts.map((p, i) => (
                  <tr key={p.name}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, maxWidth: 260 }}>{p.name}</td>
                    <td>{p.qty.toLocaleString()}</td>
                    <td>{p.orders.toLocaleString()}</td>
                    <td style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{fmt(p.revenue)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmt(p.revenue / p.orders)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
