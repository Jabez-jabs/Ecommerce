import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const churnColor = user.churn_risk_score >= 0.7 ? 'var(--danger)'
    : user.churn_risk_score >= 0.4 ? 'var(--warning)'
    : 'var(--success)';

  const churnLabel = user.churn_risk_score >= 0.7 ? 'High Risk'
    : user.churn_risk_score >= 0.4 ? 'Medium Risk'
    : 'Low Risk';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="page-header">
          <h1>My Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="profile-card glass fade-up">
          <div className="profile-avatar">
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="profile-info">
            <h2>{user.full_name}</h2>
            <p className="profile-email">{user.email}</p>
            <span className={`badge ${user.role === 'admin' ? 'badge-accent' : 'badge-teal'}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20, marginTop: 32 }}>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{user.total_orders}</div>
            <div className="stat-sub">Lifetime orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">₹{user.total_spent?.toLocaleString()}</div>
            <div className="stat-sub">Lifetime spend</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Order Value</div>
            <div className="stat-value">₹{(user.total_spent / Math.max(1, user.total_orders)).toFixed(0)}</div>
            <div className="stat-sub">Per order</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Churn Risk</div>
            <div className="stat-value" style={{ color: churnColor, fontSize: '1.4rem' }}>{churnLabel}</div>
            <div className="stat-sub">Score: {user.churn_risk_score?.toFixed(2)}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <Link to="/orders" className="btn btn-secondary">📦 View Orders</Link>
          <Link to="/cart" className="btn btn-secondary">🛒 My Cart</Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="btn btn-primary">📊 Admin Dashboard</Link>
          )}
          <button className="btn btn-danger" onClick={logout}>🚪 Sign Out</button>
        </div>
      </div>
    </div>
  );
}
