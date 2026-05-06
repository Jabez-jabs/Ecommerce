import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import StarRating from './StarRating';

// Covers both UCI categories and Amazon India categories
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

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);

  // Unified image source: scraped products have `image_url`, UCI has `image_urls`
  const imgSrc = product.image_url ||
    (product.image_urls && product.image_urls[0]) || '';

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = product.variants?.[0];
    addItem({
      product_id:    product.id,
      variant_id:    v?.id || product.id,
      name:          product.name,
      brand:         product.brand,
      variant_label: [v?.color, v?.size].filter(Boolean).join(' / ') || 'Standard',
      sku:           v?.sku || product.sku,
      price:         product.current_price + (v?.price_modifier || 0),
      image:         imgSrc,
      currency:      product.currency || 'GBP',
    }, 1);
  };

  const totalStock = (product.variants || []).reduce((s, v) => s + v.stock_available, 0);
  const isLow      = totalStock > 0 && totalStock <= 10;
  const inStock    = totalStock > 0;

  const showImg = imgSrc && !imgError;

  return (
    <Link to={`/products/${product.id}`} className="product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      {/* Image / Placeholder */}
      <div className="product-card-img-wrap">
        {showImg ? (
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              padding: '8px',
              borderRadius: 12,
            }}
          />
        ) : (
          <div className="product-card-img-placeholder">
            {catEmojis[product.category] || '📦'}
          </div>
        )}

        {product.discount_pct > 0 && (
          <span className="product-discount-badge">{product.discount_pct}% OFF</span>
        )}

        {!inStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            borderRadius: 12,
          }}>
            Out of Stock
          </div>
        )}

        {/* Amazon badge */}
        {product.badge && (
          <span style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(255,153,0,0.9)', color: '#000',
            fontSize: '0.65rem', fontWeight: 700,
            borderRadius: 4, padding: '2px 6px',
          }}>{product.badge}</span>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-brand">{product.brand}</div>
        <div className="product-card-name" title={product.name}>{product.name}</div>
        <StarRating rating={product.avg_rating} size="sm" />

        <div className="product-card-footer">
          <div className="product-price-group">
            <span className="product-price">£{product.current_price.toFixed(2)}</span>
            {product.discount_pct > 0 && (
              <span className="product-price-orig">£{product.original_price.toFixed(2)}</span>
            )}
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={!inStock}
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            {inStock ? '+ Cart' : '✕'}
          </button>
        </div>

        {isLow && (
          <div style={{ fontSize: '0.72rem', color: 'hsl(38,90%,55%)', fontWeight: 600, marginTop: 4 }}>
            ⚠️ Only {totalStock} left
          </div>
        )}
      </div>
    </Link>
  );
}
