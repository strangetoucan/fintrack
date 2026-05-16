import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import AccentButton from '../components/ui/AccentButton';
import Icon from '../components/ui/Icon';
import AddAccountModal from '../components/modals/AddAccountModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmt, fmtK } from '../utils/format';
import { fetchAccounts, fetchAccountSummary, deleteAccount } from '../api/accounts';
import { useAccent } from '../context/TweakContext';

const TYPE_LABEL = {
  savings:     'Savings',
  salary:      'Salary',
  current:     'Current',
  credit_card: 'Credit Card',
  wallet:      'Wallet',
  cash:        'Cash',
};

export default function Accounts() {
  const accent = useAccent();
  const [accounts,    setAccounts   ] = useState([]);
  const [summary,     setSummary    ] = useState(null);
  const [modal,       setModal      ] = useState(null); // null | 'add' | {editing acct}
  const [confirmDlg,  setConfirmDlg ] = useState(null); // null | { message, onConfirm }

  const load = () => {
    fetchAccounts().then(setAccounts).catch(() => {});
    fetchAccountSummary().then(setSummary).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (acct) => {
    setConfirmDlg({
      message: `Delete "${acct.name}"? This cannot be undone.`,
      onConfirm: async () => { await deleteAccount(acct.id); load(); },
    });
  };

  const creditAccounts  = accounts.filter((a) => a.account_type === 'credit_card');
  const liquidAccounts  = accounts.filter((a) => a.account_type !== 'credit_card');

  return (
    <>
      <div
        className="fade-in"
        style={{
          padding:       'var(--content-pad, 24px)',
          overflowY:     'auto',
          height:        '100%',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--content-gap, 14px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Accounts & Balances</div>
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
              Track your bank accounts, wallets and credit cards
            </div>
          </div>
          <AccentButton onClick={() => setModal('add')}>
            <Icon name="plus" size={15} color="#000" /> Add Account
          </AccentButton>
        </div>

        {/* KPI Row */}
        <div className="kpi-row" style={{ gap: 'var(--content-gap, 14px)' }}>
          <StatCard
            label="Total Liquid"
            value={summary ? fmt(summary.liquid_balance) : '—'}
            sub={`${liquidAccounts.length} account${liquidAccounts.length !== 1 ? 's' : ''}`}
            trend="up"
          />
          <StatCard
            label="Credit Card Owed"
            value={summary ? fmt(summary.credit_owed) : '—'}
            sub={`${creditAccounts.length} card${creditAccounts.length !== 1 ? 's' : ''}`}
            trend={summary?.credit_owed > 0 ? 'down' : 'up'}
          />
          <StatCard
            label="Net Bank Balance"
            value={summary ? fmt(summary.total_balance) : '—'}
            sub="Liquid minus credit owed"
            trend={summary?.total_balance >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="Total Accounts"
            value={summary ? String(summary.account_count) : '—'}
            sub="Banks + wallets + cash"
            trend="up"
          />
        </div>

        {/* Liquid accounts */}
        {liquidAccounts.length > 0 && (
          <Card>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Bank Accounts & Wallets</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {liquidAccounts.map((acct, i) => (
                <div
                  key={acct.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 0',
                    borderBottom: i < liquidAccounts.length - 1 ? '1px solid #1E2130' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: acct.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="accounts" size={18} color={acct.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{acct.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {acct.bank_name} · {TYPE_LABEL[acct.account_type] ?? acct.account_type}
                      </div>
                      {acct.notes && (
                        <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{acct.notes}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'DM Mono', color: '#E8EAF0' }}>
                        {fmt(acct.balance)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setModal(acct)}
                        style={{
                          background: '#1E2130', border: '1px solid #2A2D3E', borderRadius: 8,
                          padding: '6px 12px', color: '#9CA3AF', fontSize: 12,
                          fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(acct)}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, padding: '6px 12px', color: '#EF4444',
                          fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Credit cards */}
        {creditAccounts.length > 0 && (
          <Card>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Credit Cards</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              Outstanding balance counts as a liability in your net worth
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {creditAccounts.map((acct, i) => (
                <div
                  key={acct.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 0',
                    borderBottom: i < creditAccounts.length - 1 ? '1px solid #1E2130' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#EF444422',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="subscriptions" size={18} color="#EF4444" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{acct.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{acct.bank_name}</div>
                      {acct.notes && (
                        <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{acct.notes}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'DM Mono', color: '#EF4444' }}>
                        -{fmt(acct.balance)}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>outstanding</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setModal(acct)}
                        style={{
                          background: '#1E2130', border: '1px solid #2A2D3E', borderRadius: 8,
                          padding: '6px 12px', color: '#9CA3AF', fontSize: 12,
                          fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(acct)}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, padding: '6px 12px', color: '#EF4444',
                          fontSize: 12, fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {accounts.length === 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>
              <Icon name="accounts" size={36} color="#374151" />
              <div style={{ marginTop: 14, fontSize: 14 }}>No accounts added yet</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Add your bank accounts, wallets and credit cards to track your real balances.
              </div>
              <button
                onClick={() => setModal('add')}
                style={{
                  marginTop: 18, padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: accent, color: '#000', fontFamily: 'DM Sans',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Add First Account
              </button>
            </div>
          </Card>
        )}
      </div>

      {modal && (
        <AddAccountModal
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
