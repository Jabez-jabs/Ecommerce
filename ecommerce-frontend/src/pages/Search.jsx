import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { searchProducts, CATEGORIES } from '../data/staticData';
import { useCart } from '../context/CartContext';
import StarRating from '../components/StarRating';

const catEmojis = {
  'Home Decor': '🏠', 'Kitchen & Dining': '🍽️', 'Bags & Accessories': '👜',
  'Gift & Novelty': '🎁', 'Christmas & Seasonal': '🎄', 'Stationery': '📝',
  'Toys & Games': '🧸', 'Garden & Outdoor': '🌿', 'Storage & Organisation': '📦',
  'Clothing & Accessories': '👗', 'General': '⭐',
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const initialQ = searchParams.get('q') || '';
  const [query,   setQuery]   = useState(initialQ);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [added,   setAdded]   = useState({});

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q.trim()) {
      setLoading(true);
      // Simulate a tiny async delay for UX (TF-IDF feel)
      setTimeout(() => {
        setResults(searchProducts(q, 30));
        setLoading(false);
      }, 250);
    } else {
      setResults([]);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  const handleAddToCart = (product) => {
    const v = product.variants[0];
    addItem({
      product_id:    product.id,
      variant_id:    v?.id || product.id,
      name:          product.name,
      brand:         product.brand,
      variant_label: [v?.color, v?.size].filter(Boolean).join(' / ') || 'Standard',
      sku:           v?.sku || product.sku,
      price:         product.current_price + (v?.price_modifier || 0),
      image:         null,
    }, 1);
    setAdded(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [product.id]: false })), 2000);
  };

  // Quick suggestion chips
  const suggestions = [
    'heart candle', 'storage bag', 'cakestand', 'christmas', 'vintage tin',
    'lunch bag', 'ceramic jar', 'bunting', 'hot water bottle', 'spotty',
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>AI Product Search</h1>
          <p>Semantic search · TF-IDF cosine similarity · {results.length > 0 ? `${results.length} results` : initialQ ? '0 results' : 'Type to search'}</p>
        </div>

        {/* ── Search Bar ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="search-bar-row" style={{ marginBottom: 16 }}>
          <input
            autoFocus
            className="form-input"
            style={{ flex: 1, fontSize: '1rem', padding: '13px 18px' }}
            placeholder='Try: "hanging heart", "storage bag", "christmas tin"...'
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-lg">🔍 Search</button>
        </form>

        {/* Suggestions */}
        {!initialQ && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
            {suggestions.map(s => (
              <button
                key={s}
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchParams({ q: s })}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── AI Search Info Banner ───────────────────────────────────────────── */}
        {initialQ && (
          <div style={{
            background: 'rgba(88,80,220,0.07)', border: '1px solid rgba(88,80,220,0.15)',
            borderRadius: 12, padding: '12px 18px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span className="badge badge-accent">🤖 TF-IDF Search</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Query tokenized and scored against 348 product vectors using cosine similarity.
            </span>
            {results.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Best match: <strong style={{ color: 'var(--accent-light)' }}>{results[0]?.match_pct}%</strong>
              </span>
            )}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} className="glass" style={{ height: 120, borderRadius: 12 }}>
                <div className="skeleton" style={{ height: '100%', borderRadius: 12 }} />
              </div>
            ))}
          </div>
        )}

        {/* ── No Results ──────────────────────────────────────────────────────── */}
        {!loading && initialQ && results.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <h3>No results for "{initialQ}"</h3>
            <p>Try different keywords, or browse by category.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {CATEGORIES.slice(0, 4).map(c => (
                <Link key={c.id} to={`/products?category_id=${c.id}`} className="btn btn-secondary btn-sm">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state (no query) ───────────────────────────────────────────── */}
        {!loading && !initialQ && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)' }}>
              Browse by Category
            </h3>
            <div className="categories-grid">
              {CATEGORIES.map(c => (
                <Link key={c.id} to={`/products?category_id=${c.id}`} className="category-chip glass">
                  <span className="category-icon">{catEmojis[c.name] || '📦'}</span>
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────────── */}
        {!loading && results.length > 0 && (
          <div className="search-results-grid">
            {results.map((product, idx) => (
              <div key={product.id} className="search-result-card glass">
                {/* Thumbnail */}
                <Link to={`/products/${product.id}`} className="src-img" style={{ textDecoration: 'none' }}>
                  {catEmojis[product.category] || '📦'}
                </Link>

                {/* Info */}
                <div className="src-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="src-brand">{product.brand}</span>
                    <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>{product.category}</span>
                    {idx === 0 && <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>Best Match</span>}
                  </div>

                  <Link to={`/products/${product.id}`} className="src-name" style={{ color: 'var(--text-primary)' }}>
                    {product.name}
                  </Link>

                  <p className="src-desc">{product.description.slice(0, 120)}…</p>

                  <div className="src-footer">
                    <StarRating rating={product.avg_rating} size="sm" />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      ({product.review_count})
                    </span>

                    <span style={{ marginLeft: 8, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      £{product.current_price.toFixed(2)}
                    </span>
                    {product.discount_pct > 0 && (
                      <span className="badge badge-danger">{product.discount_pct}% off</span>
                    )}

                    {/* Match score */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>match</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[...Array(5)].map((_, i) => (
                            <div key={i} style={{
                              width: 6, height: 14, borderRadius: 3,
                              background: i < Math.round(product.match_pct / 20)
                                ? 'var(--accent)' : 'var(--glass-border)',
                              transition: 'background 0.2s',
                            }} />
                          ))}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-light)' }}>
                        {product.match_pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', minWidth: 110 }}>
                  <Link to={`/products/${product.id}`} className="btn btn-secondary btn-sm" style={{ textAlign: 'center' }}>
                    View
                  </Link>
                  <button
                    className={`btn btn-sm ${added[product.id] ? 'btn-teal' : 'btn-primary'}`}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.variants[0]?.stock_available === 0}
                  >
                    {added[product.id] ? '✓ Added' : '+ Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
