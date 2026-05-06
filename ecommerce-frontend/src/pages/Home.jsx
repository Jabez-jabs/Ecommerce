import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProducts, CATEGORIES, PRODUCTS } from '../data/staticData';
import ProductCard from '../components/ProductCard';
import dataset from '../data/dataset.json';

const fmtK = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const catEmojis = {
  // UCI
  'Home Decor': '🏠', 'Kitchen & Dining': '🍽️', 'Bags & Accessories': '👜',
  'Gift & Novelty': '🎁', 'Christmas & Seasonal': '🎄', 'Stationery': '📝',
  'Toys & Games': '🧸', 'Garden & Outdoor': '🌿', 'Storage & Organisation': '📦',
  'Clothing & Accessories': '👗', 'General': '⭐',
  // Amazon India
  'Electronics': '📱', 'Home & Kitchen': '🏡', 'Books': '📚',
  'Fashion': '👔', 'Sports & Outdoors': '⚽',
};

// Pre-compute product lists once
const totalProductCount = PRODUCTS.length;
const trending  = listProducts({ sort_by: 'popularity', page_size: 4 }).items;
const newArrs   = listProducts({ sort_by: 'rating',     page_size: 8 }).items;
const discounts = listProducts({ sort_by: 'discount',   page_size: 4 }).items.filter(p => p.discount_pct > 0);

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { kpis } = dataset;

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="page">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="container hero-content fade-up">
          <div className="hero-badge badge badge-accent">🤖 AI-Powered Shopping · {totalProductCount} Products</div>
          <h1 className="hero-title">
            Discover Products<br />
            <span className="gradient-text">Smarter Than Ever</span>
          </h1>
          <p className="hero-sub">
            Real retail data · Semantic search · Dynamic pricing · Jaccard recommendations
          </p>
          <form className="hero-search" onSubmit={handleSearch}>
            <input
              className="hero-search-input"
              placeholder='Try: "heart candle", "storage bag", "vintage tin"...'
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-lg hero-search-btn">🔍 Search</button>
          </form>
          <div className="hero-cta">
            <Link to="/products"  className="btn btn-teal btn-lg">Browse All Products</Link>
            <Link to="/insights"  className="btn btn-secondary btn-lg">📊 View Insights</Link>
          </div>
        </div>
      </section>

      {/* ── Real Data Stats Banner ────────────────────────────────────────────── */}
      <section className="container">
        <div className="data-stats-banner glass">
          <div className="data-stats-label">
            <span className="badge badge-teal">📦 Real Dataset</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>UCI Online Retail · {dataset.meta.date_range}</span>
          </div>
          <div className="data-stats-row">
            {[
              { icon: '💷', val: `£${fmtK(kpis.total_revenue)}`, label: 'Revenue' },
              { icon: '🛒', val: fmtK(kpis.total_orders),         label: 'Orders' },
              { icon: '👥', val: fmtK(kpis.total_customers),      label: 'Customers' },
              { icon: '📦', val: '348',                            label: 'Products' },
              { icon: '🏷️', val: `${kpis.churn_rate_pct}%`,      label: 'Churn Rate' },
            ].map(s => (
              <div className="data-stat-item" key={s.label}>
                <span className="data-stat-icon">{s.icon}</span>
                <span className="data-stat-val">{s.val}</span>
                <span className="data-stat-label-text">{s.label}</span>
              </div>
            ))}
            <Link to="/insights" className="btn btn-sm btn-primary" style={{ alignSelf: 'center', marginLeft: 'auto' }}>
              Explore →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────────── */}
      <section className="section container">
        <h2 className="section-title">Shop by Category</h2>
        <div className="categories-grid">
          {CATEGORIES.map(cat => (
            <Link key={cat.id} to={`/products?category_id=${cat.id}`} className="category-chip glass">
              <span className="category-icon">{catEmojis[cat.name] || '📦'}</span>
              <span>{cat.name}</span>
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.count}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trending ─────────────────────────────────────────────────────────── */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">🔥 Trending Now</h2>
          <Link to="/products?sort_by=popularity" className="section-link">View all →</Link>
        </div>
        <div className="grid-4">
          {trending.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ── Hot Deals ────────────────────────────────────────────────────────── */}
      {discounts.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">🏷️ Hot Deals</h2>
            <Link to="/products?sort_by=discount" className="section-link">More deals →</Link>
          </div>
          <div className="grid-4">
            {discounts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Top Rated ────────────────────────────────────────────────────────── */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">⭐ Top Rated</h2>
          <Link to="/products?sort_by=rating" className="section-link">View all →</Link>
        </div>
        <div className="grid-3">
          {newArrs.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ── How the AI Works ────────────────────────────────────────────────── */}
      <section className="section container">
        <div className="section-header" style={{ marginBottom: 32 }}>
          <h2 className="section-title">How the AI Works</h2>
          <Link to="/insights" className="section-link">See live data →</Link>
        </div>
        <div className="phases-grid">
          {[
            { phase: '01', icon: '📥', title: 'Data Ingestion',      desc: 'Every view, search, cart add & purchase is captured as a user event — the foundation for all ML models.' },
            { phase: '02', icon: '🔍', title: 'TF-IDF Search Index', desc: 'Products are tokenized nightly. Cosine similarity ranks results against your query in real-time.' },
            { phase: '03', icon: '🤝', title: 'Recommendations',     desc: 'Jaccard similarity on co-purchase co-occurrence builds a pre-computed recommendation matrix nightly.' },
            { phase: '04', icon: '💰', title: 'Dynamic Pricing',     desc: 'An hourly job adjusts prices ±5–15% based on demand signals: views, add-to-cart rate, stock levels.' },
            { phase: '05', icon: '🔐', title: 'Secure API',          desc: 'FastAPI with JWT auth & bcrypt delivers all features via stateless, dependency-injected endpoints.' },
          ].map(p => (
            <div key={p.phase} className="phase-card glass">
              <div className="phase-number">{p.phase}</div>
              <div className="phase-icon">{p.icon}</div>
              <h3 className="phase-title">{p.title}</h3>
              <p className="phase-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Highlights ──────────────────────────────────────────────── */}
      <section className="section container">
        <div className="features-grid">
          {[
            { icon: '🧠', title: 'AI Search',              desc: 'Semantic search understands intent, not just keywords.' },
            { icon: '⚡', title: 'Smart Recommendations', desc: 'Personalised picks based on co-purchase history.' },
            { icon: '📊', title: 'Dynamic Pricing',        desc: 'Prices updated hourly from live demand & inventory.' },
            { icon: '🛡️', title: 'Secure Checkout',        desc: 'JWT-protected accounts with bcrypt-hashed passwords.' },
          ].map(f => (
            <div key={f.title} className="feature-card glass">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
