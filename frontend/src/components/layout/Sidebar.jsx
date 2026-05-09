import Icon from '../ui/Icon';
import { useTweakCtx, PALETTES, SURFACES } from '../../context/TweakContext';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'dashboard'    },
  { id: 'transactions', label: 'Transactions', icon: 'transactions' },
  { id: 'budget',       label: 'Budget',       icon: 'budget'       },
  { id: 'investments',  label: 'Investments',  icon: 'investments'  },
  { id: 'goals',        label: 'Goals & EMIs', icon: 'goals'        },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { id: 'import',       label: 'CSV Import',   icon: 'import'       },
  { id: 'reports',      label: 'Reports',      icon: 'reports'      },
];

export { NAV };

export default function Sidebar({ active, onNavigate, isOpen, onClose, isMobile }) {
  const { palette, density, surface } = useTweakCtx();
  const pal  = PALETTES[palette];
  const surf = SURFACES[surface];

  return (
    <div
      className={`sidebar${isOpen ? ' open' : ''}`}
      style={{
        width:              220,
        flexShrink:         0,
        background:         surf.sideBg,
        backdropFilter:     surf.blur,
        WebkitBackdropFilter: surf.blur,
        borderRight:        surf.border,
        display:            'flex',
        flexDirection:      'column',
        padding:            `20px ${density === 'analyst' ? '10px' : '12px'}`,
        transition:         'all 0.3s ease',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '4px 12px 20px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: '#E8EAF0' }}>
            <span style={{ color: pal.hex }}>₹</span> FinTrack
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Personal Finance</div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, padding: '2px 6px' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: density === 'analyst' ? 1 : 3 }}>
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         12,
                padding:     density === 'analyst' ? '8px 12px' : '10px 14px',
                borderRadius: surf.radius > 14 ? 12 : 10,
                border:      'none',
                cursor:      'pointer',
                fontFamily:  'inherit',
                fontSize:    density === 'analyst' ? 13 : 13.5,
                fontWeight:  isActive ? 600 : 400,
                background:  isActive ? pal.hex + '18' : 'transparent',
                color:       isActive ? pal.hex : '#9CA3AF',
                textAlign:   'left',
                transition:  'all 0.15s',
              }}
            >
              <Icon name={n.icon} size={17} color={isActive ? pal.hex : '#6B7280'} />
              {n.label}
              {isActive && (
                <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: 99, background: pal.hex }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User avatar */}
      <div style={{ borderTop: surf.border, paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
          <div style={{
            width:      32, height: 32, borderRadius: 99,
            background: `linear-gradient(135deg, ${pal.hex}, ${pal.dark})`,
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            fontSize:   13, fontWeight: 700, color: '#000', flexShrink: 0,
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>My Account</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Personal</div>
          </div>
        </div>
      </div>
    </div>
  );
}
