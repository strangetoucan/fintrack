import { useState } from 'react';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import { useSettingsCtx } from '../context/SettingsContext';
import { useTweakCtx, PALETTES, SURFACES, DENSITIES } from '../context/TweakContext';
import { fetchTransactions } from '../api/transactions';
import { fetchInvestments } from '../api/investments';
import { fetchBudget } from '../api/budget';
import { fetchGoals, fetchEmis } from '../api/goals';
import { fetchSubscriptions } from '../api/subscriptions';
import { fetchAccounts } from '../api/accounts';
import { fetchRecurring } from '../api/recurring';
import { apiFetch } from '../api/client';

const Section = ({ title, children }) => (
  <Card>
    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: '#E8EAF0' }}>{title}</div>
    {children}
  </Card>
);

const Row = ({ label, sub, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1E2130' }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sub}</div>}
    </div>
    <div>{children}</div>
  </div>
);

async function exportAllData() {
  const [txns, invs, budget, goals, emis, subs, accounts, recurring] = await Promise.all([
    fetchTransactions({ limit: 500 }),
    fetchInvestments(),
    fetchBudget(),
    fetchGoals(),
    fetchEmis(),
    fetchSubscriptions(),
    fetchAccounts(),
    fetchRecurring(),
  ]);
  const payload = {
    exportedAt:    new Date().toISOString(),
    transactions:  txns,
    investments:   invs,
    budget,
    goals,
    emis,
    subscriptions: subs,
    accounts,
    recurring,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fintrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { settings, updateSettings }  = useSettingsCtx();
  const { palette, surface, density, setTweak } = useTweakCtx();
  const [nameInput,   setNameInput  ] = useState(settings.userName);
  const [nameSaved,   setNameSaved  ] = useState(false);
  const [exporting,   setExporting  ] = useState(false);
  const [resetting,   setResetting  ] = useState(false);
  const [resetPhase,  setResetPhase ] = useState('idle'); // idle | confirm | done

  const saveName = () => {
    updateSettings({ userName: nameInput.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportAllData(); } catch { /* noop */ }
    setExporting(false);
  };

  const handleReset = async () => {
    if (resetPhase === 'idle') { setResetPhase('confirm'); return; }
    setResetting(true);
    try {
      await apiFetch('/reset', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_ALL_DATA' }) });
      setResetPhase('done');
    } catch { /* noop */ }
    setResetting(false);
  };

  const inputStyle = {
    background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 9,
    padding: '9px 14px', color: '#E8EAF0', fontSize: 13.5,
    fontFamily: 'DM Sans', width: 220, boxSizing: 'border-box',
  };

  const btnStyle = (bg, color = '#000') => ({
    padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
    background: bg, color, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
  });

  return (
    <div
      className="fade-in"
      style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
    >
      {/* Header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Settings</div>
        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Preferences, appearance, and data management</div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <Row label="Your name" sub="Used in the dashboard greeting">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              placeholder="e.g. Tushar"
              style={inputStyle}
            />
            <button onClick={saveName} style={btnStyle('#22C55E')}>
              {nameSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </Row>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Accent colour" sub="Primary colour used across the app">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(PALETTES).map(([key, pal]) => (
              <button
                key={key}
                onClick={() => setTweak('palette', key)}
                title={pal.name}
                style={{
                  width: 28, height: 28, borderRadius: 99, background: pal.hex,
                  border: 'none', cursor: 'pointer',
                  outline: palette === key ? '2px solid #fff' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </Row>
        <Row label="Surface style" sub="Card and background appearance">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(SURFACES).map((key) => (
              <button
                key={key}
                onClick={() => setTweak('surface', key)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #2A2D3E',
                  cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                  background: surface === key ? '#E8EAF0' : '#1F2333',
                  color:      surface === key ? '#0F1117'  : '#9CA3AF',
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Density" sub="Information density across screens">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(DENSITIES).map((key) => (
              <button
                key={key}
                onClick={() => setTweak('density', key)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #2A2D3E',
                  cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                  background: density === key ? '#E8EAF0' : '#1F2333',
                  color:      density === key ? '#0F1117'  : '#9CA3AF',
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Regional */}
      <Section title="Regional">
        <Row label="Financial year" sub="Affects year grouping in Reports">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'calendar', label: 'Jan – Dec' },
              { key: 'fiscal',   label: 'Apr – Mar (FY)' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => updateSettings({ financialYear: key })}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #2A2D3E',
                  cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                  background: settings.financialYear === key ? '#E8EAF0' : '#1F2333',
                  color:      settings.financialYear === key ? '#0F1117'  : '#9CA3AF',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Data */}
      <Section title="Data Management">
        <Row label="Export all data" sub="Download a full JSON backup of all records">
          <button onClick={handleExport} disabled={exporting} style={btnStyle('#3B82F6', '#fff')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="import" size={13} color="#fff" />
              {exporting ? 'Exporting…' : 'Export JSON'}
            </div>
          </button>
        </Row>
      </Section>

      {/* Danger zone */}
      <Card style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: '#EF4444' }}>Danger Zone</div>
        <Row
          label="Reset all data"
          sub="Permanently deletes every transaction, investment, goal, and account. Cannot be undone."
        >
          {resetPhase === 'done' ? (
            <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>✓ All data cleared</span>
          ) : resetPhase === 'confirm' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#EF4444' }}>Are you sure?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={btnStyle('#EF4444', '#fff')}
              >
                {resetting ? 'Resetting…' : 'Yes, delete all'}
              </button>
              <button
                onClick={() => setResetPhase('idle')}
                style={btnStyle('#1F2333', '#9CA3AF')}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleReset} style={{ ...btnStyle('rgba(239,68,68,0.1)', '#EF4444'), border: '1px solid rgba(239,68,68,0.3)' }}>
              Reset all data
            </button>
          )}
        </Row>
      </Card>
    </div>
  );
}
