import { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Icon from '../components/ui/Icon';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { useAccent } from '../context/TweakContext';
import { useSettingsCtx } from '../context/SettingsContext';
import { fmt, fmtK } from '../utils/format';
import { apiFetch } from '../api/client';

// FY helpers
function fyStartYear(month) {
  const [y, m] = month.split('-').map(Number);
  return m >= 4 ? y : y - 1;
}
function fyLabel(startYear) {
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}
function monthInFY(month, startYear) {
  const [y, m] = month.split('-').map(Number);
  return m >= 4 ? y === startYear : y === startYear + 1;
}

const CAT_COLORS = {
  'Rent': '#3B82F6', 'Groceries': '#22C55E', 'Food & Dining': '#F59E0B',
  'Transport': '#A78BFA', 'Utilities': '#06B6D4', 'Entertainment': '#EC4899',
  'Shopping': '#F97316', 'Healthcare': '#14B8A6', 'Insurance': '#8B5CF6',
  'Investment': '#EAB308', 'Education': '#64748B', 'EMI/Loan': '#EF4444',
};

export default function Reports() {
  const [monthly,    setMonthly   ] = useState([]);
  const [allTxns,    setAllTxns   ] = useState([]);
  const [year,       setYear      ] = useState('all');
  const [activeCat,  setActiveCat ] = useState(null);
  const accent = useAccent();
  const { settings } = useSettingsCtx();
  const isFY = settings.financialYear === 'fiscal';

  useEffect(() => {
    apiFetch('/transactions/monthly-summary').then(setMonthly).catch(() => {});
    apiFetch('/transactions/?limit=500').then(setAllTxns).catch(() => {});
  }, []);

  // Reset drill-down when period changes
  useEffect(() => { setActiveCat(null); }, [year]);

  const availableYears = useMemo(() => {
    if (isFY) {
      return [...new Set(monthly.map((m) => String(fyStartYear(m.month))))].sort().reverse();
    }
    return [...new Set(monthly.map((m) => m.month.slice(0, 4)))].sort().reverse();
  }, [monthly, isFY]);

  const filteredMonthly = useMemo(() => {
    if (year === 'all') return monthly;
    if (isFY) return monthly.filter((m) => monthInFY(m.month, Number(year)));
    return monthly.filter((m) => m.month.startsWith(year));
  }, [monthly, year, isFY]);

  const filteredTxns = useMemo(() => {
    if (year === 'all') return allTxns;
    if (isFY) return allTxns.filter((t) => monthInFY(t.date.slice(0, 7), Number(year)));
    return allTxns.filter((t) => t.date.startsWith(year));
  }, [allTxns, year, isFY]);

  const catSpend = useMemo(() => {
    const totals = {};
    for (const t of filteredTxns) {
      if (t.type === 'expense') {
        const k = t.category || 'Other';
        totals[k] = (totals[k] || 0) + Math.abs(t.amount);
      }
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#6B7280' }));
  }, [filteredTxns]);

  // Transactions for the active category drill-down
  const drillTxns = useMemo(() => {
    if (!activeCat) return [];
    return filteredTxns
      .filter(t => t.type === 'expense' && t.category === activeCat)
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [filteredTxns, activeCat]);

  const totalIncome  = filteredMonthly.reduce((s, m) => s + m.income,  0);
  const totalExpense = filteredMonthly.reduce((s, m) => s + m.expense, 0);
  const totalSavings = totalIncome - totalExpense;
  const savingsRate  = totalIncome ? ((totalSavings / totalIncome) * 100).toFixed(1) : '0';
  const topCat       = catSpend[0];
  const topCatPct    = totalExpense && topCat ? ((topCat.value / totalExpense) * 100).toFixed(1) : '—';

  const chartLabels = filteredMonthly.map((m) => m.month.slice(5));
  const incomeData  = filteredMonthly.map((m) => m.income);
  const expenseData = filteredMonthly.map((m) => m.expense);
  const savingsData = filteredMonthly.map((m) => m.savings);
  // Include name for DonutChart hover
  const donutSegs   = catSpend.slice(0, 8).map((c) => ({ value: c.value, color: c.color, name: c.name }));

  const periodLabel = year === 'all' ? 'All Time' : isFY ? fyLabel(Number(year)) : year;

  const periodBtnStyle = (active) => ({
    padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
    background: active ? accent : '#1F2333',
    color:      active ? '#000'  : '#9CA3AF',
  });

  return (
    <div
      className="fade-in"
      style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
    >
      {/* Header + period selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Reports & Analytics</div>
          <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Financial insights — {periodLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setYear('all')} style={periodBtnStyle(year === 'all')}>All Time</button>
          {availableYears.map((y) => (
            <button key={y} onClick={() => setYear(y)} style={periodBtnStyle(year === y)}>
              {isFY ? fyLabel(Number(y)) : y}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <StatCard label="Total Income"    value={fmtK(totalIncome)}   sub={`${filteredMonthly.length} month${filteredMonthly.length !== 1 ? 's' : ''}`} trend="up" />
        <StatCard label="Total Expenses"  value={fmtK(totalExpense)}  sub={periodLabel} trend="down" />
        <StatCard label="Total Saved"     value={fmtK(totalSavings)}  sub={`${savingsRate}% savings rate`} trend={totalSavings >= 0 ? 'up' : 'down'} />
        <StatCard label="Largest Expense" value={topCat ? fmtK(topCat.value) : '—'} sub={topCat ? `${topCat.name} (${topCatPct}%)` : 'No data'} />
      </div>

      {/* Main chart row */}
      <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <Card style={{ flex: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Income vs Expenses</div>
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>Hover to inspect — {periodLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              {[['#22C55E', 'Income'], ['#3B82F6', 'Expenses']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                  <span style={{ color: '#9CA3AF' }}>{l}</span>
                </span>
              ))}
            </div>
          </div>
          {filteredMonthly.length > 0 ? (
            <AreaChart data1={incomeData} data2={expenseData} labels={chartLabels} color1="#22C55E" color2="#3B82F6" height={170} />
          ) : (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>No data for this period</div>
          )}
        </Card>

        <Card style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Expense Categories</div>
          <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>Hover segments — {periodLabel}</div>
          {donutSegs.length > 0 ? (
            <DonutChart segments={donutSegs} size={160} thickness={28} label={fmtK(totalExpense)} sublabel="total" />
          ) : (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>No expense data</div>
          )}
        </Card>
      </div>

      {/* Savings trend */}
      <Card>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Monthly Savings Trend</div>
        <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>Net savings per month — hover bars · red = deficit</div>
        {savingsData.length > 0 ? (
          <BarChart data={savingsData} labels={chartLabels} color={accent} height={120} />
        ) : (
          <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No data for this period</div>
        )}
      </Card>

      {/* Category breakdown + drill-down */}
      <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Top Expense Categories</div>
          <div style={{ color: '#6B7280', fontSize: 11.5, marginBottom: 14 }}>Click a category to see its transactions</div>
          {catSpend.length === 0 && (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>No expenses for this period</div>
          )}
          {catSpend.slice(0, 6).map(({ name, value, color }) => {
            const pct    = totalExpense ? ((value / totalExpense) * 100).toFixed(1) : 0;
            const isActive = activeCat === name;
            return (
              <div
                key={name}
                onClick={() => setActiveCat(isActive ? null : name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
                  background: isActive ? color + '18' : 'transparent',
                  border: `1px solid ${isActive ? color + '50' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#1F2333'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 6, height: 32, borderRadius: 3, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? color : '#E8EAF0' }}>{name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Mono', color: isActive ? color : '#E8EAF0' }}>{fmt(value)}</span>
                  </div>
                  <div style={{ height: 4, background: '#2A2D3E', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, color: '#6B7280', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
              </div>
            );
          })}
        </Card>

        <Card style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Monthly Breakdown</div>
          {filteredMonthly.length === 0 && (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>No data for this period</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredMonthly.slice().reverse().slice(0, 8).map((m) => (
              <div
                key={m.month}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #2A2D3E22' }}
              >
                <span style={{ fontSize: 12.5, color: '#6B7280', minWidth: 70 }}>{m.month}</span>
                <span style={{ fontSize: 12.5, fontFamily: 'DM Mono', color: '#22C55E' }}>{fmt(m.income)}</span>
                <span style={{ fontSize: 12.5, fontFamily: 'DM Mono', color: '#EF4444' }}>{fmt(m.expense)}</span>
                <span style={{ fontSize: 12.5, fontFamily: 'DM Mono', fontWeight: 600, color: m.savings >= 0 ? accent : '#EF4444' }}>
                  {m.savings >= 0 ? '+' : ''}{fmt(m.savings)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Category drill-down */}
      {activeCat && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[activeCat] || '#6B7280', display: 'inline-block' }} />
                {activeCat}
              </div>
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 3 }}>
                {drillTxns.length} transaction{drillTxns.length !== 1 ? 's' : ''} · {fmt(drillTxns.reduce((s, t) => s + Math.abs(t.amount), 0))} total
              </div>
            </div>
            <button
              onClick={() => setActiveCat(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
            >×</button>
          </div>
          {drillTxns.length === 0 ? (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No transactions found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {drillTxns.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 4px',
                    borderBottom: i < drillTxns.length - 1 ? '1px solid #2A2D3E22' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.desc}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{t.date}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', fontFamily: 'DM Mono' }}>
                    {fmt(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
