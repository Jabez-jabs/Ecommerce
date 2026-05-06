import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

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

/** Small image or fallback emoji for a cart item */
function CartItemImg({ item }) {
  const [err, setErr] = useState(false);
  if (item.image && !err) {
    return (
      <img
        src={item.image}
        alt={item.name}
        onError={() => setErr(true)}
        style={{
          width: '100%', height: '100%',
          objectFit: 'contain', padding: 6,
          borderRadius: 10,
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: '2rem' }}>
      {catEmojis['General']}
    </span>
  );
}

export default function Cart() {
  const { items, removeItem, updateQty, itemCount, subtotal, shipping, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) return (
    <div className="page container">
      <div className="page-header"><h1>Your Cart</h1></div>
      <div className="empty-state" style={{ paddingTop: 60 }}>
        <span style={{ fontSize: '4rem' }}>🛒</span>
        <h2>Your cart is empty</h2>
        <p>Find something you love in our collection.</p>
        <Link to="/products" className="btn btn-primary">Browse Products</Link>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Your Cart</h1>
          <p>{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="cart-layout">
          {/* ── Item List ────────────────────────────────────────────────────── */}
          <div className="cart-items">
            {items.map(item => (
              <div key={item.variant_id} className="cart-item glass">
                {/* Thumbnail */}
                <Link to={`/products/${item.product_id}`} className="cart-item-img" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CartItemImg item={item} />
                </Link>

                {/* Info */}
                <div className="cart-item-info">
                  <Link to={`/products/${item.product_id}`} className="cart-item-name" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </Link>
                  {item.brand && <div style={{ fontSize: '0.8rem', color: 'var(--accent-light)', fontWeight: 600 }}>{item.brand}</div>}
                  {item.variant_label && (
                    <div className="cart-item-variant">{item.variant_label}</div>
                  )}
                  <div className="cart-item-row">
                    <span className="cart-item-price">£{item.price.toFixed(2)} / each</span>
                  </div>
                </div>

                {/* Qty + Remove */}
                <div className="cart-item-end">
                  <span className="cart-item-total">£{(item.price * item.qty).toFixed(2)}</span>
                  <div className="qty-control" style={{ transform: 'scale(0.9)' }}>
                    <button className="qty-btn" onClick={() => updateQty(item.variant_id, item.qty - 1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.variant_id, item.qty + 1)}>+</button>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(item.variant_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Order Summary ────────────────────────────────────────────────── */}
          <div className="cart-summary glass">
            <h3 className="summary-title">Order Summary</h3>

            {/* Item breakdown */}
            <div style={{ marginBottom: 16 }}>
              {items.map(item => (
                <div key={item.variant_id} className="summary-item-row">
                  <span>{item.name.slice(0, 28)}{item.name.length > 28 ? '…' : ''} ×{item.qty}</span>
                  <span>£{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <hr className="divider" />

            <div className="summary-row">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>
                {shipping === 0 ? 'Free' : `£${shipping.toFixed(2)}`}
              </span>
            </div>
            {shipping > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                Free shipping on orders over £50
              </p>
            )}
            <hr className="divider" />
            <div className="summary-row summary-total">
              <span>Total</span>
              <span style={{ color: 'var(--accent-light)' }}>£{total.toFixed(2)}</span>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 20 }}
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout →
            </button>
            <Link to="/products" className="btn btn-secondary btn-full" style={{ marginTop: 10, textAlign: 'center' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
