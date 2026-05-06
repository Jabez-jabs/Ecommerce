import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const PAYMENT_OPTS = [
  { id: 'cod',   label: '💵 Cash on Delivery' },
  { id: 'card',  label: '💳 Credit / Debit Card' },
  { id: 'upi',   label: '📱 UPI / PayTM' },
  { id: 'net',   label: '🏦 Net Banking' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, shipping, total, clearCart } = useCart();

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '', country: 'United Kingdom',
  });
  const [payment, setPayment]   = useState('cod');
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState(false);
  const [orderId, setOrderId]   = useState('');

  if (items.length === 0) return (
    <div className="page container">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <span style={{ fontSize: '3rem' }}>🛒</span>
        <h2>Cart is empty</h2>
        <Link to="/products" className="btn btn-primary">Shop Now</Link>
      </div>
    </div>
  );

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const required = ['full_name','email','address','city','pincode'];
    const missing  = required.filter(k => !form[k].trim());
    if (missing.length) { setError('Please fill all required fields.'); return; }

    setLoading(true);
    // Simulate order placement (backend optional)
    await new Promise(r => setTimeout(r, 1200));
    const fakeOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    setOrderId(fakeOrderId);
    clearCart();
    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="page container">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <span style={{ fontSize: '4rem' }}>🎉</span>
        <h2 style={{ color: 'var(--success)' }}>Order Placed Successfully!</h2>
        <p>Order ID: <strong style={{ color: 'var(--accent-light)', fontFamily: 'monospace', fontSize: '1.1rem' }}>{orderId}</strong></p>
        <p style={{ color: 'var(--text-secondary)' }}>
          Estimated delivery: 3–5 business days to {form.city}.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Link to="/products"   className="btn btn-primary">Continue Shopping</Link>
          <Link to="/"           className="btn btn-secondary">Back to Home</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Checkout</h1>
          <p>{items.length} item{items.length !== 1 ? 's' : ''} · £{total.toFixed(2)} total</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="checkout-layout">
            {/* ── Left: Form ───────────────────────────────────────────────── */}
            <div className="checkout-form">
              {/* Shipping */}
              <div className="glass checkout-section">
                <h3 className="checkout-section-title">📍 Shipping Address</h3>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Jane Doe" value={form.full_name} onChange={set('full_name')} required />
                </div>
                <div className="checkout-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" placeholder="+44 7xxx xxxxxx" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input className="form-input" placeholder="123 High Street, Apt 4B" value={form.address} onChange={set('address')} required />
                </div>
                <div className="checkout-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">City *</label>
                    <input className="form-input" placeholder="London" value={form.city} onChange={set('city')} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">State / County</label>
                    <input className="form-input" placeholder="Greater London" value={form.state} onChange={set('state')} />
                  </div>
                </div>
                <div className="checkout-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Postcode *</label>
                    <input className="form-input" placeholder="SW1A 1AA" value={form.pincode} onChange={set('pincode')} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Country</label>
                    <select className="form-select" value={form.country} onChange={set('country')}>
                      {['United Kingdom','United States','Germany','France','Australia','India','Netherlands'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="glass checkout-section">
                <h3 className="checkout-section-title">💳 Payment Method</h3>
                <div className="payment-options">
                  {PAYMENT_OPTS.map(opt => (
                    <label
                      key={opt.id}
                      className={`payment-option${payment === opt.id ? ' active' : ''}`}
                    >
                      <input type="radio" name="payment" value={opt.id} checked={payment === opt.id} onChange={() => setPayment(opt.id)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {payment === 'card' && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Card Number</label>
                      <input className="form-input" placeholder="4242 4242 4242 4242" maxLength={19} />
                    </div>
                    <div className="checkout-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Expiry</label>
                        <input className="form-input" placeholder="MM/YY" maxLength={5} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">CVV</label>
                        <input className="form-input" placeholder="123" maxLength={4} type="password" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="alert alert-error">{error}</div>}
            </div>

            {/* ── Right: Summary ───────────────────────────────────────────── */}
            <div className="cart-summary glass">
              <h3 className="summary-title">Order Summary</h3>
              {items.map(item => (
                <div key={item.variant_id} className="summary-item-row">
                  <span>{item.name.slice(0, 26)}{item.name.length > 26 ? '…' : ''} ×{item.qty}</span>
                  <span>£{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <hr className="divider" />
              <div className="summary-row">
                <span>Subtotal</span><span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>
                  {shipping === 0 ? 'Free' : `£${shipping.toFixed(2)}`}
                </span>
              </div>
              <hr className="divider" />
              <div className="summary-row summary-total">
                <span>Total</span>
                <span style={{ color: 'var(--accent-light)' }}>£{total.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                style={{ marginTop: 20 }}
                disabled={loading}
              >
                {loading ? '⏳ Placing Order…' : `🛒 Place Order · £${total.toFixed(2)}`}
              </button>
              <Link to="/cart" className="btn btn-secondary btn-full" style={{ marginTop: 10, textAlign: 'center' }}>
                ← Back to Cart
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
