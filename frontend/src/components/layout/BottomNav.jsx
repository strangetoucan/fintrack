import Icon from '../ui/Icon';
import { useTweakCtx, PALETTES, SURFACES } from '../../context/TweakContext';

const BOTTOM_NAV = [
  { id: 'dashboard',    label: 'Home',    icon: 'dashboard'    },
  { id: 'transactions', label: 'Txns',    icon: 'transactions' },
  { id: 'budget',       label: 'Budget',  icon: 'budget'       },
  { id: 'investments',  label: 'Invest',  icon: 'investments'  },
  { id: 'reports',      label: 'Reports', icon: 'reports'      },
];

export default function BottomNav({ active, onNavigate }) {
  const { palette, surface } = useTweakCtx();
  const pal  = PALETTES[palette];
  const surf = SURFACES[surface];

  return (
    <nav
      className="bottom-nav"
      style={{
        background:           surf.sideBg,
        backdropFilter:       surf.blur,
        WebkitBackdropFilter: surf.blur,
        borderTop:            surf.border,
      }}
    >
      {BOTTOM_NAV.map((n) => {
        const isActive = active === n.id;
        return (
          <button
            key={n.id}
            onClick={() => onNavigate(n.id)}
            style={{
              flex:        1,
              display:     'flex',
              flexDirection: 'column',
              alignItems:  'center',
              justifyContent: 'center',
              gap:         3,
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              color:       isActive ? pal.hex : '#6B7280',
              fontFamily:  'inherit',
              fontSize:    10,
              fontWeight:  isActive ? 600 : 400,
              transition:  'color 0.15s',
            }}
          >
            <Icon name={n.icon} size={20} color={isActive ? pal.hex : '#6B7280'} />
            {n.label}
          </button>
        );
      })}
    </nav>
  );
}
