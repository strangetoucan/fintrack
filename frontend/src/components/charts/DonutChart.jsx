import { useState } from 'react';

export default function DonutChart({ segments, size = 120, thickness = 22, label, sublabel }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const r  = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const gap  = circ - dash;
    const arc  = { dash, gap, offset, color: seg.color, value: seg.value, name: seg.name };
    offset += dash + 1.5;
    return arc;
  });

  const active = hoverIdx !== null ? arcs[hoverIdx] : null;
  const pct    = active ? ((active.value / total) * 100).toFixed(1) + '%' : null;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2D3E" strokeWidth={thickness} />

      {arcs.map((arc, i) => {
        const isHov = hoverIdx === i;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={isHov ? thickness + 5 : thickness}
            strokeDasharray={`${Math.max(0, arc.dash - 1.5)} ${arc.gap + 1.5}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              cursor: 'pointer',
              transition: 'stroke-width 0.15s',
              animation: `arcIn 0.4s ease ${i * 0.1}s both`,
            }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        );
      })}

      {/* Center: show hovered segment info or default label */}
      <text
        x={cx} y={cy - 2}
        textAnchor="middle"
        fill={active ? active.color : '#E8EAF0'}
        fontSize={active ? '11' : '12'}
        fontWeight="600"
        fontFamily="DM Mono"
      >
        {active ? pct : label}
      </text>
      <text
        x={cx} y={cy + 13}
        textAnchor="middle"
        fill={active ? active.color : '#6B7280'}
        fontSize="9"
        fontFamily="DM Sans"
      >
        {active ? (active.name ?? sublabel) : sublabel}
      </text>
    </svg>
  );
}
