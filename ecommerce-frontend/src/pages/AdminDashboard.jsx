import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { api } from '../api/api';
import dataset from '../data/dataset.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

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

const fmtGbp = (n) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `£${(n / 1_000).toFixed(1)}K`
  : `£${n.toFixed(0)}`;

const segBg = {
  Champions: 'rgba(38,200,160,0.75)',
  Loyal:     'rgba(88,80,220,0.75)',
  Recent:    'rgba(50,190,100,0.75)',
  Occasional:'rgba(240,160,40,0.75)',
  'At Risk': 'rgba(220,60,60,0.75)',
};

export default function AdminDashboard() {
  // Live backend API state
  const [summary,     setSummary]     = useState(null);
  const [funnel,      setFunnel]      = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [churn,       setChurn]       = useState([]);
  const [inventory,   setInventory]   = useState(null);
  const [days,        setDays]        = useState(30);

  // Dataset tab: 'api' | 'dataset'
  const [tab, setTab] = useState('dataset');

  useEffect(() => {
    api.getDashboardSummary().then(setSummary).catch(() => {});
    api.getChurnRisk().then(setChurn).catch(() => {});
    api.getInventoryHealth().then(setInventory).catch(() => {});
  }, []);

  useEffect(() => {
    api.getFunnel(days).then(setFunnel).catch(() => {});
    api.getTopProducts(days, 8).then(setTopProducts).catch(() => {});
  }, [days]);

  const ds = dataset;
  const cleanProds = ds.top_products
    .filter(p => !['DOTCOM POSTAGE','POSTAGE','Manual',''].includes(p.name))
    .slice(0, 8);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>AI analytics · live API &amp; real retail dataset</p>
        </div>

        {/* ── Tab Switcher ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${tab === 'dataset' ? 'btn-teal' : 'btn-secondary'}`}
            onClick={() => setTab('dataset')}
          >
            📦 Dataset Analytics
          </button>
          <button
            className={`btn btn-sm ${tab === 'api' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('api')}
          >
            ⚡ Live Backend API
          </button>
          <Link to="/insights" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}>
            Full Insights →
          </Link>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1 — REAL DATASET
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'dataset' && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Revenue',   value: fmtGbp(ds.kpis.total_revenue),               sub: 'UCI Retail Dataset',   color: 'hsl(245,80%,65%)' },
                { label: 'Total Orders',    value: ds.kpis.total_orders.toLocaleString(),         sub: 'Unique invoices',      color: 'hsl(175,70%,50%)' },
                { label: 'Customers',       value: ds.kpis.total_customers.toLocaleString(),      sub: 'Registered buyers',    color: 'hsl(145,63%,45%)' },
                { label: 'Products (SKUs)', value: ds.kpis.total_products.toLocaleString(),       sub: 'Unique stock codes',   color: 'hsl(38,90%,55%)'  },
                { label: 'Avg Order Value', value: fmtGbp(ds.kpis.avg_order_value),              sub: 'Per invoice',          color: 'hsl(265,70%,60%)' },
                { label: 'Churn Rate',      value: `${ds.kpis.churn_rate_pct}%`,                 sub: 'Inactive > 180 days',  color: 'hsl(0,75%,55%)'   },
              ].map(k => (
                <div className="stat-card" key={k.label}>
                  <div className="stat-label">{k.label}</div>
                  <div className="stat-value" style={{ color: k.color, fontSize: '1.5rem' }}>{k.value}</div>
                  <div className="stat-sub">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Monthly Revenue Line */}
            <div className="glass chart-card" style={{ marginBottom: 24 }}>
              <h3 className="chart-title">📈 Monthly Revenue &amp; Orders — {ds.meta.date_range}</h3>
              <div style={{ height: 260 }}>
                <Line
                  data={{
                    labels: ds.monthly_revenue.map(m => m.month),
                    datasets: [
                      {
                        label: 'Revenue (£)',
                        data:  ds.monthly_revenue.map(m => m.revenue),
                        borderColor: 'hsl(245,80%,65%)',
                        backgroundColor: 'rgba(88,80,220,0.12)',
                        fill: true, tension: 0.4, pointRadius: 4, yAxisID: 'y',
                      },
                      {
                        label: 'Orders',
                        data:  ds.monthly_revenue.map(m => m.orders),
                        borderColor: 'hsl(175,70%,50%)',
                        backgroundColor: 'transparent',
                        tension: 0.4, pointRadius: 3, borderDash: [4, 3], yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    ...baseOpts,
                    scales: {
                      x:  baseOpts.scales.x,
                      y:  { ...baseOpts.scales.y, position: 'left',  ticks: { ...baseOpts.scales.y.ticks, callback: v => `£${(v/1000).toFixed(0)}K` } },
                      y1: { ...baseOpts.scales.y, position: 'right', grid: { display: false } },
                    },
                  }}
                />
              </div>
            </div>

            {/* Top Products + Customer Segments */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="glass chart-card">
                <h3 className="chart-title">🏆 Top Products by Revenue</h3>
                <div style={{ height: 260 }}>
                  <Bar
                    data={{
                      labels: cleanProds.map(p => p.name.length > 26 ? p.name.slice(0,26)+'…' : p.name),
                      datasets: [{
                        label: 'Revenue (£)',
                        data:  cleanProds.map(p => p.revenue),
                        backgroundColor: cleanProds.map((_, i) => `hsla(${245+i*14},70%,62%,0.75)`),
                        borderRadius: 5,
                      }],
                    }}
                    options={{ ...baseOpts, indexAxis: 'y', plugins: { legend: { display: false } } }}
                  />
                </div>
              </div>

              <div className="glass chart-card">
                <h3 className="chart-title">👥 Customer Segments (RFM)</h3>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', height: 260 }}>
                  <div style={{ flex: 1, height: '100%' }}>
                    <Doughnut
                      data={{
                        labels: ds.customer_segments.map(s => s.segment),
                        datasets: [{
                          data: ds.customer_segments.map(s => s.count),
                          backgroundColor: ds.customer_segments.map(s => segBg[s.segment] || 'rgba(88,80,220,0.6)'),
                          borderWidth: 0,
                        }],
                      }}
                      options={{ ...baseOpts, cutout: '60%', scales: undefined }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ds.customer_segments.map(s => (
                      <div key={s.segment} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: segBg[s.segment] || '#888', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {s.segment} <strong style={{ color: 'var(--text-primary)' }}>{s.count.toLocaleString()}</strong>
                        </span>
                      </div>
                    ))}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Loyal customers: <strong style={{ color: 'hsl(175,70%,50%)' }}>{ds.kpis.loyal_customers.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Countries + Qty Distribution */}
            <div className="grid-2">
              <div className="glass chart-card">
                <h3 className="chart-title">🌍 Revenue by Country</h3>
                <div style={{ height: 240 }}>
                  <Bar
                    data={{
                      labels: ds.top_countries.map(c => c.country),
                      datasets: [{
                        label: 'Revenue (£)',
                        data:  ds.top_countries.map(c => c.revenue),
                        backgroundColor: ds.top_countries.map((_, i) => `hsla(${175+i*16},60%,50%,0.75)`),
                        borderRadius: 5,
                      }],
                    }}
                    options={{
                      ...baseOpts,
                      plugins: { legend: { display: false } },
                      scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, ticks: { ...baseOpts.scales.x.ticks, maxRotation: 35 } } },
                    }}
                  />
                </div>
              </div>

              <div className="glass chart-card">
                <h3 className="chart-title">📦 Order Quantity Distribution</h3>
                <div style={{ height: 240 }}>
                  <Bar
                    data={{
                      labels: ds.quantity_distribution.map(q => `${q.band} units`),
                      datasets: [{
                        label: 'Transactions',
                        data:  ds.quantity_distribution.map(q => q.count),
                        backgroundColor: ['rgba(38,200,160,0.7)','rgba(88,80,220,0.7)','rgba(240,160,40,0.7)','rgba(220,60,60,0.7)'],
                        borderRadius: 6,
                      }],
                    }}
                    options={{ ...baseOpts, plugins: { legend: { display: false } } }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2 — LIVE BACKEND API
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'api' && (
          <>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[7, 14, 30, 90].map(d => (
                <button
                  key={d}
                  className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>

            {/* Backend KPI cards */}
            {summary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Revenue (30d)',    value: `₹${summary.revenue_last_30_days?.toLocaleString()}`,  sub: `WoW ${summary.week_over_week_revenue?.toFixed(1)}%`, color: 'hsl(245,80%,65%)' },
                  { label: 'Orders (30d)',     value: summary.orders_last_30_days,                           sub: 'Placed this month',   color: 'hsl(175,70%,50%)' },
                  { label: 'New Users (30d)',  value: summary.new_users_last_30_days,                        sub: 'Registrations',       color: 'hsl(145,63%,45%)' },
                  { label: 'High Churn Risk', value: summary.high_churn_risk_users,                          sub: 'Score ≥ 0.7',          color: 'hsl(0,75%,55%)'   },
                  { label: 'Low Stock SKUs',  value: summary.low_stock_skus,                                 sub: 'Need restocking',     color: 'hsl(38,90%,55%)'  },
                ].map(k => (
                  <div className="stat-card" key={k.label}>
                    <div className="stat-label">{k.label}</div>
                    <div className="stat-value" style={{ color: k.color, fontSize: '1.5rem' }}>{k.value}</div>
                    <div className="stat-sub">{k.sub}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert" style={{ background: 'rgba(88,80,220,0.1)', border: '1px solid rgba(88,80,220,0.2)', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                ⚡ Backend API not connected — start the FastAPI server at <code style={{ color: 'var(--accent-light)' }}>http://localhost:8000</code> to see live data.
              </div>
            )}

            {/* Conversion Funnel */}
            {funnel ? (
              <div className="glass chart-card" style={{ marginBottom: 24 }}>
                <h3 className="chart-title">🔮 Conversion Funnel — Last {days} Days</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ height: 220 }}>
                    <Bar
                      data={{
                        labels: funnel.funnel.map(f => f.stage),
                        datasets: [{
                          label: 'Events',
                          data:  funnel.funnel.map(f => f.count),
                          backgroundColor: ['rgba(88,80,220,0.7)', 'rgba(38,200,160,0.7)', 'rgba(240,160,40,0.7)'],
                          borderRadius: 8,
                        }],
                      }}
                      options={{ ...baseOpts, plugins: { legend: { display: false } } }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                    {funnel.funnel.map((f, i) => (
                      <div key={f.stage}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f.stage}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{f.count.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--glass-bg)', borderRadius: 99 }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${f.conversion}%`, background: i === 0 ? 'hsl(245,80%,65%)' : i === 1 ? 'hsl(175,70%,50%)' : 'hsl(38,90%,55%)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.conversion}%</span>
                      </div>
                    ))}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Cart→Purchase: <strong style={{ color: 'hsl(175,70%,50%)' }}>{funnel.cart_to_purchase_rate}%</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass chart-card" style={{ marginBottom: 24 }}>
                <h3 className="chart-title">🔮 Conversion Funnel</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>Connect backend to see live funnel data.</p>
              </div>
            )}

            {/* Top Products + Inventory */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="glass chart-card">
                <h3 className="chart-title">🏆 Top Products by Revenue</h3>
                {topProducts.length > 0 ? (
                  <div style={{ height: 240 }}>
                    <Bar
                      data={{
                        labels: topProducts.map(p => p.product_name?.slice(0,22)),
                        datasets: [{
                          label: 'Revenue (₹)',
                          data:  topProducts.map(p => p.revenue),
                          backgroundColor: 'rgba(88,80,220,0.65)',
                          borderRadius: 5,
                        }],
                      }}
                      options={{ ...baseOpts, indexAxis: 'y', plugins: { legend: { display: false } } }}
                    />
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>No data — connect backend.</p>
                )}
              </div>

              <div className="glass chart-card">
                <h3 className="chart-title">📦 Inventory Health</h3>
                {inventory ? (
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', height: 200 }}>
                    <div style={{ flex: 1, height: '100%' }}>
                      <Doughnut
                        data={{
                          labels: ['Healthy', 'Low Stock', 'Out of Stock'],
                          datasets: [{
                            data: [inventory.healthy, inventory.low_stock, inventory.out_of_stock],
                            backgroundColor: ['rgba(50,190,100,0.8)', 'rgba(240,160,40,0.8)', 'rgba(220,60,60,0.8)'],
                            borderWidth: 0,
                          }],
                        }}
                        options={{ ...baseOpts, cutout: '65%', scales: undefined }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Healthy',      val: inventory.healthy,      color: 'hsl(145,63%,45%)' },
                        { label: 'Low Stock',    val: inventory.low_stock,    color: 'hsl(38,90%,55%)'  },
                        { label: 'Out of Stock', val: inventory.out_of_stock, color: 'hsl(0,75%,55%)'   },
                      ].map(i => (
                        <div key={i.label} style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: i.color, fontWeight: 700 }}>{i.val}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{i.label}</span>
                        </div>
                      ))}
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Health: <strong style={{ color: 'hsl(145,63%,45%)' }}>{inventory.health_pct}%</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>Connect backend to see inventory.</p>
                )}
              </div>
            </div>

            {/* Churn Risk Table */}
            {churn.length > 0 && (
              <div className="glass chart-card">
                <h3 className="chart-title">⚠️ High Churn Risk Users</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Score</th>
                        <th>Days Inactive</th><th>Orders</th><th>Spend</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churn.map(u => (
                        <tr key={u.user_id}>
                          <td>{u.full_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td>
                            <span className={`badge ${u.churn_score >= 0.8 ? 'badge-danger' : 'badge-warn'}`}>
                              {u.churn_score.toFixed(2)}
                            </span>
                          </td>
                          <td>{u.days_since_last_order ?? '—'}</td>
                          <td>{u.total_orders}</td>
                          <td>₹{u.total_spent?.toLocaleString()}</td>
                          <td style={{ color: 'hsl(175,70%,50%)', fontSize: '0.82rem' }}>{u.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
