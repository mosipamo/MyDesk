export default function Logo({ size = 30 }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="8.5" stroke="#4fd6a6" strokeWidth="2" />
      <path
        className="draw-path"
        d="M8 21.5c3-6.5 5-9.5 7.5-9.5 3.5 0 1.5 9 5 9 1.8 0 3-2 4-4"
        stroke="#4fd6a6"
        strokeWidth="2.4"
        strokeLinecap="round"
        pathLength="1"
      />
    </svg>
  );
}
