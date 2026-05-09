import { fmtK } from '../../utils/format';

export default function BarChart({ data, labels, color = '#22C55E', height = 100 }) {
  const w = 400, h = height;
  const pad = { t: 8, r: 8, b: 24, l: 40 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const maxV = Math.max(...data) * 1.1;
  const barW = Math.min(28, (chartW / data.length) - 4);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
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
        const x  = pad.l + (chartW / data.length) * i + (chartW / data.length - barW) / 2;
        const bh = (v / maxV) * chartH;
        const y  = pad.t + chartH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={h - 6} fill="#6B7280" fontSize="9.5" textAnchor="middle" fontFamily="DM Sans">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
