import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listProducts, CATEGORIES, getAllBrands, priceRange } from '../data/staticData';
import ProductCard from '../components/ProductCard';

const SORT_OPTIONS = [
  { value: 'popularity',  label: 'Most Popular' },
  { value: 'rating',      label: 'Top Rated' },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'price_desc',  label: 'Price: High → Low' },
  { value: 'discount',    label: 'Best Discount' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');

  // Filters from URL
  const category_id = searchParams.get('category_id') || '';
  const brand       = searchParams.get('brand')       || '';
  const sort_by     = searchParams.get('sort_by')     || 'popularity';
  const min_price   = searchParams.get('min_price')   || '';
  const max_price   = searchParams.get('max_price')   || '';
  const min_rating  = searchParams.get('min_rating')  || '';
  const q           = searchParams.get('q')           || '';
  const page        = parseInt(searchParams.get('page') || '1', 10);
  const PAGE_SIZE   = 24;

  // Sync search input with URL
  useEffect(() => { setSearchInput(q); }, [q]);

  const { min: priceMin, max: priceMax } = useMemo(() => priceRange(), []);
  const brands = useMemo(() => getAllBrands(), []);

  const result = useMemo(() => listProducts({
    category_id, brand, sort_by, min_price, max_price, min_rating, page, page_size: PAGE_SIZE, q,
  }), [category_id, brand, sort_by, min_price, max_price, min_rating, page, q]);

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };
  const setPage = (n) => {
    const p = new URLSearchParams(searchParams);
    p.set('page', n);
    setSearchParams(p);
  };
  const clearFilters = () => setSearchParams({});

  const hasFilters = category_id || brand || min_price || max_price || min_rating || q;

  const handleSearch = (e) => {
    e.preventDefault();
    setParam('q', searchInput.trim());
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ paddingBottom: 16 }}>
          <h1>{q ? `Results for "${q}"` : category_id ? CATEGORIES.find(c => c.id === category_id)?.name || 'Products' : 'All Products'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {result.total} products{category_id ? ` in category` : ''}
          </p>
        </div>

        {/* ── Top search bar ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Search product name, brand, category..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">🔍 Search</button>
          {hasFilters && (
            <button type="button" className="btn btn-secondary" onClick={clearFilters}>✕ Clear</button>
          )}
        </form>

        <div className="products-layout">
          {/* ── Filter Sidebar ──────────────────────────────────────────────── */}
          <aside className="filters-panel glass">
            <p className="filters-title">Filters</p>

            {/* Sort */}
            <div className="filter-section">
              <label className="form-label">Sort By</label>
              <select className="form-select" value={sort_by} onChange={e => setParam('sort_by', e.target.value)}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="filter-section">
              <label className="form-label">Category</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="filter-radio">
                  <input type="radio" name="cat" checked={!category_id} onChange={() => setParam('category_id', '')} />
                  <span>All Categories</span>
                </label>
                {CATEGORIES.map(c => (
                  <label key={c.id} className="filter-radio">
                    <input type="radio" name="cat" checked={category_id === c.id} onChange={() => setParam('category_id', c.id)} />
                    <span>{c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({c.count})</span></span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="filter-section">
              <label className="form-label">
                Price Range
                <span style={{ color: 'var(--teal)', marginLeft: 6 }}>
                  £{Number(min_price || priceMin).toFixed(2)} – £{Number(max_price || priceMax).toFixed(2)}
                </span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input" type="number" placeholder="Min" min={priceMin} max={priceMax} step="0.01"
                  value={min_price} onChange={e => setParam('min_price', e.target.value)}
                  style={{ width: '50%' }}
                />
                <input
                  className="form-input" type="number" placeholder="Max" min={priceMin} max={priceMax} step="0.01"
                  value={max_price} onChange={e => setParam('max_price', e.target.value)}
                  style={{ width: '50%' }}
                />
              </div>
            </div>

            {/* Rating */}
            <div className="filter-section">
              <label className="form-label">Min Rating</label>
              <select className="form-select" value={min_rating} onChange={e => setParam('min_rating', e.target.value)}>
                <option value="">Any Rating</option>
                {[4, 3.5, 3].map(r => (
                  <option key={r} value={r}>{'★'.repeat(Math.floor(r))} {r}+</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="filter-section">
              <label className="form-label">Brand</label>
              <select className="form-select" value={brand} onChange={e => setParam('brand', e.target.value)}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </aside>

          {/* ── Product Grid ──────────────────────────────────────────────────── */}
          <div className="products-main">
            {result.items.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '3rem' }}>🔍</span>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search query.</p>
                <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
              </div>
            ) : (
              <div className="grid-3">
                {result.items.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            {result.total_pages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >← Prev</button>
                <span className="page-indicator">
                  Page {page} of {result.total_pages} &nbsp;·&nbsp; {result.total} products
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= result.total_pages}
                  onClick={() => setPage(page + 1)}
                >Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
