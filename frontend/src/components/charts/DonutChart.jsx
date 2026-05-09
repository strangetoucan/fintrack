export default function DonutChart({ segments, size = 120, thickness = 22, label, sublabel }) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const gap  = circ - dash;
    const arc  = { dash, gap, offset, color: seg.color };
    offset += dash + 1.5;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2D3E" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${Math.max(0, arc.dash - 1.5)} ${arc.gap + 1.5}`}
          strokeDashoffset={-arc.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
      {label && (
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#E8EAF0" fontSize="12" fontWeight="600" fontFamily="DM Mono">
          {label}
        </text>
      )}
      {sublabel && (
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#6B7280" fontSize="9" fontFamily="DM Sans">
          {sublabel}
        </text>
      )}
    </svg>
  );
}
