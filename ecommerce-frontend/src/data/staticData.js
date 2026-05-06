/**
 * staticData.js
 * -------------
 * Merges UCI retail dataset (products.json) with Amazon India scraped data
 * (scraped_products.json) into a single PRODUCTS array consumed by the app.
 *
 * Normalisations applied:
 *  - UCI products get `image_url` (empty string) + `currency: 'GBP'`
 *  - Amazon products get INR prices converted to GBP (÷100 as demo rate)
 *    and `image_urls` array added alongside existing `image_url` string
 *  - CATEGORIES is computed dynamically from the merged array so new
 *    Amazon categories (Books, Electronics, Fashion…) appear automatically.
 */
import RAW_UCI_PRODUCTS  from './products.json';
import RAW_SCRAPED       from './scraped_products.json';
import RAW_CATEGORIES    from './categories.json';

// ── 1. Normalise UCI (GBP) products ─────────────────────────────────────────
const UCI_PRODUCTS = RAW_UCI_PRODUCTS.map(p => ({
  ...p,
  // UCI dataset has `image_urls: []`; add a unified `image_url` field
  image_url: (p.image_urls && p.image_urls[0]) || '',
  currency:  'GBP',
  source:    p.source || 'uci',
}));

// ── 2. Normalise + convert Amazon India (INR → GBP) products ────────────────
// Demo exchange rate: 1 GBP ≈ 100 INR for simplicity
const INR_TO_GBP = 0.01;

const AMAZON_PRODUCTS = RAW_SCRAPED.map(p => ({
  ...p,
  // Ensure the unified `image_urls` array exists alongside `image_url`
  image_urls:     p.image_url ? [p.image_url] : [],
  currency:       'GBP',
  // Convert prices from INR to GBP
  current_price:  +(p.current_price  * INR_TO_GBP).toFixed(2),
  base_price:     +(p.base_price     * INR_TO_GBP).toFixed(2),
  original_price: +(p.original_price * INR_TO_GBP).toFixed(2),
  min_price:      +(p.min_price      * INR_TO_GBP).toFixed(2),
  max_price:      +(p.max_price      * INR_TO_GBP).toFixed(2),
}));

// ── 3. Merged product list (UCI first, Amazon appended) ──────────────────────
export const PRODUCTS = [...UCI_PRODUCTS, ...AMAZON_PRODUCTS];

// ── 4. Build CATEGORIES dynamically from merged data ─────────────────────────
// Map of category_ids that exist in the Amazon dataset but not in categories.json
const AMAZON_EXTRA_CATS = {
  books:            { name: 'Books',             slug: 'books' },
  electronics:      { name: 'Electronics',       slug: 'electronics' },
  'home-kitchen':   { name: 'Home & Kitchen',    slug: 'home-kitchen' },
  fashion:          { name: 'Fashion',            slug: 'fashion' },
  'sports-outdoors':{ name: 'Sports & Outdoors', slug: 'sports-outdoors' },
};

// Update counts in base categories using merged data
const baseCats = RAW_CATEGORIES.map(c => ({
  ...c,
  count: PRODUCTS.filter(p => p.category_id === c.id).length,
}));

// Add brand-new Amazon-only categories (not already in categories.json)
const existingIds = new Set(RAW_CATEGORIES.map(c => c.id));
const extraCats = Object.entries(AMAZON_EXTRA_CATS)
  .filter(([id]) => !existingIds.has(id))
  .map(([id, info]) => ({
    id,
    ...info,
    count: PRODUCTS.filter(p => p.category_id === id).length,
  }))
  .filter(c => c.count > 0);

export const CATEGORIES = [...baseCats, ...extraCats];

// ── 5. Tiny helpers ──────────────────────────────────────────────────────────
const normalize = (s = '') => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

/** TF-IDF-style score — checks name, brand, category, tags, description */
function score(product, query) {
  if (!query) return 1;
  const q      = normalize(query);
  const terms  = q.split(/\s+/).filter(Boolean);
  const corpus = normalize(
    `${product.name} ${product.brand} ${product.category} ${(product.tags || []).join(' ')} ${product.description}`
  );
  return terms.reduce((acc, t) => acc + (corpus.includes(t) ? 1 : 0), 0);
}

/**
 * formatPrice — returns a formatted price string for a product
 * All products are now normalised to GBP so this always returns £.
 */
export function formatPrice(price = 0) {
  return `£${Number(price).toFixed(2)}`;
}

/**
 * listProducts — mirrors GET /api/products/
 */
export function listProducts(opts = {}) {
  const {
    category_id,
    brand,
    min_price,
    max_price,
    min_rating,
    sort_by   = 'popularity',
    page      = 1,
    page_size = 24,
    q         = '',
  } = opts;

  let results = [...PRODUCTS];

  if (category_id) results = results.filter(p => p.category_id === category_id);
  if (brand)       results = results.filter(p => p.brand === brand);
  if (min_price)   results = results.filter(p => p.current_price >= Number(min_price));
  if (max_price)   results = results.filter(p => p.current_price <= Number(max_price));
  if (min_rating)  results = results.filter(p => p.avg_rating >= Number(min_rating));

  if (q.trim()) {
    results = results
      .map(p => ({ p, s: score(p, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.p);
  } else {
    if (sort_by === 'price_asc')  results.sort((a, b) => a.current_price - b.current_price);
    if (sort_by === 'price_desc') results.sort((a, b) => b.current_price - a.current_price);
    if (sort_by === 'rating')     results.sort((a, b) => b.avg_rating - a.avg_rating);
    if (sort_by === 'discount')   results.sort((a, b) => b.discount_pct - a.discount_pct);
    if (sort_by === 'popularity') results.sort((a, b) => b.review_count - a.review_count);
    if (sort_by === 'created_at') results.sort((a, b) => b.views_last_24h - a.views_last_24h);
  }

  const total = results.length;
  const start = (page - 1) * page_size;
  return {
    items:       results.slice(start, start + page_size),
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size),
  };
}

/** getProduct — mirrors GET /api/products/:id */
export function getProduct(id) {
  return PRODUCTS.find(p => p.id === id || p.slug === id) || null;
}

/**
 * searchProducts — semantic search with scored results
 */
export function searchProducts(query, limit = 20) {
  if (!query.trim()) return [];
  return PRODUCTS
    .map(p => ({ product: p, score: score(p, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => ({
      ...x.product,
      match_pct: Math.round((x.score / (query.split(/\s+/).length)) * 100),
    }));
}

/** getRecommendations — products in same category, sorted by rating */
export function getRecommendations(productId, limit = 6) {
  const p = getProduct(productId);
  if (!p) return [];
  return PRODUCTS
    .filter(x => x.id !== productId && x.category === p.category)
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, limit);
}

/** getAllBrands — unique brand list */
export function getAllBrands() {
  return [...new Set(PRODUCTS.map(p => p.brand))].sort();
}

/** priceRange — { min, max } across all products */
export function priceRange() {
  const prices = PRODUCTS.map(p => p.current_price).filter(Boolean);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
