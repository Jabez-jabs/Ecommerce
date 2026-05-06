import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProduct, getRecommendations } from '../data/staticData';
import { useCart } from '../context/CartContext';
import StarRating from '../components/StarRating';
import ProductCard from '../components/ProductCard';

// Covers UCI + Amazon India categories
const catEmojis = {
  'Home Decor': '🏠', 'Kitchen & Dining': '🍽️', 'Bags & Accessories': '👜',
  'Gift & Novelty': '🎁', 'Christmas & Seasonal': '🎄', 'Stationery': '📝',
  'Toys & Games': '🧸', 'Garden & Outdoor': '🌿', 'Storage & Organisation': '📦',
  'Clothing & Accessories': '👗', 'General': '⭐',
  // Amazon India
  'Electronics': '📱', 'Home & Kitchen': '🏡', 'Books': '📚',
  'Fashion': '👔', 'Sports & Outdoors': '⚽',
};

export default function ProductDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addItem }  = useCart();

  const [product, setProduct]          = useState(null);
  const [recommendations, setRecs]     = useState([]);
  const [selectedVariant, setVariant]  = useState(null);
  const [qty, setQty]                  = useState(1);
  const [added, setAdded]              = useState(false);
  const [notFound, setNotFound]        = useState(false);
  const [imgError, setImgError]         = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const p = getProduct(id);
    if (!p) { setNotFound(true); return; }
    setProduct(p);
    setVariant(p.variants[0]);
    setRecs(getRecommendations(p.id));
    setAdded(false);
    setQty(1);
  }, [id]);

  if (notFound) return (
    <div className="page container">
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <span style={{ fontSize: '3rem' }}>😕</span>
        <h2>Product not found</h2>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    </div>
  );

  if (!product) return (
    <div className="page container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, paddingTop: 32 }}>
        <div className="skeleton" style={{ aspectRatio: 1, borderRadius: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[200, 120, 80, 60, 180].map(w => (
            <div key={w} className="skeleton" style={{ height: 24, width: w }} />
          ))}
        </div>
      </div>
    </div>
  );

  const variantPrice = (selectedVariant?.price_modifier || 0) + product.current_price;
  const totalStock   = product.variants.reduce((s, v) => s + v.stock_available, 0);
  const inStock      = selectedVariant ? selectedVariant.stock_available > 0 : totalStock > 0;
  const isLow        = selectedVariant?.stock_available > 0 && selectedVariant?.stock_available <= 10;

  // Unified image source: scraped products have `image_url`, UCI has `image_urls`
  const imgSrc = product
    ? product.image_url || (product.image_urls && product.image_urls[0]) || ''
    : '';

  const handleAddToCart = () => {
    if (!inStock) return;
    addItem({
      product_id:    product.id,
      variant_id:    selectedVariant?.id || product.id,
      name:          product.name,
      brand:         product.brand,
      variant_label: [selectedVariant?.color, selectedVariant?.size].filter(Boolean).join(' / ') || 'Standard',
      sku:           selectedVariant?.sku || product.sku,
      price:         variantPrice,
      image:         imgSrc,
      currency:      product.currency || 'GBP',
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const catEmoji = catEmojis[product.category] || '📦';
  const showImg  = imgSrc && !imgError;

  // Dynamic pricing signal
  const getDemandSignal = () => {
    if (product.views_last_24h > 80)  return { label: 'High Demand 🔥', color: 'hsl(0,75%,55%)',   bg: 'rgba(220,60,60,0.12)' };
    if (product.views_last_24h > 30)  return { label: 'Popular 📈',     color: 'hsl(38,90%,55%)',  bg: 'rgba(240,160,40,0.12)' };
    return                                    { label: 'Available 🛒',    color: 'hsl(145,63%,45%)', bg: 'rgba(50,190,100,0.12)' };
  };
  const demand = getDemandSignal();

  return (
    <div className="page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> &nbsp;›&nbsp;
          <Link to="/products">Products</Link> &nbsp;›&nbsp;
          <Link to={`/products?category_id=${product.category_id}`}>{product.category}</Link> &nbsp;›&nbsp;
          <span>{product.name}</span>
        </div>

        {/* Main layout */}
        <div className="pd-layout">
          {/* ── Image / Placeholder ─────────────────────────────────────────── */}
          <div className="pd-img-wrap glass">
            {showImg ? (
              <img
                src={imgSrc}
                alt={product.name}
                onError={() => setImgError(true)}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain', padding: '24px',
                  borderRadius: 16,
                }}
              />
            ) : (
              <div className="pd-img-placeholder">{catEmoji}</div>
            )}
            {product.discount_pct > 0 && (
              <span className="pd-badge badge badge-danger">{product.discount_pct}% OFF</span>
            )}
            {product.badge && (
              <span style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(255,153,0,0.92)', color: '#000',
                fontSize: '0.72rem', fontWeight: 700,
                borderRadius: 6, padding: '3px 10px',
              }}>{product.badge}</span>
            )}
          </div>

          {/* ── Product Info ────────────────────────────────────────────────── */}
          <div className="pd-info">
            <div className="pd-brand">{product.brand} · {product.category}</div>
            <h1 className="pd-name">{product.name}</h1>

            {/* Rating */}
            <div className="pd-rating">
              <StarRating rating={product.avg_rating} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {product.avg_rating.toFixed(1)}
              </span>
              <span className="pd-review-count">({product.review_count.toLocaleString()} reviews)</span>
            </div>

            {/* Price */}
            <div className="pd-price-row">
              <span className="pd-price" style={{ color: 'var(--accent-light)' }}>
                £{variantPrice.toFixed(2)}
              </span>
              {product.discount_pct > 0 && (
                <>
                  <span className="pd-price-orig">£{product.original_price.toFixed(2)}</span>
                  <span className="badge badge-danger">{product.discount_pct}% off</span>
                </>
              )}
            </div>

            {/* Dynamic pricing signal */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: demand.bg, border: `1px solid ${demand.color}33`,
                borderRadius: 99, padding: '4px 14px', fontSize: '0.82rem', fontWeight: 600, color: demand.color,
              }}>
                {demand.label}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {product.views_last_24h} views today
              </span>
            </div>

            {/* Description */}
            <p className="pd-desc">{product.description}</p>

            {/* Variants */}
            {product.variants.length > 1 && (
              <div className="pd-variants">
                <label className="form-label">
                  Select Variant
                  {selectedVariant && (
                    <span style={{ color: 'var(--teal)', marginLeft: 8 }}>
                      — {[selectedVariant.color, selectedVariant.size].filter(Boolean).join(' / ') || 'Standard'}
                    </span>
                  )}
                </label>
                <div className="variant-grid">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      className={`variant-chip${selectedVariant?.id === v.id ? ' active' : ''}${v.stock_available === 0 ? ' out' : ''}`}
                      onClick={() => v.stock_available > 0 && setVariant(v)}
                      disabled={v.stock_available === 0}
                    >
                      <span>{v.color || 'Standard'}</span>
                      {v.size && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.size}</span>}
                      {v.price_modifier !== 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--teal)' }}>
                          {v.price_modifier > 0 ? `+£${v.price_modifier}` : `-£${Math.abs(v.price_modifier)}`}
                        </span>
                      )}
                      {v.stock_available === 0 && <span className="oos-label">Out of Stock</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="pd-actions">
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className="qty-val">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(selectedVariant?.stock_available || 99, q + 1))}>+</button>
              </div>
              <button
                className={`btn btn-lg ${added ? 'btn-teal' : 'btn-primary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                {added ? '✓ Added to Cart!' : inStock ? '🛒 Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            {/* Stock info */}
            <div className="stock-info">
              {selectedVariant ? (
                selectedVariant.stock_available === 0 ? (
                  <span className="text-danger">Out of stock for this variant</span>
                ) : isLow ? (
                  <span className="text-warn">⚠️ Only {selectedVariant.stock_available} left!</span>
                ) : (
                  <span className="text-success">✓ In stock ({selectedVariant.stock_available} available)</span>
                )
              ) : (
                totalStock > 0
                  ? <span className="text-success">✓ In stock</span>
                  : <span className="text-danger">Out of stock</span>
              )}
            </div>

            {/* Meta info */}
            <div className="pd-meta">
              <span>SKU: <strong>{product.sku}</strong></span>
              <span>Category: <Link to={`/products?category_id=${product.category_id}`} style={{ color: 'var(--accent-light)' }}>{product.category}</Link></span>
              {product.tags.length > 0 && (
                <span>Tags: {product.tags.map(t => (
                  <span key={t} className="badge badge-accent" style={{ marginRight: 4 }}>{t}</span>
                ))}</span>
              )}
            </div>

            {/* Dynamic Pricing info box */}
            <div style={{
              background: 'rgba(88,80,220,0.07)', border: '1px solid rgba(88,80,220,0.15)',
              borderRadius: 12, padding: '14px 18px', fontSize: '0.82rem', color: 'var(--text-secondary)',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <strong style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>⚡ Dynamic Pricing Active</strong>
              <span>Add-to-cart rate: <strong>{(product.add_to_cart_rate * 100).toFixed(1)}%</strong></span>
              <span>Conversion rate: <strong>{(product.conversion_rate * 100).toFixed(1)}%</strong></span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Price adjusts hourly based on demand signals &amp; stock levels.
              </span>
            </div>
          </div>
        </div>

        {/* ── Recommendations ──────────────────────────────────────────────────── */}
        {recommendations.length > 0 && (
          <div className="section" style={{ borderTop: '1px solid var(--border)', paddingTop: 40 }}>
            <div className="section-header">
              <h2 className="section-title">🤝 You May Also Like</h2>
              <Link to={`/products?category_id=${product.category_id}`} className="section-link">
                More in {product.category} →
              </Link>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
              Recommended using Jaccard co-purchase similarity
            </p>
            <div className="grid-3">
              {recommendations.map(r => <ProductCard key={r.id} product={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
