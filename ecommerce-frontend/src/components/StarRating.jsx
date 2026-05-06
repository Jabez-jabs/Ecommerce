export default function StarRating({ rating = 0, max = 5, size = 14 }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = max - full - (half ? 1 : 0);

  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', fontSize: size }}>
      {Array.from({ length: full  }).map((_, i) => <span key={`f${i}`} style={{ color: '#f5a623' }}>★</span>)}
      {half && <span style={{ color: '#f5a623', opacity: 0.6 }}>★</span>}
      {Array.from({ length: empty }).map((_, i) => <span key={`e${i}`} style={{ color: '#2a3050' }}>★</span>)}
      <span style={{ fontSize: size * 0.85, color: 'var(--text-muted)', marginLeft: 4 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
