import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import AccentButton from '../components/ui/AccentButton';
import GoalModal from '../components/modals/GoalModal';
import EMIModal from '../components/modals/EMIModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmt } from '../utils/format';
import { fetchGoals, deleteGoal, fetchEmis, deleteEmi } from '../api/goals';
import { useAccent } from '../context/TweakContext';

const btnIcon = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '4px 6px', borderRadius: 6, lineHeight: 1, transition: 'color 0.15s',
};

export default function Goals() {
  const accent = useAccent();
  const [goals,       setGoals      ] = useState([]);
  const [emis,        setEmis       ] = useState([]);
  const [goalModal,   setGoalModal  ] = useState(null); // null | 'add' | {editing goal}
  const [emiModal,    setEmiModal   ] = useState(null); // null | 'add' | {editing emi}
  const [confirmDlg,  setConfirmDlg ] = useState(null);
  const [projections, setProjections] = useState({});  // { [goalId]: string }

  const load = () => {
    fetchGoals().then(setGoals).catch(() => {});
    fetchEmis().then(setEmis).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleDeleteGoal = (g) => {
    setConfirmDlg({
      message: `Delete goal "${g.name}"? This cannot be undone.`,
      onConfirm: async () => { try { await deleteGoal(g.id); load(); } catch { /* noop */ } },
    });
  };

  const handleDeleteEmi = (e) => {
    setConfirmDlg({
      message: `Delete "${e.name}"? This cannot be undone.`,
      onConfirm: async () => { try { await deleteEmi(e.id); load(); } catch { /* noop */ } },
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
            <div style={{ fontSize: 22, fontWeight: 700 }}>Goals & EMIs</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Track savings targets and loan repayments</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <AccentButton onClick={() => setEmiModal('add')} style={{ background: '#1F2333', color: '#E8EAF0', border: '1px solid #2A2D3E' }}>
              <Icon name="plus" size={15} color="#E8EAF0" /> Add EMI
            </AccentButton>
            <AccentButton onClick={() => setGoalModal('add')}>
              <Icon name="plus" size={15} color="#000" /> New Goal
            </AccentButton>
          </div>
        </div>

        {/* ── Savings Goals ─────────────────────────────────────────────── */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.03em' }}>Savings Goals</div>

        <div className="two-col" style={{ gap: 'var(--content-gap,14px)' }}>
          {goals.length === 0 && (
            <div style={{ gridColumn: '1 / -1', color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 32 }}>
              No goals yet — add one to start tracking.
            </div>
          )}
          {goals.map((g) => {
            const pct = Math.min((g.current / g.target) * 100, 100);
            return (
              <Card key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: g.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {g.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                      <div style={{ color: '#6B7280', fontSize: 11.5, marginTop: 2 }}>Target by {g.deadline}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Badge color={g.color}>{pct.toFixed(0)}%</Badge>
                    <button
                      onClick={() => setGoalModal(g)}
                      title="Edit"
                      style={{ ...btnIcon, color: '#6B7280', fontSize: 13, marginLeft: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2A2D3E'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g)}
                      title="Delete"
                      style={{ ...btnIcon, color: '#6B7280', fontSize: 16 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{fmt(g.current)}</span>
                  <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'DM Mono' }}>{fmt(g.target)}</span>
                </div>
                <div style={{ height: 8, background: '#2A2D3E', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: g.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 11.5, color: '#6B7280' }}>
                  {g.current >= g.target
                    ? <span style={{ color: '#22C55E', fontWeight: 600 }}>Goal reached! 🎉</span>
                    : `${fmt(g.target - g.current)} more needed`
                  }
                </div>

                {g.current < g.target && (() => {
                  const monthly   = parseFloat(projections[g.id]) || 0;
                  const remaining = g.target - g.current;
                  const months    = monthly > 0 ? Math.ceil(remaining / monthly) : null;
                  const projDate  = months !== null ? (() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + months);
                    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
                  })() : null;
                  return (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #2A2D3E' }}>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Projector
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Monthly top-up</span>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: '#13161F', border: '1px solid #2A2D3E', borderRadius: 7, padding: '4px 8px' }}>
                          <span style={{ color: g.color, fontSize: 12, marginRight: 3 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={projections[g.id] ?? ''}
                            onChange={e => setProjections(p => ({ ...p, [g.id]: e.target.value }))}
                            placeholder="0"
                            style={{ background: 'none', border: 'none', outline: 'none', color: '#E8EAF0', fontSize: 12, width: '100%', fontFamily: 'DM Mono' }}
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        {projDate
                          ? <span>Done in <span style={{ color: g.color, fontWeight: 600 }}>{months} month{months !== 1 ? 's' : ''}</span> · <span style={{ color: '#9CA3AF' }}>{projDate}</span></span>
                          : <span style={{ color: '#4B5563' }}>Enter a monthly amount to project</span>
                        }
                      </div>
                    </div>
                  );
                })()}
              </Card>
            );
          })}
        </div>

        {/* ── Active EMIs / Loans ───────────────────────────────────────── */}
        <div style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.03em', marginTop: 4 }}>
          Active EMIs / Loans
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {emis.length === 0 && (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>
              No active EMIs — add one above.
            </div>
          )}
          {emis.map((emi) => {
            const paid = emi.total_loan - emi.outstanding;
            const pct  = Math.min((paid / emi.total_loan) * 100, 100);
            return (
              <Card key={emi.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{emi.name}</div>
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{emi.bank} · Ends {emi.end_date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 700, color: '#EF4444' }}>
                        -{fmt(emi.emi)}<span style={{ fontSize: 12, color: '#6B7280' }}>/mo</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>
                        Outstanding: <span style={{ fontFamily: 'DM Mono', fontWeight: 600 }}>{fmt(emi.outstanding)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        onClick={() => setEmiModal(emi)}
                        title="Edit"
                        style={{ ...btnIcon, color: '#6B7280', fontSize: 13 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2A2D3E'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteEmi(emi)}
                        title="Delete"
                        style={{ ...btnIcon, color: '#6B7280', fontSize: 16 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, color: '#6B7280' }}>Repaid: {fmt(paid)}</span>
                  <span style={{ fontSize: 11.5, color: '#6B7280' }}>{pct.toFixed(0)}% complete</span>
                </div>
                <div style={{ height: 6, background: '#2A2D3E', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 99, transition: 'width 0.8s ease' }} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {goalModal && (
        <GoalModal
          onClose={() => setGoalModal(null)}
          onSaved={() => { setGoalModal(null); load(); }}
          editing={goalModal === 'add' ? null : goalModal}
        />
      )}

      {emiModal && (
        <EMIModal
          onClose={() => setEmiModal(null)}
          onSaved={() => { setEmiModal(null); load(); }}
          editing={emiModal === 'add' ? null : emiModal}
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
