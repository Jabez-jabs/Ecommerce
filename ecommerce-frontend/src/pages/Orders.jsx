import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const statusColor = {
  confirmed:  'badge-accent',
  processing: 'badge-warn',
  shipped:    'badge-teal',
  delivered:  'badge-success',
  cancelled:  'badge-danger',
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.getUserOrders(user.id)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {Array.from({length:3}).map((_,i) => <div key={i} className="skeleton" style={{height:90}} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48 }}>📦</div>
            <h3>No orders yet</h3>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((o) => (
              <Link key={o.order_id} to={`/orders/${o.order_id}`} className="order-card glass">
                <div className="order-card-left">
                  <div className="order-id">#{o.order_id.slice(0, 8).toUpperCase()}</div>
                  <div className="order-date">{new Date(o.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
                </div>
                <div className="order-card-mid">
                  <span className={`badge ${statusColor[o.status] || 'badge-accent'}`}>{o.status}</span>
                  <span className="order-items">{o.items} item{o.items !== 1 ? 's' : ''}</span>
                </div>
                <div className="order-card-right">
                  <span className="order-total">₹{o.total?.toLocaleString()}</span>
                  <span className="order-view">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
