/** Deterministic placeholder "photo" — a stylized building on a tinted gradient. */
export function PropertyPhoto({
  hue,
  className = "",
}: {
  hue: number;
  className?: string;
}) {
  const sky = `hsl(${hue}, 22%, 88%)`;
  const skyLow = `hsl(${hue}, 26%, 78%)`;
  const building = `hsl(${hue}, 18%, 42%)`;
  const buildingLight = `hsl(${hue}, 16%, 55%)`;
  const window_ = `hsl(${hue}, 40%, 90%)`;

  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Property photo"
    >
      <defs>
        <linearGradient id={`sky-${hue}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky} />
          <stop offset="100%" stopColor={skyLow} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#sky-${hue})`} />
      <rect x="18" y="38" width="52" height="82" fill={building} rx="1" />
      <rect x="78" y="54" width="40" height="66" fill={buildingLight} rx="1" />
      <rect x="124" y="66" width="26" height="54" fill={building} rx="1" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`a${r}${c}`}
            x={25 + c * 14}
            y={46 + r * 17}
            width="8"
            height="10"
            fill={window_}
            opacity={0.9}
            rx="0.5"
          />
        ))
      )}
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => (
          <rect
            key={`b${r}${c}`}
            x={85 + c * 16}
            y={62 + r * 17}
            width="9"
            height="10"
            fill={window_}
            opacity={0.85}
            rx="0.5"
          />
        ))
      )}
      {[0, 1].map((r) => (
        <rect
          key={`c${r}`}
          x={131}
          y={74 + r * 18}
          width="12"
          height="10"
          fill={window_}
          opacity={0.8}
          rx="0.5"
        />
      ))}
      <rect x="0" y="112" width="160" height="8" fill={`hsl(${hue}, 14%, 60%)`} />
    </svg>
  );
}
