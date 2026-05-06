import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import DataInsights from './pages/DataInsights';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="app-shell">
            <Navbar />
            <main>
              <Routes>
                <Route path="/"               element={<Home />} />
                <Route path="/products"       element={<Products />} />
                <Route path="/products/:id"   element={<ProductDetail />} />
                <Route path="/search"         element={<Search />} />
                <Route path="/login"          element={<Login />} />
                <Route path="/register"       element={<Register />} />
                <Route path="/cart"           element={<Cart />} />
                <Route path="/insights"       element={<DataInsights />} />
                <Route path="/checkout"       element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                <Route path="/orders"         element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/orders/:id"     element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/admin"          element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
