import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">ShopAI</span>
          <p className="footer-tagline">AI-powered shopping experience</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/search?q=electronics">Electronics</Link>
            <Link to="/search?q=fashion">Fashion</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/profile">Profile</Link>
            <Link to="/orders">Orders</Link>
            <Link to="/cart">Cart</Link>
          </div>
          <div className="footer-col">
            <h4>System</h4>
            <Link to="/insights">📊 Data Insights</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
            <Link to="/admin">Admin</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ShopAI — Built with FastAPI + React</span>
      </div>
    </footer>
  );
}
