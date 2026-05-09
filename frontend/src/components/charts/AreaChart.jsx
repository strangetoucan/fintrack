import { fmtK } from '../../utils/format';

export default function AreaChart({
  data1, data2, labels,
  color1 = '#22C55E', color2 = '#3B82F6',
  height = 140,
}) {
  const w = 560, h = height;
  const pad = { t: 10, r: 10, b: 28, l: 44 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const allVals = [...data1, ...(data2 || [])];
  const maxV = Math.max(...allVals) * 1.15;
  const xStep = chartW / (data1.length - 1);
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

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color1} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color1} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color2} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={pad.l} y1={pad.t + yScale(v)}
            x2={w - pad.r} y2={pad.t + yScale(v)}
            stroke="#2A2D3E" strokeWidth="1"
          />
          <text
            x={pad.l - 6} y={pad.t + yScale(v) + 4}
            fill="#6B7280" fontSize="9" textAnchor="end" fontFamily="DM Mono"
          >
            {fmtK(Math.round(v))}
          </text>
        </g>
      ))}

      {data2 && <path d={areaPath(data2)} fill="url(#ag2)" />}
      <path d={areaPath(data1)} fill="url(#ag1)" />
      {data2 && (
        <polyline
          points={pts(data2)} fill="none"
          stroke={color2} strokeWidth="2" strokeLinejoin="round"
        />
      )}
      <polyline
        points={pts(data1)} fill="none"
        stroke={color1} strokeWidth="2.5" strokeLinejoin="round"
      />

      {labels.map((l, i) => (
        <text
          key={i}
          x={pad.l + i * xStep} y={h - 6}
          fill="#6B7280" fontSize="9.5" textAnchor="middle" fontFamily="DM Sans"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
