import { useState, useId } from 'react';
import { fmtK } from '../../utils/format';

export default function AreaChart({
  data1, data2, labels,
  color1 = '#22C55E', color2 = '#3B82F6',
  height = 140,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const uid = useId().replace(/:/g, '');

  const w = 560, h = height;
  const pad = { t: 10, r: 10, b: 28, l: 44 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const n = data1.length;

  if (n === 0) return null;

  const allVals = [...data1, ...(data2 || [])];
  const maxV = (Math.max(...allVals) || 1) * 1.15;
  const xStep = n > 1 ? chartW / (n - 1) : 0;
  const yScale = (v) => chartH - (v / maxV) * chartH;

  const pts = (data) =>
    data.map((v, i) => `${pad.l + i * xStep},${pad.t + yScale(v)}`).join(' ');

  const areaPath = (data) => {
    const p = data.map((v, i) => [pad.l + i * xStep, pad.t + yScale(v)]);
    return (
      `M${p[0][0]},${p[0][1]} ` +
      p.slice(1).map(([x, y]) => `L${x},${y}`).join(' ') +
      ` L${p[p.length - 1][0]},${pad.t + chartH} L${p[0][0]},${pad.t + chartH} Z`
    );
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);

  const handleMouseMove = (e) => {
    if (n < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * w;
    if (svgX < pad.l - 20 || svgX > w - pad.r + 20) { setHoverIdx(null); return; }
    const idx = Math.max(0, Math.min(n - 1, Math.round((svgX - pad.l) / xStep)));
    setHoverIdx(idx);
  };

  // Tooltip position
  const hx = hoverIdx !== null ? pad.l + hoverIdx * xStep : 0;
  const tipW = 108, tipH = data2 ? 54 : 38;
  const tipX = hx + tipW + 16 > w ? hx - tipW - 8 : hx + 10;
  const tipY = pad.t + 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', height, display: 'block', cursor: n > 1 ? 'crosshair' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id={`${uid}g1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color1} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color1} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`${uid}g2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color2} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={`${uid}clip`}>
          <rect
            x={pad.l} y={0} width={chartW} height={h}
            style={{
              transformBox:    'fill-box',
              transformOrigin: 'left',
              animation:       'chartReveal 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          />
        </clipPath>
      </defs>

      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} y1={pad.t + yScale(v)} x2={w - pad.r} y2={pad.t + yScale(v)} stroke="#2A2D3E" strokeWidth="1" />
          <text x={pad.l - 6} y={pad.t + yScale(v) + 4} fill="#6B7280" fontSize="9" textAnchor="end" fontFamily="DM Mono">
            {fmtK(Math.round(v))}
          </text>
        </g>
      ))}

      <g clipPath={`url(#${uid}clip)`}>
        {data2 && <path d={areaPath(data2)} fill={`url(#${uid}g2)`} />}
        <path d={areaPath(data1)} fill={`url(#${uid}g1)`} />
        {data2 && (
          <polyline points={pts(data2)} fill="none" stroke={color2} strokeWidth="2" strokeLinejoin="round"
            opacity={hoverIdx !== null ? 0.5 : 1} />
        )}
        <polyline points={pts(data1)} fill="none" stroke={color1} strokeWidth="2.5" strokeLinejoin="round"
          opacity={hoverIdx !== null ? 0.5 : 1} />
      </g>

      {labels.map((l, i) => (
        <text key={i} x={pad.l + i * xStep} y={h - 6} fill="#6B7280" fontSize="9.5" textAnchor="middle" fontFamily="DM Sans">
          {l}
        </text>
      ))}

      {/* Hover overlay (captures mouse events across blank areas) */}
      {n > 1 && (
        <rect x={pad.l} y={pad.t} width={chartW} height={chartH} fill="transparent" />
      )}

      {/* Crosshair + tooltip */}
      {hoverIdx !== null && (
        <g>
          <line x1={hx} y1={pad.t} x2={hx} y2={pad.t + chartH}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={hx} cy={pad.t + yScale(data1[hoverIdx])} r="4"
            fill={color1} stroke="#1A1D27" strokeWidth="1.5" />
          {data2 && (
            <circle cx={hx} cy={pad.t + yScale(data2[hoverIdx])} r="4"
              fill={color2} stroke="#1A1D27" strokeWidth="1.5" />
          )}

          {/* Tooltip */}
          <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="5"
            fill="#1A1D27" stroke="#2A2D3E" strokeWidth="1" />
          <text x={tipX + 8} y={tipY + 13} fill="#6B7280" fontSize="9" fontFamily="DM Sans">
            {labels[hoverIdx]}
          </text>
          <circle cx={tipX + 12} cy={tipY + 25} r="3" fill={color1} />
          <text x={tipX + 20} y={tipY + 29} fill={color1} fontSize="10" fontWeight="600" fontFamily="DM Mono">
            {fmtK(data1[hoverIdx])}
          </text>
          {data2 && (
            <>
              <circle cx={tipX + 12} cy={tipY + 41} r="3" fill={color2} />
              <text x={tipX + 20} y={tipY + 45} fill={color2} fontSize="10" fontWeight="600" fontFamily="DM Mono">
                {fmtK(data2[hoverIdx])}
              </text>
            </>
          )}
        </g>
      )}
    </svg>
  );
}
