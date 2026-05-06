import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';

const statusSteps = ['confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrder(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page container">
      <div className="skeleton" style={{ height: 400, marginTop: 80 }} />
    </div>
  );

  if (!order) return (
    <div className="page container empty-state">
      <h2>Order not found</h2>
      <Link to="/orders" className="btn btn-primary">Back to Orders</Link>
    </div>
  );

  const currentStep = statusSteps.indexOf(order.status);

  return (
    <div className="page">
      <div className="container">
        {success && (
          <div className="success-banner glass fade-up">
            <span style={{ fontSize: 36 }}>🎉</span>
            <div>
              <h3>Order Placed Successfully!</h3>
              <p>Thank you for your purchase. We'll start processing it right away.</p>
            </div>
          </div>
        )}

        <div className="page-header">
          <h1>Order #{id.slice(0, 8).toUpperCase()}</h1>
          <p>Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
        </div>

        {/* Progress Tracker */}
        {order.status !== 'cancelled' && (
          <div className="order-progress glass">
            {statusSteps.map((step, i) => (
              <div key={step} className={`progress-step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
                <div className="progress-dot">{i <= currentStep ? '✓' : i + 1}</div>
                <span className="progress-label">{step}</span>
                {i < statusSteps.length - 1 && <div className={`progress-line ${i < currentStep ? 'done' : ''}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="order-detail-layout">
          {/* Items */}
          <div>
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Order Items</h3>
              {order.items.map((item, i) => (
                <div key={i} className="order-item-row">
                  <div className="order-item-icon">{item.product_name?.[0]}</div>
                  <div className="order-item-info">
                    <p className="order-item-name">{item.product_name}</p>
                    <p className="order-item-meta">{item.variant} · SKU: {item.sku}</p>
                  </div>
                  <div className="order-item-right">
                    <span>×{item.quantity}</span>
                    <span>₹{item.line_total?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="glass" style={{ padding: 24, marginTop: 16 }}>
                <h3 style={{ marginBottom: 12, fontWeight: 700 }}>📍 Shipping Address</h3>
                <p>{order.shipping_address.street}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.pincode}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="cart-summary glass">
            <h3 className="summary-title">Payment Summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>₹{order.subtotal?.toLocaleString()}</span></div>
            {order.discount > 0 && <div className="summary-row text-success"><span>Discount</span><span>−₹{order.discount}</span></div>}
            <div className="summary-row"><span>Shipping</span><span>{order.shipping === 0 ? 'Free' : `₹${order.shipping}`}</span></div>
            <div className="summary-row"><span>Tax</span><span>₹{order.tax?.toLocaleString()}</span></div>
            <hr className="divider" />
            <div className="summary-row summary-total"><span>Total</span><span>₹{order.total?.toLocaleString()}</span></div>

            <div style={{ marginTop: 20 }}>
              <p className="form-label">Payment Method</p>
              <p style={{ textTransform: 'capitalize', fontWeight: 600 }}>{order.payment_method}</p>
            </div>
            <div style={{ marginTop: 12 }}>
              <p className="form-label">Payment Status</p>
              <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-warn'}`}>
                {order.payment_status}
              </span>
            </div>

            <Link to="/orders" className="btn btn-secondary btn-full" style={{ marginTop: 20 }}>
              ← All Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
