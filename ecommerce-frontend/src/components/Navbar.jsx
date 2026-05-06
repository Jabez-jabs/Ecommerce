import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">ShopAI</span>
        </Link>

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search products with AI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="navbar-search-btn">🔍</button>
        </form>

        {/* Nav Links */}
        <div className="navbar-links">
          <Link to="/products" className="nav-link">Products</Link>
          <Link to="/insights" className="nav-link" style={{ color: 'var(--teal)' }}>📊 Insights</Link>

          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link nav-link-admin">Dashboard</Link>
          )}

          {/* Cart */}
          <Link to="/cart" className="nav-cart">
            🛒
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </Link>

          {/* Auth */}
          {user ? (
            <div className="nav-user" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="nav-avatar">{user.full_name?.[0]?.toUpperCase()}</div>
              {menuOpen && (
                <div className="nav-dropdown">
                  <Link to="/profile" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>👤 Profile</Link>
                  <Link to="/orders" className="nav-dropdown-item" onClick={() => setMenuOpen(false)}>📦 Orders</Link>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button className="nav-dropdown-item nav-logout" onClick={logout}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
          )}
        </div>

        {/* Mobile burger */}
        <button className="navbar-burger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>
    </nav>
  );
}
