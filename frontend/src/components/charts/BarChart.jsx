import { useState } from 'react';
import { fmtK } from '../../utils/format';

export default function BarChart({ data, labels, color = '#22C55E', height = 100 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const w = 400, h = height;
  const pad = { t: 20, r: 8, b: 24, l: 40 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;

  // Support negative values (e.g. negative savings months)
  const maxV = Math.max(...data.map(Math.abs), 1) * 1.2;
  const barW = Math.min(28, (chartW / data.length) - 4);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height, display: 'block' }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {[0, 0.5, 1].map((f, i) => {
        const y = pad.t + chartH * (1 - f);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#2A2D3E" strokeWidth="1" />
            <text x={pad.l - 5} y={y + 3.5} fill="#6B7280" fontSize="9" textAnchor="end" fontFamily="DM Mono">
              {fmtK(Math.round(f * maxV))}
            </text>
          </g>
        );
      })}

      {data.map((v, i) => {
        const slotW    = chartW / data.length;
        const x        = pad.l + slotW * i + (slotW - barW) / 2;
        const bh       = Math.max((Math.abs(v) / maxV) * chartH, 1);
        const y        = pad.t + chartH - bh;
        const barColor = v < 0 ? '#EF4444' : color;
        const isHov    = hoverIdx === i;

        // Tooltip clamps to SVG right edge
        const tipW   = 64;
        const tipX   = Math.min(x + barW / 2 - tipW / 2, w - pad.r - tipW);
        const tipY   = Math.max(y - 26, pad.t - 18);

        return (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: 'pointer' }}>
            <rect
              x={x} y={y} width={barW} height={bh} rx="3"
              fill={barColor}
              opacity={hoverIdx === null || isHov ? 0.85 : 0.3}
              style={{
                transformBox:   'fill-box',
                transformOrigin: 'center bottom',
                animation: `barGrow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.07}s both`,
              }}
            />
            {isHov && (
              <g>
                <rect x={tipX} y={tipY} width={tipW} height={20} rx="4"
                  fill="#1A1D27" stroke="#2A2D3E" strokeWidth="1" />
                <text x={tipX + tipW / 2} y={tipY + 14}
                  fill={barColor} fontSize="9.5" textAnchor="middle"
                  fontFamily="DM Mono" fontWeight="600"
                >
                  {fmtK(v)}
                </text>
              </g>
            )}
            <text x={x + barW / 2} y={h - 5} fill="#6B7280" fontSize="9.5" textAnchor="middle" fontFamily="DM Sans">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
