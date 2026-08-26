/* Hand-rolled charts — no chart library, keeps the bundle light and the
 * styling fully on-brand. Bars are CSS-animated; the donut is pure SVG. */

export function BarChart({ data, height = 150, accent = "var(--accent)", formatValue }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="barchart" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={d.label ?? i} className="bar-col" title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}>
          <span className="bar-val">{d.value > 0 ? (formatValue ? formatValue(d.value) : d.value) : ""}</span>
          <div
            className="bar-fill"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: d.color || accent,
              animationDelay: `${i * 0.045}s`,
            }}
          />
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ segments, size = 150, stroke = 22, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} role="img" aria-label="Donut chart">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="butt"
        />
        {total > 0 &&
          segments.map((s) => {
            const frac = s.value / total;
            const dash = `${c * frac} ${c * (1 - frac)}`;
            const offset = -c * acc;
            acc += frac;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="donut-seg"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
          })}
      </svg>
      <div className="donut-center">
        <strong>{centerLabel}</strong>
        {centerSub && <span>{centerSub}</span>}
      </div>
    </div>
  );
}

export function Legend({ items }) {
  return (
    <ul className="chart-legend">
      {items.map((it) => (
        <li key={it.label}>
          <span className="legend-swatch" style={{ background: it.color }} />
          {it.label}
          <em>{it.value}</em>
        </li>
      ))}
    </ul>
  );
}
