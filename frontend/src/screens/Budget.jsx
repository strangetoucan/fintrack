import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Icon from '../components/ui/Icon';
import AccentButton from '../components/ui/AccentButton';
import DonutChart from '../components/charts/DonutChart';
import BudgetCategoryModal from '../components/modals/BudgetCategoryModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmt } from '../utils/format';
import { fetchBudget, fetchBudgetSummary, deleteBudgetCategory } from '../api/budget';

const btnIcon = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px 6px', borderRadius: 6, fontSize: 13, lineHeight: 1,
  transition: 'background 0.15s',
};

export default function Budget() {
  const [cats,       setCats      ] = useState([]);
  const [summary,    setSummary   ] = useState(null);
  const [modal,      setModal     ] = useState(null); // null | 'add' | {editing cat}
  const [confirmDlg, setConfirmDlg] = useState(null);

  const load = () => {
    fetchBudget().then(setCats).catch(() => {});
    fetchBudgetSummary().then(setSummary).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (cat) => {
    setConfirmDlg({
      message: `Delete "${cat.name}" budget category? This cannot be undone.`,
      onConfirm: async () => { try { await deleteBudgetCategory(cat.id); load(); } catch { /* noop */ } },
    });
  };

  const totalBudget = summary?.total_budget    ?? cats.reduce((s, c) => s + c.budget, 0);
  const totalSpent  = summary?.total_spent     ?? cats.reduce((s, c) => s + c.spent,  0);
  const remaining   = summary?.total_remaining ?? (totalBudget - totalSpent);

  const now        = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear();

  return (
    <>
      <div
        className="fade-in"
        style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Budget Planner</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Monthly limits — {monthLabel}</div>
          </div>
          <AccentButton onClick={() => setModal('add')}>
            <Icon name="plus" size={15} color="#000" /> New Category
          </AccentButton>
        </div>

        <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <StatCard label="Total Budget" value={fmt(totalBudget)} sub={monthLabel} />
          <StatCard label="Total Spent"  value={fmt(totalSpent)}  sub={`${totalBudget ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% utilized`} trend="down" />
          <StatCard label="Remaining"    value={fmt(Math.max(0, remaining))} sub="Available to spend" trend="up" />
          <Card style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart
              segments={[
                { value: totalSpent,              color: '#3B82F6' },
                { value: Math.max(0, remaining),  color: '#22C55E' },
              ]}
              size={76} thickness={16}
              label={`${totalBudget ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%`}
              sublabel="used"
            />
          </Card>
        </div>

        <div className="two-col budget-grid" style={{ gap: 'var(--content-gap,14px)' }}>
          {cats.length === 0 && (
            <div style={{ gridColumn: '1 / -1', color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 32 }}>
              No budget categories yet — add one to get started.
            </div>
          )}
          {cats.map((cat) => {
            const pct  = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
            const over = pct > 95;
            return (
              <Card key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                      <div style={{ color: '#6B7280', fontSize: 11.5, marginTop: 2 }}>
                        Budget: <span style={{ fontFamily: 'DM Mono' }}>{fmt(cat.budget)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', marginRight: 6 }}>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 15, color: over ? '#EF4444' : '#E8EAF0' }}>
                        {fmt(cat.spent)}
                      </span>
                      <div style={{ fontSize: 11, color: over ? '#EF4444' : '#6B7280', marginTop: 2 }}>{pct.toFixed(0)}% used</div>
                    </div>
                    <button
                      onClick={() => setModal(cat)}
                      title="Edit"
                      style={{ ...btnIcon, color: '#6B7280' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2A2D3E'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      title="Delete"
                      style={{ ...btnIcon, color: '#6B7280' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ height: 6, background: '#2A2D3E', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(pct, 100)}%`,
                    background: over ? '#EF4444' : cat.color,
                    borderRadius: 99, transition: 'width 0.8s ease',
                  }} />
                </div>
                {over
                  ? <div style={{ marginTop: 6, fontSize: 11, color: '#EF4444', fontWeight: 500 }}>⚠ Near budget limit</div>
                  : <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>{fmt(Math.max(0, cat.budget - cat.spent))} remaining</div>
                }
              </Card>
            );
          })}
        </div>
      </div>

      {modal && (
        <BudgetCategoryModal
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
