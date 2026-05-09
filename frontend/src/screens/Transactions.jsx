import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import AccentButton from '../components/ui/AccentButton';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import { fmt } from '../utils/format';
import { fetchTransactions, deleteTransaction } from '../api/transactions';
import { useAccent } from '../context/TweakContext';

export default function Transactions() {
  const [search,   setSearch  ] = useState('');
  const [filter,   setFilter  ] = useState('all');
  const [rows,     setRows    ] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [apiDown,  setApiDown ] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sortBy,   setSortBy  ] = useState('created_at');
  const [sortDir,  setSortDir ] = useState('desc');
  const accent = useAccent();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({
        type:   filter !== 'all' ? filter : undefined,
        search: search || undefined,
      });
      setRows(data);
      setApiDown(false);
    } catch {
      setApiDown(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // noop — backend may not be running
    }
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

  const totalIncome  = rows.filter((t) => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpense;

  return (
    <>
      <div
        className="fade-in"
        style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Transactions</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
              {apiDown
                ? <span style={{ color: '#F59E0B' }}>⚠ Showing offline data — backend not connected</span>
                : 'All income & expense entries'
              }
            </div>
          </div>
          <AccentButton onClick={() => setShowModal(true)}>
            <Icon name="plus" size={15} color="#000" /> Add Entry
          </AccentButton>
        </div>

        {/* KPIs */}
        <div className="kpi-row" style={{ gap: 'var(--content-gap,14px)' }}>
          <StatCard label="Total Income"   value={fmt(totalIncome)}  trend="up"   sub={`${rows.filter(t=>t.type==='income').length} transactions`}  />
          <StatCard label="Total Expenses" value={fmt(totalExpense)} trend="down" sub={`${rows.filter(t=>t.type==='expense').length} transactions`} />
          <StatCard label="Net"            value={fmt(net)}          sub="Net cashflow" trend={net >= 0 ? 'up' : 'down'} />
        </div>

        {/* Table card */}
        <Card>
          {/* Search + filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 10,
              background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 9, padding: '8px 14px',
            }}>
              <Icon name="search" size={15} color="#6B7280" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions…"
                style={{ background: 'none', border: 'none', outline: 'none', color: '#E8EAF0', fontSize: 13, width: '100%', fontFamily: 'DM Sans' }}
              />
            </div>
            {['all', 'income', 'expense'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans',
                  background: filter === f ? accent : '#1F2333',
                  color:      filter === f ? '#000' : '#9CA3AF',
                  transition: 'background 0.15s',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Loading shimmer */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280', fontSize: 13 }}>
              Loading transactions…
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 150px 110px 36px', minWidth: 480 }}>
                {[
                  { label: 'Transaction', col: null },
                  { label: 'Category',    col: null },
                  { label: 'Txn Date',    col: 'date' },
                  { label: 'Amount',      col: null },
                  { label: '',            col: null },
                ].map(({ label, col }) => (
                  <div
                    key={label}
                    onClick={col ? () => toggleSort(col) : undefined}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      color: col && sortBy === col ? '#E8EAF0' : '#6B7280',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '8px 12px', borderBottom: '1px solid #2A2D3E',
                      cursor: col ? 'pointer' : 'default',
                      userSelect: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {label}
                    {col && sortBy === col && (
                      <span style={{ fontSize: 10 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                ))}

                {sortedRows.length === 0 && (
                  <div style={{ gridColumn: '1/-1', padding: '32px 12px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                    No transactions found.
                  </div>
                )}

                {sortedRows.map((t) => (
                  <React.Fragment key={t.id}>
                    {/* Description */}
                    <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
                      </div>
                    </div>
                    {/* Category */}
                    <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      <Badge color="#3B82F6">{t.category}</Badge>
                    </div>
                    {/* Date */}
                    <div className="tx-date-col" style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#6B7280', fontSize: 12.5 }}>
                      <span>{typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().slice(0, 10)}</span>
                      {t.created_at && (
                        <span style={{ fontSize: 11, marginTop: 2 }}>
                          {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {/* Amount */}
                    <div style={{ padding: '13px 12px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13.5, color: t.type === 'income' ? accent : '#EF4444' }}>
                        {t.type === 'income' ? '+' : ''}{fmt(t.amount)}
                      </span>
                    </div>
                    {/* Delete */}
                    <div style={{ padding: '13px 6px', borderBottom: '1px solid #2A2D3E22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
                      >
                        ×
                      </button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onAdded={load}
        />
      )}
    </>
  );
}
