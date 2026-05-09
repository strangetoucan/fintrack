import { useState, useEffect } from 'react';
import { useAccent } from '../../context/TweakContext';
import { fetchInvestmentTransactions } from '../../api/investments';
import { fmt } from '../../utils/format';

export default function InvestmentTxnsModal({ investment, onClose }) {
  const accent = useAccent();
  const [txns,    setTxns   ] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestmentTransactions(investment.id)
      .then(setTxns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [investment.id]);

  const totalInvested   = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalWithdrawn  = txns.filter((t) => t.type === 'income' ).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#1A1D27', border: '1px solid #2A2D3E', borderRadius: 18, padding: 24, fontFamily: 'DM Sans', color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{investment.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              {investment.platform} · {investment.type} · Transaction History
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
        </div>

        {/* Summary strip */}
        {txns.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexShrink: 0 }}>
            <div style={{ flex: 1, background: '#1F2333', borderRadius: 10, padding: '10px 14px', border: '1px solid #2A2D3E' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>INVESTED (via txns)</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700, color: '#EF4444' }}>
                {fmt(totalInvested)}
              </div>
            </div>
            {totalWithdrawn > 0 && (
              <div style={{ flex: 1, background: '#1F2333', borderRadius: 10, padding: '10px 14px', border: '1px solid #2A2D3E' }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>WITHDRAWN / DIVIDENDS</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700, color: accent }}>
                  +{fmt(totalWithdrawn)}
                </div>
              </div>
            )}
            <div style={{ flex: 1, background: '#1F2333', borderRadius: 10, padding: '10px 14px', border: '1px solid #2A2D3E' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>LINKED TRANSACTIONS</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 700 }}>{txns.length}</div>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && txns.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6B7280', fontSize: 13 }}>
              No linked transactions yet.<br />
              <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                When adding a transaction with category "Investment", select this fund from the dropdown.
              </span>
            </div>
          )}
          {!loading && txns.length > 0 && txns.map((t) => (
            <div
              key={t.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #2A2D3E22' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: t.type === 'income' ? accent + '22' : 'rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {t.type === 'income' ? '↑' : '↓'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.desc}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>{t.date}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700, color: t.type === 'income' ? accent : '#EF4444' }}>
                {t.type === 'income' ? '+' : ''}{fmt(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
