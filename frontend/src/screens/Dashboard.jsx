import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import AccentButton from '../components/ui/AccentButton';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { fmt, fmtK } from '../utils/format';
import { fetchTransactions } from '../api/transactions';
import { apiFetch } from '../api/client';
import { fetchInvestmentSummary } from '../api/investments';
import { fetchAccountSummary } from '../api/accounts';
import { useAccent } from '../context/TweakContext';
import { useSettingsCtx } from '../context/SettingsContext';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function toYM(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYM(d);
}
function ymLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

const CAT_COLORS = {
  'Rent': '#3B82F6', 'Groceries': '#22C55E', 'Food & Dining': '#F59E0B',
  'Transport': '#A78BFA', 'Utilities': '#06B6D4', 'Entertainment': '#EC4899',
  'Shopping': '#F97316', 'Healthcare': '#14B8A6', 'Insurance': '#8B5CF6',
  'Investment': '#EAB308', 'Education': '#64748B', 'EMI/Loan': '#EF4444',
  'Salary': '#22C55E', 'Freelance': '#10B981', 'Interest': '#34D399',
  'Dividend': '#6EE7B7', 'Rental Income': '#A7F3D0', 'Bonus': '#BBF7D0',
};

function buildExpCats(transactions) {
  const totals = {};
  for (const t of transactions) {
    if (t.type === 'expense') {
      const key = t.category || 'Other';
      totals[key] = (totals[key] || 0) + Math.abs(t.amount);
    }
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= 5) {
    return sorted.map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#6B7280' }));
  }
  const top4 = sorted.slice(0, 4).map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#6B7280' }));
  const othersVal = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
  return [...top4, { name: 'Others', value: othersVal, color: '#6B7280' }];
}

const btnStyle = (active, accent) => ({
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
  borderRadius: 8, fontSize: 18, color: active ? '#6B7280' : '#374151',
  lineHeight: 1,
  ':hover': { color: accent },
});

export default function Dashboard({ onNavigate }) {
  const accent = useAccent();
  const { settings } = useSettingsCtx();
  const [showModal,   setShowModal  ] = useState(false);
  const [allTxns,     setAllTxns    ] = useState(null);
  const [monthly,     setMonthly    ] = useState([]);
  const [invSummary,  setInvSummary ] = useState(null);
  const [acctSummary, setAcctSummary] = useState(null);

  const today       = new Date();
  const currentYM   = toYM(today);
  const [viewMonth, setViewMonth] = useState(currentYM);

  const monthTxns = allTxns
    ? allTxns.filter(t => t.date.slice(0, 7) === viewMonth)
    : null;

  const totalIncome  = monthTxns ? monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0) : null;
  const totalExpense = monthTxns ? monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0) : null;
  const savings      = totalIncome != null ? totalIncome - totalExpense : null;
  const savingsRate  = totalIncome ? ((savings / totalIncome) * 100).toFixed(0) : '0';
  const expCats      = monthTxns ? buildExpCats(monthTxns) : [];
  const recentTxns   = monthTxns ? [...monthTxns].sort((a, b) => (b.created_at ?? b.date) > (a.created_at ?? a.date) ? 1 : -1).slice(0, 5) : [];

  const chartLabels = monthly.map(m => m.month.slice(5));
  const incomeData  = monthly.map(m => m.income);
  const expenseData = monthly.map(m => m.expense);
  const savingsData = monthly.map(m => m.savings);

  const isCurrentMonth = viewMonth === currentYM;
  const canGoNext      = !isCurrentMonth;

  const loadAll = async () => {
    try {
      const data = await fetchTransactions({ limit: 500 });
      setAllTxns(data);
    } catch {
      setAllTxns([]);
    }
    apiFetch('/transactions/monthly-summary').then(setMonthly).catch(() => {});
    fetchInvestmentSummary().then(setInvSummary).catch(() => {});
    fetchAccountSummary().then(setAcctSummary).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const navBtnStyle = (disabled) => ({
    background: 'none', border: '1px solid #2A2D3E', borderRadius: 7,
    cursor: disabled ? 'default' : 'pointer', color: disabled ? '#374151' : '#9CA3AF',
    padding: '3px 10px', fontSize: 14, lineHeight: 1.4, fontFamily: 'DM Sans',
    opacity: disabled ? 0.3 : 1,
  });

  return (
    <>
      <div
        className="fade-in"
        style={{
          padding: 'var(--content-pad, 24px)', overflowY: 'auto', height: '100%',
          display: 'flex', flexDirection: 'column', gap: 'var(--content-gap, 14px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {greeting()}{settings.userName ? `, ${settings.userName}` : ''} 👋
            </div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
              Here's your financial snapshot
            </div>
          </div>
          <AccentButton onClick={() => setShowModal(true)}>
            <Icon name="plus" size={15} color="#000" /> Add Transaction
          </AccentButton>
        </div>

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            style={navBtnStyle(false)}
            onClick={() => setViewMonth(m => addMonths(m, -1))}
          >←</button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: 'center', color: '#E8EAF0' }}>
            {ymLabel(viewMonth)}
            {isCurrentMonth && (
              <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8, fontWeight: 400 }}>current</span>
            )}
          </span>
          <button
            style={navBtnStyle(!canGoNext)}
            disabled={!canGoNext}
            onClick={() => setViewMonth(m => addMonths(m, 1))}
          >→</button>
          {!isCurrentMonth && (
            <button
              onClick={() => setViewMonth(currentYM)}
              style={{
                background: 'none', border: '1px solid #2A2D3E', borderRadius: 7, cursor: 'pointer',
                color: accent, padding: '3px 10px', fontSize: 11.5, fontFamily: 'DM Sans', fontWeight: 600,
              }}
            >Today</button>
          )}
        </div>

        {/* KPI Row */}
        <div className="kpi-row" style={{ gap: 'var(--content-gap, 14px)' }}>
          <StatCard label="Monthly Income"  value={totalIncome  != null ? fmt(totalIncome)  : '—'} sub={`${monthTxns?.filter(t=>t.type==='income').length ?? 0} transactions`}  trend="up"  />
          <StatCard label="Total Expenses"  value={totalExpense != null ? fmt(totalExpense) : '—'} sub={`${monthTxns?.filter(t=>t.type==='expense').length ?? 0} transactions`} trend="down"/>
          <StatCard label="Net Savings"     value={savings != null ? fmt(savings) : '—'} sub={`${savingsRate}% savings rate`} trend={savings >= 0 ? 'up' : 'down'} />
          <StatCard
            label="Net Worth"
            value={(invSummary || acctSummary)
              ? fmtK((invSummary?.total_current ?? 0) + (acctSummary?.total_balance ?? 0))
              : '—'}
            sub="Investments + bank balances"
            trend="up"
          />
        </div>

        {/* Charts row */}
        <div className="chart-row" style={{ gap: 'var(--content-gap, 14px)' }}>
          <Card style={{ flex: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Income vs Expenses</div>
                <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>Monthly — hover to inspect</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                {[['#22C55E', 'Income'], ['#3B82F6', 'Expenses']].map(([c, l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                    <span style={{ color: '#9CA3AF' }}>{l}</span>
                  </span>
                ))}
              </div>
            </div>
            {monthly.length > 0 ? (
              <AreaChart data1={incomeData} data2={expenseData} labels={chartLabels} color1="#22C55E" color2="#3B82F6" height={160} />
            ) : (
              <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 50 }}>No data yet</div>
            )}
          </Card>

          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Expense Breakdown</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>{ymLabel(viewMonth)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {expCats.length > 0 ? (
                <>
                  <DonutChart segments={expCats} size={130} thickness={24} label={fmt(totalExpense)} sublabel="expenses" />
                  <div style={{ marginTop: 16, width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {expCats.map((c) => (
                      <div
                        key={c.name}
                        onClick={() => onNavigate?.('transactions')}
                        title="View transactions"
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 6px', borderRadius: 7, cursor: 'pointer',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1F2333'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9CA3AF' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block', flexShrink: 0 }} />
                          {c.name}
                        </span>
                        <span style={{ fontSize: 12, color: '#E8EAF0', fontFamily: 'DM Mono' }}>{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#6B7280', fontSize: 13, marginTop: 24, textAlign: 'center' }}>No expenses this month</div>
              )}
            </div>
          </Card>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', gap: 'var(--content-gap, 14px)' }}>
          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Monthly Savings</div>
            <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 12 }}>Hover bars to inspect</div>
            {savingsData.length > 0 ? (
              <BarChart data={savingsData} labels={chartLabels} color={accent} height={100} />
            ) : (
              <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 24 }}>No data yet</div>
            )}
          </Card>

          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Recent Transactions</div>
              <button
                onClick={() => onNavigate?.('transactions')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans' }}
              >
                View all →
              </button>
            </div>
            {recentTxns.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 16 }}>
                No transactions in {ymLabel(viewMonth)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentTxns.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{t.category}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.type === 'income' ? accent : '#EF4444', fontFamily: 'DM Mono', flexShrink: 0 }}>
                      {t.type === 'income' ? '+' : ''}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Investment Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total Invested', val: invSummary ? fmtK(invSummary.total_invested) : '—', color: '#9CA3AF' },
                { label: 'Current Value',  val: invSummary ? fmtK(invSummary.total_current)  : '—', color: accent },
                { label: 'Total Returns',  val: invSummary ? `+${fmtK(invSummary.total_returns)} (+${invSummary.total_invested ? ((invSummary.total_returns / invSummary.total_invested) * 100).toFixed(1) : 0}%)` : '—', color: accent },
                { label: 'Monthly SIPs',   val: invSummary ? fmt(invSummary.monthly_sips) : '—', color: '#9CA3AF' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: '#6B7280' }}>{row.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: row.color, fontFamily: 'DM Mono' }}>{row.val}</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#2A2D3E', marginTop: 4 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <Badge color={accent}>MF</Badge>
                <Badge color="#3B82F6">Stocks</Badge>
                <Badge color="#F59E0B">FD</Badge>
                <Badge color="#A78BFA">PPF</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onAdded={loadAll}
        />
      )}
    </>
  );
}
