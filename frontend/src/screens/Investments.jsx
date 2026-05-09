import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import AccentButton from '../components/ui/AccentButton';
import Icon from '../components/ui/Icon';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import InvestmentModal from '../components/modals/InvestmentModal';
import InvestmentTxnsModal from '../components/modals/InvestmentTxnsModal';
import { fmt, fmtK } from '../utils/format';
import { fetchInvestments, fetchInvestmentSummary, deleteInvestment } from '../api/investments';
import { fetchTransactions } from '../api/transactions';
import { useAccent } from '../context/TweakContext';

const TYPE_COLOR = { MF: '#22C55E', Stock: '#3B82F6', FD: '#F59E0B', PPF: '#A78BFA' };
const TYPE_LABEL = { MF: 'Mutual Funds', Stock: 'Stocks', FD: 'FD/RD', PPF: 'PPF/EPF' };

const btnIcon = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px 6px', borderRadius: 6, lineHeight: 1, transition: 'color 0.15s',
};

export default function Investments() {
  const [tab,      setTab     ] = useState('all');
  const [invs,     setInvs    ] = useState([]);
  const [summary,  setSummary ] = useState(null);
  const [growth,   setGrowth  ] = useState({ labels: [], data: [] });
  const [modal,    setModal   ] = useState(null);    // null | 'add' | {editing inv}
  const [txnModal, setTxnModal] = useState(null);   // null | {investment}
  const accent = useAccent();

  const load = () => {
    fetchInvestments().then(setInvs).catch(() => {});
    fetchInvestmentSummary().then(setSummary).catch(() => {});
  };

  useEffect(() => {
    load();
    fetchTransactions({ limit: 500 }).then((txns) => {
      const monthly = {};
      for (const t of txns) {
        const m = t.date.slice(0, 7);
        if (!monthly[m]) monthly[m] = 0;
        if (t.type === 'income')  monthly[m] += Math.abs(t.amount);
        if (t.type === 'expense') monthly[m] -= Math.abs(t.amount);
      }
      const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
      setGrowth({ labels: sorted.map(([m]) => m.slice(5)), data: sorted.map(([, v]) => Math.max(0, v)) });
    }).catch(() => {});
  }, []);

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete "${inv.name}"?`)) return;
    try { await deleteInvestment(inv.id); load(); } catch { /* noop */ }
  };

  const filtered   = tab === 'all' ? invs : invs.filter((i) => i.type === tab);
  const totalCurr  = summary?.total_current  ?? invs.reduce((s, i) => s + i.current,  0);
  const totalInv   = summary?.total_invested ?? invs.reduce((s, i) => s + i.invested, 0);
  const totalRet   = summary?.total_returns  ?? (totalCurr - totalInv);
  const totalSIPs  = summary?.monthly_sips   ?? 0;
  const activeSIPs = summary?.active_sips    ?? invs.filter((i) => i.sip).length;

  const alloc = ['MF', 'Stock', 'FD', 'PPF'].map((t) => ({
    name: TYPE_LABEL[t],
    value: invs.filter((i) => i.type === t).reduce((s, i) => s + i.current, 0),
    color: TYPE_COLOR[t],
  })).filter((a) => a.value > 0);

  return (
    <>
      <div
        className="fade-in"
        style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Investments</div>
          <AccentButton onClick={() => setModal('add')}>
            <Icon name="plus" size={15} color="#000" /> Add Investment
          </AccentButton>
        </div>

        <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <StatCard label="Total Invested" value={fmt(totalInv)}  sub="Across all instruments" />
          <StatCard label="Current Value"  value={fmt(totalCurr)} sub={`+${fmt(totalRet)} overall`} trend="up" />
          <StatCard label="Total Returns"  value={`+${fmt(totalRet)}`} sub={totalInv ? `+${((totalRet / totalInv) * 100).toFixed(1)}% overall` : '—'} trend="up" />
          <StatCard label="Monthly SIPs"   value={fmt(totalSIPs)} sub={`${activeSIPs} active SIP${activeSIPs !== 1 ? 's' : ''}`} />
        </div>

        <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <Card style={{ flex: 1.4, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Portfolio Allocation</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>By asset class</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <DonutChart
                segments={alloc.length ? alloc : [{ value: 1, color: '#2A2D3E' }]}
                size={150} thickness={28} label={fmtK(totalCurr)} sublabel="total"
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alloc.length === 0 && <div style={{ color: '#6B7280', fontSize: 13 }}>No investments yet</div>}
                {alloc.map((a) => (
                  <div key={a.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, display: 'inline-block' }} />
                        {a.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono' }}>{fmt(a.value)}</span>
                    </div>
                    <div style={{ height: 4, background: '#2A2D3E', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${totalCurr ? (a.value / totalCurr * 100).toFixed(0) : 0}%`, background: a.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Monthly Net Savings</div>
            {growth.data.length > 0 ? (
              <AreaChart data1={growth.data} labels={growth.labels} color1={accent} height={130} />
            ) : (
              <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No transaction data yet</div>
            )}
          </Card>
        </div>

        <Card>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['all', 'MF', 'Stock', 'FD', 'PPF'].map((t) => (
              <button
                key={t} onClick={() => setTab(t)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
                  background: tab === t ? accent : '#1F2333',
                  color:      tab === t ? '#000'  : '#9CA3AF',
                }}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 120px 120px 100px 90px 52px 72px', overflowX: 'auto' }}>
            {['Name', 'Type', 'Invested', 'Current', 'Returns', 'SIP/mo', 'History', ''].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', borderBottom: '1px solid #2A2D3E' }}>
                {h}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '24px 12px', color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
                No investments found — add one above.
              </div>
            )}

            {filtered.map((inv) => {
              const ret    = inv.current - inv.invested;
              const retPct = inv.returns;
              return (
                <React.Fragment key={inv.id}>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.name}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{inv.platform}</div>
                  </div>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                    <Badge color={TYPE_COLOR[inv.type] ?? '#6B7280'}>{inv.type}</Badge>
                  </div>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', fontSize: 13, fontFamily: 'DM Mono' }}>
                    {fmt(inv.invested)}
                  </div>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>
                    {fmt(inv.current)}
                  </div>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 13, color: ret >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                      {ret >= 0 ? '+' : ''}{retPct}%
                    </span>
                  </div>
                  <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', fontSize: 13, color: '#9CA3AF', fontFamily: 'DM Mono' }}>
                    {inv.sip ? fmt(inv.sip) : '—'}
                  </div>
                  <div style={{ padding: '13px 6px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => setTxnModal(inv)}
                      title="Transaction history"
                      style={{ ...btnIcon, color: '#6B7280', fontSize: 13, padding: '4px 8px' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = accent}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                    >
                      📋
                    </button>
                  </div>
                  <div style={{ padding: '13px 6px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => setModal(inv)}
                      title="Edit"
                      style={{ ...btnIcon, color: '#6B7280', fontSize: 13 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2A2D3E'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(inv)}
                      title="Delete"
                      style={{ ...btnIcon, color: '#6B7280', fontSize: 16 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                    >
                      ×
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      </div>

      {modal && (
        <InvestmentModal
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          editing={modal === 'add' ? null : modal}
        />
      )}

      {txnModal && (
        <InvestmentTxnsModal
          investment={txnModal}
          onClose={() => setTxnModal(null)}
        />
      )}
    </>
  );
}
