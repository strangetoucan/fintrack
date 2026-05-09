import Icon from '../ui/Icon';
import { useTweakCtx, PALETTES, SURFACES } from '../../context/TweakContext';

export default function Topbar({ onMenuClick, isMobile }) {
  const { palette, surface } = useTweakCtx();
  const pal  = PALETTES[palette];
  const surf = SURFACES[surface];

  return (
    <div style={{
      height:               52,
      borderBottom:         surf.border,
      display:              'flex',
      alignItems:           'center',
      justifyContent:       'space-between',
      padding:              '0 16px',
      gap:                  12,
      background:           surf.sideBg,
      backdropFilter:       surf.blur,
      WebkitBackdropFilter: surf.blur,
      flexShrink:           0,
      transition:           'all 0.3s ease',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="hamburger" onClick={onMenuClick}>
          <Icon name="menu" size={20} />
        </button>
        {isMobile && (
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: pal.hex }}>₹</span> FinTrack
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="topbar-search"
          style={{
            display:     'flex', alignItems: 'center', gap: 8,
            background:  'rgba(255,255,255,0.04)',
            border:      surf.border,
            borderRadius: 9, padding: '6px 14px',
          }}
        >
          <Icon name="search" size={14} color="#6B7280" />
          <input
            placeholder="Search…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#E8EAF0', fontSize: 13, width: 140, fontFamily: 'inherit',
            }}
          />
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
          <Icon name="bell" size={18} color="#6B7280" />
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
          <Icon name="settings" size={18} color="#6B7280" />
        </button>
      </div>
    </div>
  );
}
