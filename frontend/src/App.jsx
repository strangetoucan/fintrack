import { useState, useEffect } from 'react';
import { TweakCtx, TWEAK_DEFAULTS, PALETTES, SURFACES, DENSITIES } from './context/TweakContext';
import { SettingsProvider, useSettingsCtx } from './context/SettingsContext';
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
import Accounts     from './screens/Accounts';
import Settings     from './screens/Settings';

const SCREENS = {
  dashboard:     Dashboard,
  transactions:  Transactions,
  budget:        Budget,
  investments:   Investments,
  goals:         Goals,
  subscriptions: Subscriptions,
  accounts:      Accounts,
  import:        CSVImport,
  reports:       Reports,
  settings:      Settings,
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

// Inner component — lives inside SettingsProvider so it can consume the context
function AppContent() {
  const { settings, updateSettings } = useSettingsCtx();
  const { isMobile } = useBreakpoint();

  const [active,      setActive     ] = useState('dashboard');
  const [showTweaks,  setShowTweaks ] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tweaks initialise from settings (which itself starts from localStorage)
  const [tweaks, setTweaksState] = useState({
    palette: settings.palette ?? TWEAK_DEFAULTS.palette,
    surface: settings.surface ?? TWEAK_DEFAULTS.surface,
    density: settings.density ?? TWEAK_DEFAULTS.density,
  });

  // When DB-loaded settings arrive they override the local tweaks
  useEffect(() => {
    setTweaksState({
      palette: settings.palette ?? TWEAK_DEFAULTS.palette,
      surface: settings.surface ?? TWEAK_DEFAULTS.surface,
      density: settings.density ?? TWEAK_DEFAULTS.density,
    });
  }, [settings.palette, settings.surface, settings.density]);

  const setTweak = (key, value) => {
    setTweaksState((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value }); // persists to DB + localStorage
  };

  const navigate = (id) => {
    setActive(id);
    if (isMobile) setSidebarOpen(false);
  };

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
    <TweakCtx.Provider value={{ ...tweaks, setTweak }}>
      <div style={{
        display: 'flex', height: '100%', width: '100%', overflow: 'hidden',
        fontFamily: tweaks.density === 'analyst' ? "'Space Grotesk', sans-serif" : "'DM Sans', sans-serif",
        transition: 'all 0.3s ease',
        background: tweaks.surface === 'frosted'
          ? 'radial-gradient(ellipse at 20% 20%, #1a1040 0%, #0b0e18 60%, #0f1117 100%)'
          : '#0F1117',
      }}>
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar
          active={active}
          onNavigate={navigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} onNavigate={navigate} isMobile={isMobile} />

          <div
            className="main-scroll-area"
            style={{
              flex: 1, overflow: 'hidden',
              '--card-bg':     surf.cardBg,
              '--card-border': surf.border,
              '--card-radius': surf.radius + 'px',
              '--card-blur':   surf.blur,
              '--card-shadow': surf.shadow,
              '--card-pad':    dens.cardPad + 'px',
              '--content-pad': dens.pad + 'px',
              '--content-gap': dens.gap + 'px',
            }}
          >
            <Screen key={active + tweaks.surface + tweaks.density} onNavigate={navigate} />
          </div>
        </div>

        <BottomNav active={active} onNavigate={navigate} />

        {showTweaks && (
          <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={closeTweaks} />
        )}
      </div>
    </TweakCtx.Provider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
