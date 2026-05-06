const BASE = 'http://localhost:8000' || 'https://ecommerce-ecru-phi.vercel.app';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  register: (data) =>
    request('/api/users/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return fetch(`${BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Login failed');
      }
      return res.json();
    });
  },

  getMe: () => request('/api/users/me'),

  // ── Products ────────────────────────────────────────────────────────────────
  listCategories: () => request('/api/products/categories'),

  listProducts: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    return request(`/api/products/?${q}`);
  },

  searchProducts: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    return request(`/api/products/search?${q}`);
  },

  getProduct: (id, userId, sessionId) => {
    const q = new URLSearchParams();
    if (userId) q.append('user_id', userId);
    if (sessionId) q.append('session_id', sessionId);
    return request(`/api/products/${id}?${q}`);
  },

  getRecommendations: (id) => request(`/api/products/${id}/recommendations`),

  // ── Cart ────────────────────────────────────────────────────────────────────
  addToCart: (data) => request('/api/orders/cart/add', { method: 'POST', body: JSON.stringify(data) }),

  getCart: (cartId) => request(`/api/orders/cart/${cartId}`),

  removeCartItem: (cartId, itemId) =>
    request(`/api/orders/cart/${cartId}/item/${itemId}`, { method: 'DELETE' }),

  // ── Orders ──────────────────────────────────────────────────────────────────
  checkout: (data) => request('/api/orders/checkout', { method: 'POST', body: JSON.stringify(data) }),

  getUserOrders: (userId) => request(`/api/orders/user/${userId}`),

  getOrder: (orderId) => request(`/api/orders/${orderId}`),

  // ── Analytics ───────────────────────────────────────────────────────────────
  getRevenue: (days = 30) => request(`/api/analytics/revenue?days=${days}`),
  getFunnel: (days = 30) => request(`/api/analytics/funnel?days=${days}`),
  getTopProducts: (days = 30, limit = 10) =>
    request(`/api/analytics/top-products?days=${days}&limit=${limit}`),
  getChurnRisk: () => request('/api/analytics/churn-risk'),
  getInventoryHealth: () => request('/api/analytics/inventory-health'),
  getDashboardSummary: () => request('/api/analytics/summary'),
};
