import { useState, useEffect } from 'react';
import { TweakCtx, TWEAK_DEFAULTS, PALETTES, SURFACES, DENSITIES } from './context/TweakContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import BottomNav from './components/layout/BottomNav';
import TweaksPanel from './components/tweaks/TweaksPanel';
import Dashboard    from './screens/Dashboard';
import Transactions from './screens/Transactions';
import Budget       from './screens/Budget';
import Investments  from './screens/Investments';
import Goals        from './screens/Goals';
import Subscriptions from './screens/Subscriptions';
import CSVImport    from './screens/CSVImport';
import Reports      from './screens/Reports';

const SCREENS = {
  dashboard:     Dashboard,
  transactions:  Transactions,
  budget:        Budget,
  investments:   Investments,
  goals:         Goals,
  subscriptions: Subscriptions,
  import:        CSVImport,
  reports:       Reports,
};

const useBreakpoint = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { isMobile: w <= 768 };
};

export default function App() {
  const [active, setActive]     = useState('dashboard');
  const [showTweaks, setShowTweaks] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS);
  const { isMobile } = useBreakpoint();

  const setTweak = (key, value) => {
    setTweaksState((prev) => ({ ...prev, [key]: value }));
  };

  const navigate = (id) => {
    setActive(id);
    if (isMobile) setSidebarOpen(false);
  };

  // Host protocol for tweaks panel (claude.ai/design integration)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   setShowTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const closeTweaks = () => {
    setShowTweaks(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const pal  = PALETTES[tweaks.palette];
  const surf = SURFACES[tweaks.surface];
  const dens = DENSITIES[tweaks.density];
  const Screen = SCREENS[active] ?? Dashboard;

  return (
    <TweakCtx.Provider value={tweaks}>
      <div style={{
        display:    'flex',
        height:     '100%',
        width:      '100%',
        overflow:   'hidden',
        fontFamily: tweaks.density === 'analyst' ? "'Space Grotesk', sans-serif" : "'DM Sans', sans-serif",
        transition: 'all 0.3s ease',
        background: tweaks.surface === 'frosted'
          ? 'radial-gradient(ellipse at 20% 20%, #1a1040 0%, #0b0e18 60%, #0f1117 100%)'
          : '#0F1117',
      }}>

        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <Sidebar
          active={active}
          onNavigate={navigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} isMobile={isMobile} />

          {/* Screen content area — sets CSS vars for theming */}
          <div
            className="main-scroll-area"
            style={{
              flex:     1,
              overflow: 'hidden',
              '--card-bg':      surf.cardBg,
              '--card-border':  surf.border,
              '--card-radius':  surf.radius + 'px',
              '--card-blur':    surf.blur,
              '--card-shadow':  surf.shadow,
              '--card-pad':     dens.cardPad + 'px',
              '--content-pad':  dens.pad + 'px',
              '--content-gap':  dens.gap + 'px',
            }}
          >
            <Screen key={active + tweaks.surface + tweaks.density} onNavigate={navigate} />
          </div>
        </div>

        {/* Bottom nav (mobile) */}
        <BottomNav active={active} onNavigate={navigate} />

        {/* Tweaks panel */}
        {showTweaks && (
          <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={closeTweaks} />
        )}
      </div>
    </TweakCtx.Provider>
  );
}
