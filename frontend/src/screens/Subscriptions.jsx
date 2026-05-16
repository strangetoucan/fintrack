import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import AccentButton from '../components/ui/AccentButton';
import Icon from '../components/ui/Icon';
import DonutChart from '../components/charts/DonutChart';
import SubscriptionModal from '../components/modals/SubscriptionModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmt } from '../utils/format';
import { fetchSubscriptions, deleteSubscription } from '../api/subscriptions';
import { useAccent } from '../context/TweakContext';

const CYCLE_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

const STATUS_COLOR = { active: '#22C55E', paused: '#F59E0B', cancelled: '#6B7280' };

const CAT_COLOR = {
  'Entertainment':   '#A78BFA',
  'Productivity':    '#3B82F6',
  'Cloud & Storage': '#F59E0B',
  'AI & Tools':      '#22C55E',
  'Health & Fitness':'#EC4899',
  'News & Media':    '#F97316',
  'Other':           '#6B7280',
};

function toMonthly(sub) {
  if (sub.billing_cycle === 'yearly')    return sub.amount / 12;
  if (sub.billing_cycle === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

const btnIcon = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, lineHeight: 1, transition: 'color 0.15s' };

export default function Subscriptions() {
  const [subs,       setSubs      ] = useState([]);
  const [modal,      setModal     ] = useState(null);   // null | 'add' | {editing sub}
  const [filter,     setFilter    ] = useState('active');
  const [confirmDlg, setConfirmDlg] = useState(null);
  const accent = useAccent();

  const load = () => fetchSubscriptions().then(setSubs).catch(() => {});
  useEffect(() => { load(); }, []);

  const active       = subs.filter((s) => s.status === 'active');
  const totalMonthly = active.reduce((sum, s) => sum + toMonthly(s), 0);
  const upcoming     = active.filter((s) => { const d = daysUntil(s.next_billing); return d !== null && d >= 0 && d <= 7; });

  const filtered = filter === 'all' ? subs : subs.filter((s) => s.status === filter);

  const catBreakdown = Object.entries(
    active.reduce((acc, s) => {
      const c = s.category || 'Other';
      acc[c] = (acc[c] || 0) + toMonthly(s);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: CAT_COLOR[name] || '#6B7280' }));

  const handleDelete = (sub) => {
    setConfirmDlg({
      message: `Delete "${sub.name}"? This cannot be undone.`,
      onConfirm: async () => { try { await deleteSubscription(sub.id); load(); } catch { /* noop */ } },
    });
  };

  return (
    <>
      <div
        className="fade-in"
        style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Subscriptions</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Track and manage recurring expenses</div>
          </div>
          <AccentButton onClick={() => setModal('add')}>
            <Icon name="plus" size={15} color="#000" /> Add Subscription
          </AccentButton>
        </div>

        {/* KPIs */}
        <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <StatCard label="Monthly Spend"  value={fmt(totalMonthly)}        sub={`${active.length} active subscription${active.length !== 1 ? 's' : ''}`} />
          <StatCard label="Yearly Spend"   value={fmt(totalMonthly * 12)}   sub="Annualized total" />
          <StatCard label="Active"         value={String(active.length)}    sub={`${subs.length} total`} />
          <StatCard label="Due This Week"  value={String(upcoming.length)}  sub="Renewing within 7 days" trend={upcoming.length > 0 ? 'down' : undefined} />
        </div>

        {/* Charts row */}
        <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>

          {/* Donut — by category */}
          <Card style={{ flex: 1.3, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>By Category</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>Monthly spend breakdown</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart
                segments={catBreakdown.length ? catBreakdown : [{ value: 1, color: '#2A2D3E' }]}
                size={140} thickness={26} label={fmt(totalMonthly)} sublabel="/ mo"
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {catBreakdown.length === 0 && (
                  <div style={{ color: '#6B7280', fontSize: 13 }}>No active subscriptions yet</div>
                )}
                {catBreakdown.map((a) => (
                  <div key={a.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, display: 'inline-block' }} />
                        {a.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono' }}>{fmt(a.value)}/mo</span>
                    </div>
                    <div style={{ height: 3, background: '#2A2D3E', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${totalMonthly ? (a.value / totalMonthly * 100).toFixed(0) : 0}%`, background: a.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Upcoming renewals */}
          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Upcoming Renewals</div>
            {upcoming.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>
                No renewals in the next 7 days ✓
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...upcoming]
                  .sort((a, b) => daysUntil(a.next_billing) - daysUntil(b.next_billing))
                  .map((s) => {
                    const d = daysUntil(s.next_billing);
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1F2333', borderRadius: 10, border: '1px solid #2A2D3E' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: (CAT_COLOR[s.category] || accent) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CAT_COLOR[s.category] || accent, flexShrink: 0 }}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: d === 0 ? '#EF4444' : '#F59E0B', marginTop: 1 }}>
                              {d === 0 ? 'Due today' : `In ${d} day${d !== 1 ? 's' : ''}`}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700 }}>{fmt(s.amount)}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Subscription list */}
        <Card>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['active', 'Active'], ['paused', 'Paused'], ['all', 'All']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
                  background: filter === v ? accent : '#1F2333',
                  color:      filter === v ? '#000'  : '#9CA3AF',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Grid table */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 112px 120px 76px 52px', minWidth: 600 }}>

              {['Subscription', 'Category', 'Cycle', 'Next Bill', 'Amount', 'Status', ''].map((h) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid #2A2D3E' }}>
                  {h}
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '28px 12px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                  No subscriptions found.
                </div>
              )}

              {filtered.map((s) => {
                const mo = toMonthly(s);
                const d  = daysUntil(s.next_billing);
                const catColor = CAT_COLOR[s.category] || '#6B7280';
                return (
                  <React.Fragment key={s.id}>
                    {/* Name */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: catColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: catColor }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        {s.notes && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</div>}
                      </div>
                    </div>
                    {/* Category */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      <Badge color={catColor}>{s.category}</Badge>
                    </div>
                    {/* Cycle */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: 12.5 }}>
                      {CYCLE_LABEL[s.billing_cycle] || s.billing_cycle}
                    </div>
                    {/* Next bill */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      {s.next_billing ? (
                        <div>
                          <div style={{ fontSize: 12.5, color: d !== null && d <= 3 ? '#F59E0B' : '#9CA3AF' }}>{s.next_billing}</div>
                          {d !== null && d >= 0 && d <= 7 && (
                            <div style={{ fontSize: 10.5, color: d <= 1 ? '#EF4444' : '#F59E0B', marginTop: 1 }}>
                              {d === 0 ? 'Today' : `${d}d`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#374151' }}>—</span>
                      )}
                    </div>
                    {/* Amount */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700 }}>{fmt(s.amount)}</div>
                        {s.billing_cycle !== 'monthly' && (
                          <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 1 }}>{fmt(mo)}/mo</div>
                        )}
                      </div>
                    </div>
                    {/* Status */}
                    <div style={{ padding: '12px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        background: (STATUS_COLOR[s.status] || '#6B7280') + '22',
                        color: STATUS_COLOR[s.status] || '#6B7280',
                        textTransform: 'capitalize',
                      }}>
                        {s.status}
                      </span>
                    </div>
                    {/* Actions */}
                    <div style={{ padding: '12px 6px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button
                        onClick={() => setModal(s)}
                        title="Edit"
                        style={{ ...btnIcon, color: '#6B7280', fontSize: 13 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2A2D3E'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >✎</button>
                      <button
                        onClick={() => handleDelete(s)}
                        title="Delete"
                        style={{ ...btnIcon, color: '#6B7280', fontSize: 16 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                      >×</button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {modal && (
        <SubscriptionModal
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          editing={modal === 'add' ? null : modal}
        />
      )}
      {confirmDlg && (
        <ConfirmDialog
          message={confirmDlg.message}
          onConfirm={() => { confirmDlg.onConfirm(); setConfirmDlg(null); }}
          onCancel={() => setConfirmDlg(null)}
        />
      )}
    </>
  );
}
