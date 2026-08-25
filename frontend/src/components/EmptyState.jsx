const ART = {
  todo: (
    <>
      <rect className="float-part" x="24" y="18" width="48" height="60" rx="8" stroke="var(--line-strong)" strokeWidth="2.5" fill="var(--surface-2)" />
      <rect x="38" y="12" width="20" height="12" rx="4" stroke="var(--muted)" strokeWidth="2.5" fill="var(--surface)" />
      <path d="M34 40h28M34 50h20M34 60h24" stroke="var(--line-strong)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path className="draw-loop" d="M36 70l5 5 10-11" stroke="var(--accent-bright)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" />
    </>
  ),
  note: (
    <>
      <rect className="float-part" x="26" y="14" width="44" height="62" rx="7" stroke="var(--line-strong)" strokeWidth="2.5" fill="var(--surface-2)" />
      <path d="M35 30h26M35 40h26M35 50h16" stroke="var(--line-strong)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path className="draw-loop" d="M52 66l12-14 5 4-12 14-7 2z" stroke="var(--accent-bright)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" />
    </>
  ),
  calendar: (
    <>
      <rect className="float-part" x="18" y="22" width="60" height="54" rx="8" stroke="var(--line-strong)" strokeWidth="2.5" fill="var(--surface-2)" />
      <path d="M18 38h60" stroke="var(--line-strong)" strokeWidth="2.5" />
      <path d="M32 14v12M64 14v12" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="56" r="9" stroke="var(--accent-bright)" strokeWidth="2.5" fill="var(--accent-soft)" />
      <path className="draw-loop" d="M44.5 56l2.6 2.6L52 53.5" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" />
    </>
  ),
  canvas: (
    <>
      <rect className="float-part" x="16" y="20" width="64" height="50" rx="8" stroke="var(--line-strong)" strokeWidth="2.5" fill="var(--surface-2)" />
      <path className="draw-loop" d="M26 52c6-16 12-16 14-8s6 8 10-2 8-10 12-2" stroke="var(--accent-bright)" strokeWidth="2.5" strokeLinecap="round" fill="none" pathLength="1" />
      <path d="M58 62l10 10M64 58l10 10" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  search: (
    <>
      <circle className="float-part" cx="42" cy="42" r="18" stroke="var(--line-strong)" strokeWidth="3" fill="var(--surface-2)" />
      <path className="draw-loop" d="M55 55l13 13" stroke="var(--accent-bright)" strokeWidth="4" strokeLinecap="round" pathLength="1" />
      <path d="M34 42c1-5 4-8 9-9" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" fill="none" />
    </>
  ),
};

export default function EmptyState({ variant = "note", title, hint, action = null }) {
  return (
    <div className="empty-state">
      <svg className="empty-art" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        {ART[variant] || ART.note}
      </svg>
      {title && <h3>{title}</h3>}
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}
