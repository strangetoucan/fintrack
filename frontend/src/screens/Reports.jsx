import { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { useAccent } from '../context/TweakContext';
import { fmt, fmtK } from '../utils/format';
import { apiFetch } from '../api/client';

const CAT_COLORS = {
  'Rent': '#3B82F6', 'Groceries': '#22C55E', 'Food & Dining': '#F59E0B',
  'Transport': '#A78BFA', 'Utilities': '#06B6D4', 'Entertainment': '#EC4899',
  'Shopping': '#F97316', 'Healthcare': '#14B8A6', 'Insurance': '#8B5CF6',
  'Investment': '#EAB308', 'Education': '#64748B', 'EMI/Loan': '#EF4444',
};

export default function Reports() {
  const [monthly,  setMonthly ] = useState([]);
  const [allTxns,  setAllTxns ] = useState([]);
  const [year,     setYear    ] = useState('all');
  const accent = useAccent();

  useEffect(() => {
    apiFetch('/transactions/monthly-summary').then(setMonthly).catch(() => {});
    apiFetch('/transactions/?limit=500').then(setAllTxns).catch(() => {});
  }, []);

  // derive available years from data
  const availableYears = useMemo(() => {
    const years = [...new Set(monthly.map((m) => m.month.slice(0, 4)))].sort().reverse();
    return years;
  }, [monthly]);

  // filter monthly data by selected year
  const filteredMonthly = useMemo(() =>
    year === 'all' ? monthly : monthly.filter((m) => m.month.startsWith(year)),
    [monthly, year]
  );

  // filter transactions by selected year
  const filteredTxns = useMemo(() =>
    year === 'all' ? allTxns : allTxns.filter((t) => t.date.startsWith(year)),
    [allTxns, year]
  );

  // compute category spend from filtered transactions
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
  const donutSegs   = catSpend.slice(0, 8).map((c) => ({ value: c.value, color: c.color }));

  const periodLabel = year === 'all' ? 'All Time' : year;

  return (
    <div
      className="fade-in"
      style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Reports & Analytics</div>
          <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Financial insights — {periodLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setYear('all')}
            style={{
              padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
              background: year === 'all' ? accent : '#1F2333',
              color:      year === 'all' ? '#000'  : '#9CA3AF',
            }}
          >
            All Time
          </button>
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans',
                background: year === y ? accent : '#1F2333',
                color:      year === y ? '#000' : '#9CA3AF',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <StatCard label="Total Income"    value={fmtK(totalIncome)}   sub={`${filteredMonthly.length} month${filteredMonthly.length !== 1 ? 's' : ''}`} trend="up" />
        <StatCard label="Total Expenses"  value={fmtK(totalExpense)}  sub={periodLabel} trend="down" />
        <StatCard label="Total Saved"     value={fmtK(totalSavings)}  sub={`${savingsRate}% savings rate`} trend={totalSavings >= 0 ? 'up' : 'down'} />
        <StatCard label="Largest Expense" value={topCat ? fmtK(topCat.value) : '—'} sub={topCat ? `${topCat.name} (${topCatPct}%)` : 'No data'} />
      </div>

      <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <Card style={{ flex: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Income vs Expenses</div>
              <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>Monthly breakdown — {periodLabel}</div>
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
          <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>{periodLabel}</div>
          {donutSegs.length > 0 ? (
            <DonutChart segments={donutSegs} size={160} thickness={28} label={fmtK(totalExpense)} sublabel="total" />
          ) : (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 60 }}>No expense data</div>
          )}
        </Card>
      </div>

      <Card>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Monthly Savings Trend</div>
        <div style={{ color: '#6B7280', fontSize: 12, marginBottom: 16 }}>Net savings per month — {periodLabel}</div>
        {savingsData.length > 0 ? (
          <BarChart data={savingsData} labels={chartLabels} color={accent} height={120} />
        ) : (
          <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No data for this period</div>
        )}
      </Card>

      <div className="chart-row" style={{ gap: 'var(--content-gap,14px)' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Top Expense Categories</div>
          {catSpend.length === 0 && (
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', padding: 16 }}>No expenses for this period</div>
          )}
          {catSpend.slice(0, 6).map(({ name, value, color }) => {
            const pct = totalExpense ? ((value / totalExpense) * 100).toFixed(1) : 0;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 6, height: 32, borderRadius: 3, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Mono' }}>{fmt(value)}</span>
                  </div>
                  <div style={{ height: 4, background: '#2A2D3E', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                  </div>
                </div>
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
    </div>
  );
}
