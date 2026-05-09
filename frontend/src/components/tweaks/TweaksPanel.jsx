import { PALETTES, DENSITIES, SURFACES } from '../../context/TweakContext';
import Icon from '../ui/Icon';

const densityOpts = [
  { key: 'focused',  label: 'Focused',  sub: 'Spacious, fewer cards' },
  { key: 'balanced', label: 'Balanced', sub: 'Default layout'        },
  { key: 'analyst',  label: 'Analyst',  sub: 'Dense, more data'      },
];

const surfaceOpts = [
  { key: 'flat',     label: 'Flat',     sub: 'Solid dark cards'   },
  { key: 'frosted',  label: 'Frosted',  sub: 'Glass blur effect'  },
  { key: 'outlined', label: 'Outlined', sub: 'Transparent borders' },
];

const sectionLabel = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#6B7280',
  marginBottom: 10, display: 'block',
};

function DensityIcon({ optKey, palette }) {
  const pal = PALETTES[palette];
  const c1 = pal.hex;
  const c2 = pal.hex + '88';
  const c3 = pal.hex + '44';
  if (optKey === 'focused') return (
    <svg width="28" height="18" viewBox="0 0 28 18">
      <rect x="0" y="2" width="28" height="6" rx="2" fill={c1}/>
      <rect x="0" y="11" width="18" height="5" rx="2" fill={c2}/>
    </svg>
  );
  if (optKey === 'balanced') return (
    <svg width="28" height="18" viewBox="0 0 28 18">
      <rect x="0" y="0" width="28" height="4" rx="1.5" fill={c1}/>
      <rect x="0" y="6" width="28" height="4" rx="1.5" fill={c2}/>
      <rect x="0" y="12" width="20" height="4" rx="1.5" fill={c3}/>
    </svg>
  );
  return (
    <svg width="28" height="18" viewBox="0 0 28 18">
      <rect x="0" y="0"    width="28" height="3" rx="1" fill={c1}/>
      <rect x="0" y="4.5"  width="28" height="3" rx="1" fill={pal.hex + '99'}/>
      <rect x="0" y="9"    width="28" height="3" rx="1" fill={c2}/>
      <rect x="0" y="13.5" width="20" height="3" rx="1" fill={c3}/>
    </svg>
  );
}

export default function TweaksPanel({ tweaks, setTweak, onClose }) {
  const { palette, density, surface } = tweaks;
  const isMobilePanel = window.innerWidth <= 600;

  const panelStyle = {
    position:   'fixed',
    bottom:     isMobilePanel ? 68 : 24,
    right:      isMobilePanel ? 8  : 24,
    left:       isMobilePanel ? 8  : 'auto',
    zIndex:     9999,
    width:      isMobilePanel ? 'auto' : 280,
    background: '#1A1D27',
    border:     '1px solid #2A2D3E',
    borderRadius: 18,
    padding:    '20px',
    boxShadow:  '0 16px 48px rgba(0,0,0,0.6)',
    fontFamily: 'DM Sans',
    color:      '#E8EAF0',
  };

  const paletteSwatches = Object.entries(PALETTES).map(([key, p]) => ({ key, hex: p.hex, name: p.name }));

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Tweaks</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      {/* 1. Accent Palette */}
      <div style={{ marginBottom: 22 }}>
        <span style={sectionLabel}>Accent Palette</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {paletteSwatches.map((sw) => (
            <button
              key={sw.key}
              onClick={() => setTweak('palette', sw.key)}
              title={sw.name}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 10,
                border:     palette === sw.key ? `2px solid ${sw.hex}` : '2px solid transparent',
                background: sw.hex, cursor: 'pointer', position: 'relative',
                boxShadow:  palette === sw.key ? `0 0 0 3px ${sw.hex}33` : 'none',
                transition: 'all 0.15s',
              }}
            >
              {palette === sw.key && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={12} color="#000" />
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: PALETTES[palette].hex, fontWeight: 600 }}>
          {PALETTES[palette].name}
        </div>
      </div>

      {/* 2. Data Density */}
      <div style={{ marginBottom: 22 }}>
        <span style={sectionLabel}>Data Density</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {densityOpts.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTweak('density', opt.key)}
              style={{
                display:    'flex', alignItems: 'center', gap: 12,
                background: density === opt.key ? PALETTES[palette].hex + '18' : '#ffffff08',
                border:     density === opt.key ? `1px solid ${PALETTES[palette].hex}44` : '1px solid transparent',
                borderRadius: 10, padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 28, flexShrink: 0 }}>
                <DensityIcon optKey={opt.key} palette={palette} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: density === opt.key ? PALETTES[palette].hex : '#E8EAF0' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Surface Style */}
      <div>
        <span style={sectionLabel}>Surface Style</span>
        <div style={{ display: 'flex', gap: 7 }}>
          {surfaceOpts.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTweak('surface', opt.key)}
              style={{
                flex: 1, padding: '10px 6px', borderRadius: 11, cursor: 'pointer', textAlign: 'center',
                background: surface === opt.key ? PALETTES[palette].hex + '18' : '#ffffff08',
                border:     surface === opt.key ? `1px solid ${PALETTES[palette].hex}55` : '1px solid #2A2D3E',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ marginBottom: 7, display: 'flex', justifyContent: 'center' }}>
                {opt.key === 'flat' && (
                  <div style={{ width: 36, height: 24, borderRadius: 5, background: '#1A1D27', border: '1px solid #2A2D3E' }} />
                )}
                {opt.key === 'frosted' && (
                  <div style={{ width: 36, height: 24, borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} />
                )}
                {opt.key === 'outlined' && (
                  <div style={{ width: 36, height: 24, borderRadius: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} />
                )}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: surface === opt.key ? PALETTES[palette].hex : '#9CA3AF' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
