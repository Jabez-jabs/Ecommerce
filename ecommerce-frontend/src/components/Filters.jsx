export default function Filters({ categories, filters, onChange }) {
  const update = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <aside className="filters-panel glass">
      <h3 className="filters-title">Filters</h3>

      {/* Category */}
      <div className="filter-section">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={filters.category_id || ''}
          onChange={(e) => update('category_id', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <label className="form-label">Price Range</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            className="form-input"
            placeholder="Min"
            value={filters.min_price || ''}
            onChange={(e) => update('min_price', e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            className="form-input"
            placeholder="Max"
            value={filters.max_price || ''}
            onChange={(e) => update('max_price', e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Min Rating */}
      <div className="filter-section">
        <label className="form-label">Min Rating: {filters.min_rating || 0}★</label>
        <input
          type="range"
          min={0} max={5} step={0.5}
          value={filters.min_rating || 0}
          onChange={(e) => update('min_rating', parseFloat(e.target.value))}
          className="range-input"
        />
      </div>

      {/* Sort */}
      <div className="filter-section">
        <label className="form-label">Sort By</label>
        <select
          className="form-select"
          value={filters.sort_by || 'created_at'}
          onChange={(e) => update('sort_by', e.target.value)}
        >
          <option value="created_at">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="popularity">Most Popular</option>
        </select>
      </div>

      {/* Brand */}
      <div className="filter-section">
        <label className="form-label">Brand</label>
        <input
          type="text"
          className="form-input"
          placeholder="Search brand..."
          value={filters.brand || ''}
          onChange={(e) => update('brand', e.target.value)}
        />
      </div>

      <button className="btn btn-secondary btn-full" onClick={() => onChange({})}>
        Clear Filters
      </button>
    </aside>
  );
}
