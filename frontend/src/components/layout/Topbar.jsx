import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../ui/Icon';
import { useTweakCtx, PALETTES, SURFACES } from '../../context/TweakContext';
import { globalSearch } from '../../api/search';
import { fmt } from '../../utils/format';

const TYPE_LABEL = {
  transaction:  'Transaction',
  investment:   'Investment',
  goal:         'Goal',
  subscription: 'Subscription',
  account:      'Account',
};

const TYPE_COLOR = {
  transaction:  '#6B7280',
  investment:   '#22C55E',
  goal:         '#F59E0B',
  subscription: '#A78BFA',
  account:      '#3B82F6',
};

function groupResults(results) {
  const groups = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return groups;
}

export default function Topbar({ onMenuClick, onNavigate, isMobile }) {
  const { palette, surface } = useTweakCtx();
  const pal  = PALETTES[palette];
  const surf = SURFACES[surface];

  const [query,   setQuery  ] = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen   ] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((result) => {
    onNavigate?.(result.screen);
    setQuery('');
    setOpen(false);
    setResults([]);
  }, [onNavigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const groups = groupResults(results);
  const typeOrder = ['transaction', 'investment', 'goal', 'subscription', 'account'];

  return (
    <div style={{
      height: 52, borderBottom: surf.border,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', gap: 12, background: surf.sideBg,
      backdropFilter: surf.blur, WebkitBackdropFilter: surf.blur,
      flexShrink: 0, transition: 'all 0.3s ease', position: 'relative', zIndex: 200,
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

      {/* Right — search + icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Search container */}
        <div ref={containerRef} style={{ position: 'relative' }}>
          <div
            className="topbar-search"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', border: surf.border,
              borderRadius: 9, padding: '6px 14px',
            }}
          >
            <Icon name="search" size={14} color={loading ? pal.hex : '#6B7280'} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search everything…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#E8EAF0', fontSize: 13, width: 160, fontFamily: 'inherit',
              }}
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, fontSize: 16, lineHeight: 1 }}
              >×</button>
            )}
          </div>

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 360, background: '#1A1D27',
              border: '1px solid #2A2D3E', borderRadius: 14,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              zIndex: 999, overflow: 'hidden',
            }}>
              {typeOrder.filter((t) => groups[t]).map((type) => (
                <div key={type}>
                  {/* Group header */}
                  <div style={{
                    padding: '8px 14px 4px',
                    fontSize: 10.5, fontWeight: 700,
                    color: TYPE_COLOR[type],
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: '#13161F',
                  }}>
                    {TYPE_LABEL[type]}s
                  </div>

                  {groups[type].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '10px 14px', border: 'none',
                        background: 'transparent', cursor: 'pointer', textAlign: 'left',
                        borderBottom: '1px solid #1E2130',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1F2333'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#E8EAF0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 1 }}>{r.sub}</div>
                      </div>
                      {r.amount != null && (
                        <span style={{
                          fontFamily: 'DM Mono', fontSize: 12.5, fontWeight: 700, flexShrink: 0, marginLeft: 12,
                          color: type === 'transaction'
                            ? (r.tx_type === 'income' ? pal.hex : '#EF4444')
                            : TYPE_COLOR[type],
                        }}>
                          {type === 'transaction' && r.tx_type === 'income' ? '+' : ''}{fmt(r.amount)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}

              <div style={{ padding: '8px 14px', fontSize: 11.5, color: '#374151', textAlign: 'center' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} — click to navigate
              </div>
            </div>
          )}

          {open && query && results.length === 0 && !loading && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 260, background: '#1A1D27', border: '1px solid #2A2D3E',
              borderRadius: 14, padding: '16px', textAlign: 'center',
              color: '#6B7280', fontSize: 13, boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}>
              No results for "{query}"
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate?.('settings')}
          title="Settings"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
        >
          <Icon name="settings" size={18} color="#6B7280" />
        </button>
      </div>
    </div>
  );
}
