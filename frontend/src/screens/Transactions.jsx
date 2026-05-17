import React, { useState, useEffect, useCallback } from 'react';

const useIsMobile = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w <= 640;
};
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Icon from '../components/ui/Icon';
import AccentButton from '../components/ui/AccentButton';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import RecurringModal from '../components/modals/RecurringModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmt } from '../utils/format';
import { fetchTransactions, deleteTransaction, bulkDeleteTransactions } from '../api/transactions';
import { fetchRecurring, deleteRecurring, updateRecurring } from '../api/recurring';
import { useAccent } from '../context/TweakContext';

const ALL_CATS = [
  'Salary','Freelance','Interest','Dividend','Rental Income','Bonus','Other Income',
  'Rent','Groceries','Food & Dining','Transport','Utilities','Entertainment',
  'Shopping','Healthcare','Insurance','Investment','Education','EMI/Loan','Other',
].sort();

function exportCSV(rows) {
  const headers = ['Date','Description','Category','Type','Amount (Rs)','Tags','Investment'];
  const lines = rows.map((t) => [
    t.date,
    `"${(t.desc || '').replace(/"/g, '""')}"`,
    t.category,
    t.type,
    t.amount,
    t.tags || '',
    t.investment_name || '',
  ].join(','));
  const csv = '﻿' + [headers.join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Transactions() {
  const accent = useAccent();
  const isMobile = useIsMobile();

  // filter state
  const [search,    setSearch   ] = useState('');
  const [typeFilter,setTypeFilter] = useState('all');
  const [category,  setCategory ] = useState('');
  const [dateFrom,  setDateFrom ] = useState('');
  const [dateTo,    setDateTo   ] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // data state
  const [rows,      setRows     ] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [apiDown,   setApiDown  ] = useState(false);
  const [sortBy,    setSortBy   ] = useState('created_at');
  const [sortDir,   setSortDir  ] = useState('desc');

  // modal state
  const [showModal,  setShowModal ] = useState(false);
  const [prefill,    setPrefill   ] = useState(null);  // recurring "Log Now" prefill

  // bulk select state
  const [selected,     setSelected    ] = useState(new Set());
  const [bulkConfirm,  setBulkConfirm ] = useState(false);

  // tab
  const [activeTab,  setActiveTab ] = useState('transactions');

  // recurring state
  const [recurring,  setRecurring ] = useState([]);
  const [recurModal,  setRecurModal ] = useState(null); // null | 'add' | {editing}
  const [confirmDlg,  setConfirmDlg ] = useState(null);

  // ── Load transactions ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({
        type:      typeFilter !== 'all' ? typeFilter : undefined,
        search:    search    || undefined,
        category:  category  || undefined,
        date_from: dateFrom  || undefined,
        date_to:   dateTo    || undefined,
        tag:       tagFilter || undefined,
      });
      setRows(data);
      setApiDown(false);
    } catch {
      setApiDown(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
    setSelected(new Set());
    setBulkConfirm(false);
  }, [typeFilter, search, category, dateFrom, dateTo, tagFilter]);

  const loadRecurring = useCallback(() => {
    fetchRecurring().then(setRecurring).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadRecurring(); }, [loadRecurring]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await deleteTransaction(id).catch(() => {});
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await bulkDeleteTransactions(ids).catch(() => {});
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    setBulkConfirm(false);
  };

  const toggleSelect = (id) => setSelected((prev) => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const handleDeleteRecurring = (id) => {
    setConfirmDlg({
      message: 'Delete this recurring template? This cannot be undone.',
      onConfirm: async () => {
        await deleteRecurring(id).catch(() => {});
        setRecurring((prev) => prev.filter((r) => r.id !== id));
      },
    });
  };

  const toggleRecurringActive = async (rec) => {
    await updateRecurring(rec.id, { active: !rec.active }).catch(() => {});
    loadRecurring();
  };

  const logNow = (rec) => {
    setPrefill({ type: rec.type, desc: rec.desc, category: rec.category, amount: rec.amount, investment_id: rec.investment_id, tags: rec.tags });
    setShowModal(true);
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const sortedRows = [...rows].sort((a, b) => {
    const av = sortBy === 'date' ? a.date : (a.created_at ?? a.date);
    const bv = sortBy === 'date' ? b.date : (b.created_at ?? b.date);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((r) => selected.has(r.id));
  const someSelected       = selected.size > 0 && !allVisibleSelected;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedRows.map((r) => r.id)));
    }
  };

  const totalIncome  = rows.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net          = totalIncome - totalExpense;

  const hasFilters = search || category || dateFrom || dateTo || tagFilter || typeFilter !== 'all';

  const inputStyle = {
    background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 9,
    padding: '7px 12px', color: '#E8EAF0', fontSize: 12.5, fontFamily: 'DM Sans',
  };

  return (
    <>
      <div
        className="fade-in"
        style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Transactions</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
              {apiDown
                ? <span style={{ color: '#F59E0B' }}>⚠ Backend not connected</span>
                : 'All income & expense entries'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {activeTab === 'transactions' && rows.length > 0 && !isMobile && (
              <button
                onClick={() => exportCSV(sortedRows)}
                style={{
                  ...inputStyle, padding: '8px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontWeight: 600, fontSize: 12.5,
                }}
              >
                <Icon name="import" size={13} color="#9CA3AF" /> Export CSV
              </button>
            )}
            <AccentButton onClick={() => { setPrefill(null); setShowModal(true); }}>
              <Icon name="plus" size={15} color="#000" /> Add Entry
            </AccentButton>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <StatCard label="Total Income"   value={fmt(totalIncome)}  trend="up"   sub={`${rows.filter(t=>t.type==='income').length} transactions`}  />
          <StatCard label="Total Expenses" value={fmt(totalExpense)} trend="down" sub={`${rows.filter(t=>t.type==='expense').length} transactions`} />
          <StatCard label="Net"            value={fmt(net)}          sub="Net cashflow" trend={net >= 0 ? 'up' : 'down'} />
          <StatCard label="Recurring"      value={String(recurring.filter(r=>r.active).length)} sub={`${recurring.length} templates total`} trend="up" />
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['transactions', 'recurring'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                background: activeTab === tab ? accent : '#1F2333',
                color:      activeTab === tab ? '#000' : '#9CA3AF',
              }}
            >
              {tab === 'transactions' ? 'Transactions' : 'Recurring'}
            </button>
          ))}
        </div>

        {/* ── TRANSACTIONS TAB ────────────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <Card>
            {/* Filter row 1: search + type */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{
                flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10,
                background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 9, padding: '7px 14px',
              }}>
                <Icon name="search" size={14} color="#6B7280" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description or category…"
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#E8EAF0', fontSize: 13, width: '100%', fontFamily: 'DM Sans' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>
              {['all', 'income', 'expense'].map((f) => (
                <button
                  key={f} onClick={() => setTypeFilter(f)}
                  style={{
                    padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans',
                    background: typeFilter === f ? accent : '#1F2333',
                    color:      typeFilter === f ? '#000' : '#9CA3AF',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Filter row 2: category + date range + tag */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', minWidth: 150 }}
              >
                <option value="">All Categories</option>
                {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <input
                type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                style={{ ...inputStyle }} title="From date"
              />
              <input
                type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                style={{ ...inputStyle }} title="To date"
              />

              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1F2333', border: `1px solid ${tagFilter ? accent + '80' : '#2A2D3E'}`,
                borderRadius: 9, padding: '7px 12px', flex: 1, minWidth: 120,
              }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>#</span>
                <input
                  value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Filter by tag…"
                  style={{ background: 'none', border: 'none', outline: 'none', color: '#E8EAF0', fontSize: 12.5, width: '100%', fontFamily: 'DM Sans' }}
                />
                {tagFilter && (
                  <button onClick={() => setTagFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>

              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter('all'); setCategory(''); setDateFrom(''); setDateTo(''); setTagFilter(''); }}
                  style={{ ...inputStyle, cursor: 'pointer', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Bulk delete bar */}
            {selected.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                background: bulkConfirm ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${bulkConfirm ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.3)'}`,
              }}>
                {bulkConfirm ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', flex: 1 }}>
                      ⚠ Permanently delete {selected.size} transaction{selected.size > 1 ? 's' : ''}? This cannot be undone.
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      style={{
                        padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: '#EF4444', color: '#fff', fontFamily: 'DM Sans',
                        fontSize: 12.5, fontWeight: 700,
                      }}
                    >Confirm Delete</button>
                    <button
                      onClick={() => setBulkConfirm(false)}
                      style={{
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        background: 'transparent', border: '1px solid #2A2D3E',
                        color: '#9CA3AF', fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600,
                      }}
                    >Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>
                      {selected.size} selected
                    </span>
                    <button
                      onClick={() => setBulkConfirm(true)}
                      style={{
                        padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                        fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 700,
                      }}
                    >Delete Selected</button>
                    <button
                      onClick={() => setSelected(new Set())}
                      style={{
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        background: 'transparent', border: '1px solid #2A2D3E',
                        color: '#9CA3AF', fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600,
                      }}
                    >Clear</button>
                  </>
                )}
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280', fontSize: 13 }}>Loading…</div>
            )}

            {!loading && isMobile && (
              <div>
                {/* Mobile select-all row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #2A2D3E', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: accent, width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Select all · {sortedRows.length} entries
                  </span>
                  <button
                    onClick={() => toggleSort('date')}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: sortBy === 'date' ? '#E8EAF0' : '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    Date {sortBy === 'date' && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </div>

                {sortedRows.length === 0 && (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                    {hasFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
                  </div>
                )}

                {sortedRows.map((t) => {
                  const txTags  = t.tags ? t.tags.split(',').map((s) => s.trim()).filter(Boolean) : [];
                  const isChecked = selected.has(t.id);
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '1px solid #1E2130' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(t.id)}
                        style={{ cursor: 'pointer', accentColor: accent, width: 14, height: 14, marginTop: 9, flexShrink: 0 }}
                      />
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                        background: t.type === 'income' ? accent + '22' : 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={t.type === 'income' ? 'up' : 'down'} size={14} color={t.type === 'income' ? accent : '#EF4444'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {t.desc}
                          </div>
                          <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13, color: t.type === 'income' ? accent : '#EF4444', flexShrink: 0 }}>
                            {t.type === 'income' ? '+' : ''}{fmt(t.amount)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, gap: 8 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, flex: 1 }}>
                            <span style={{
                              fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                              background: '#1F2333', color: '#9CA3AF', border: '1px solid #2A2D3E',
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}>{t.category}</span>
                            <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                              {typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().slice(0, 10)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                            <button
                              onClick={() => { setPrefill(t); setShowModal(true); }} title="Edit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px 6px', borderRadius: 6 }}
                            ><Icon name="edit" size={13} color="currentColor" /></button>
                            <button
                              onClick={() => handleDelete(t.id)} title="Delete"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px 6px', borderRadius: 6, fontSize: 16, lineHeight: 1 }}
                            >×</button>
                          </div>
                        </div>
                        {t.investment_name && (
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10 }}>📈</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.investment_name}</span>
                          </div>
                        )}
                        {txTags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {txTags.map((tag) => (
                              <span
                                key={tag}
                                onClick={() => setTagFilter(tag)}
                                style={{
                                  fontSize: 10.5, padding: '1px 7px', borderRadius: 99,
                                  background: accent + '18', color: accent,
                                  cursor: 'pointer', fontWeight: 600,
                                }}
                              >#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !isMobile && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 130px 150px 110px 68px', minWidth: 520 }}>
                  {/* Select-all checkbox */}
                  <div style={{ padding: '8px 8px 8px 12px', borderBottom: '1px solid #2A2D3E', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: accent, width: 14, height: 14 }}
                    />
                  </div>
                  {[
                    { label: 'Transaction', col: null },
                    { label: 'Category',    col: null },
                    { label: 'Txn Date',    col: 'date' },
                    { label: 'Amount',      col: null },
                    { label: '',            col: null },
                  ].map(({ label, col }) => (
                    <div
                      key={label} onClick={col ? () => toggleSort(col) : undefined}
                      style={{
                        fontSize: 11, fontWeight: 600,
                        color: col && sortBy === col ? '#E8EAF0' : '#6B7280',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '8px 12px', borderBottom: '1px solid #2A2D3E',
                        cursor: col ? 'pointer' : 'default', userSelect: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {label}
                      {col && sortBy === col && <span style={{ fontSize: 10 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </div>
                  ))}

                  {sortedRows.length === 0 && (
                    <div style={{ gridColumn: '1/-1', padding: '32px 12px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                      {hasFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
                    </div>
                  )}

                  {sortedRows.map((t) => {
                    const txTags  = t.tags ? t.tags.split(',').map((s) => s.trim()).filter(Boolean) : [];
                    const isChecked = selected.has(t.id);
                    return (
                      <React.Fragment key={t.id}>
                        {/* Checkbox */}
                        <div style={{ padding: '11px 8px 11px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(t.id)}
                            style={{ cursor: 'pointer', accentColor: accent, width: 14, height: 14 }}
                          />
                        </div>
                        {/* Description + tags */}
                        <div style={{ padding: '11px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: t.type === 'income' ? accent + '22' : 'rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon name={t.type === 'income' ? 'up' : 'down'} size={14} color={t.type === 'income' ? accent : '#EF4444'} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.desc}
                            </div>
                            {t.investment_name && (
                              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 10 }}>📈</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.investment_name}</span>
                              </div>
                            )}
                            {txTags.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                {txTags.map((tag) => (
                                  <span
                                    key={tag}
                                    onClick={() => setTagFilter(tag)}
                                    style={{
                                      fontSize: 10.5, padding: '1px 7px', borderRadius: 99,
                                      background: accent + '18', color: accent,
                                      cursor: 'pointer', fontWeight: 600,
                                    }}
                                    title="Filter by this tag"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Category */}
                        <div style={{ padding: '11px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                            background: '#1F2333', color: '#9CA3AF', border: '1px solid #2A2D3E',
                            whiteSpace: 'nowrap',
                          }}>{t.category}</span>
                        </div>
                        {/* Date */}
                        <div style={{ padding: '11px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#6B7280', fontSize: 12.5 }}>
                          <span>{typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().slice(0, 10)}</span>
                          {t.created_at && (
                            <span style={{ fontSize: 11, marginTop: 2 }}>
                              {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {/* Amount */}
                        <div style={{ padding: '11px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13.5, color: t.type === 'income' ? accent : '#EF4444' }}>
                            {t.type === 'income' ? '+' : ''}{fmt(t.amount)}
                          </span>
                        </div>
                        {/* Actions: edit + delete */}
                        <div style={{ padding: '11px 6px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <button
                            onClick={() => { setPrefill(t); setShowModal(true); }} title="Edit"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4, borderRadius: 6 }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#9CA3AF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
                          ><Icon name="edit" size={13} color="currentColor" /></button>
                          <button
                            onClick={() => handleDelete(t.id)} title="Delete"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4, borderRadius: 6 }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
                          >×</button>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── RECURRING TAB ───────────────────────────────────────────────── */}
        {activeTab === 'recurring' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Recurring Templates</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Click "Log Now" to add this month's entry with one click
                </div>
              </div>
              <button
                onClick={() => setRecurModal('add')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 9, border: 'none',
                  background: accent, color: '#000', fontFamily: 'DM Sans',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Icon name="plus" size={13} color="#000" /> New Template
              </button>
            </div>

            {recurring.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
                <div style={{ fontSize: 14 }}>No recurring templates yet</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Add templates for salary, SIPs, rent — log them each month in one click.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recurring.map((rec, i) => (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: i < recurring.length - 1 ? '1px solid #1E2130' : 'none',
                      opacity: rec.active ? 1 : 0.45,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: rec.type === 'income' ? accent + '22' : 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon name={rec.type === 'income' ? 'up' : 'down'} size={14} color={rec.type === 'income' ? accent : '#EF4444'} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.desc}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>
                          {rec.category} · Day {rec.day_of_month} of month
                        </div>
                        {rec.tags && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {rec.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                              <span key={tag} style={{
                                fontSize: 10.5, padding: '1px 7px', borderRadius: 99,
                                background: accent + '18', color: accent, fontWeight: 600,
                              }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13.5, color: rec.type === 'income' ? accent : '#EF4444', marginRight: 4 }}>
                        {rec.type === 'income' ? '+' : '-'}{fmt(rec.amount)}
                      </span>
                      <button
                        onClick={() => logNow(rec)}
                        title="Log this month's entry"
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: 'none',
                          background: accent, color: '#000', fontSize: 11.5,
                          fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Log Now
                      </button>
                      <button
                        onClick={() => setRecurModal(rec)}
                        style={{
                          padding: '5px 10px', borderRadius: 8,
                          border: '1px solid #2A2D3E', background: '#1E2130',
                          color: '#9CA3AF', fontSize: 11.5, fontFamily: 'DM Sans',
                          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >Edit</button>
                      <button
                        onClick={() => toggleRecurringActive(rec)}
                        title={rec.active ? 'Pause' : 'Activate'}
                        style={{
                          padding: '5px 10px', borderRadius: 8,
                          border: `1px solid ${rec.active ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                          background: rec.active ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                          color: rec.active ? '#F59E0B' : '#22C55E',
                          fontSize: 11.5, fontFamily: 'DM Sans', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >{rec.active ? 'Pause' : 'Resume'}</button>
                      <button
                        onClick={() => handleDeleteRecurring(rec.id)}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, padding: '5px 10px', color: '#EF4444',
                          fontSize: 11.5, fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                        }}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {showModal && (
        <AddTransactionModal
          onClose={() => { setShowModal(false); setPrefill(null); }}
          onAdded={load}
          initialValues={prefill}
        />
      )}

      {recurModal && (
        <RecurringModal
          onClose={() => setRecurModal(null)}
          onSaved={() => { setRecurModal(null); loadRecurring(); }}
          editing={recurModal === 'add' ? null : recurModal}
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
