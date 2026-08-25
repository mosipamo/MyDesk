export default function ProgressRing({ value, max = 100, size = 58, stroke = 5, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <div className="progress-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-bright)" />
            <stop offset="100%" stopColor="var(--accent-dark)" />
          </linearGradient>
        </defs>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="meter"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="ring-label">{Math.round(pct * 100)}%</span>
    </div>
  );
}
