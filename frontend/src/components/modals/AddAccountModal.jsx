import { useState, useEffect, useRef } from 'react';
import Icon from '../ui/Icon';
import { useAccent } from '../../context/TweakContext';
import { createAccount, updateAccount } from '../../api/accounts';

const ACCOUNT_TYPES = [
  { value: 'savings',     label: 'Savings Account' },
  { value: 'salary',      label: 'Salary Account'  },
  { value: 'current',     label: 'Current Account' },
  { value: 'credit_card', label: 'Credit Card'     },
  { value: 'wallet',      label: 'Digital Wallet'  },
  { value: 'cash',        label: 'Cash in Hand'    },
];

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#A78BFA', '#EC4899', '#06B6D4', '#F97316', '#EF4444'];

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };

const inputStyle = {
  width:        '100%',
  background:   '#1F2333',
  border:       '1px solid #2A2D3E',
  borderRadius: 9,
  padding:      '10px 14px',
  color:        '#E8EAF0',
  fontSize:     13.5,
  fontFamily:   'DM Sans',
  boxSizing:    'border-box',
};

export default function AddAccountModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const [name,        setName       ] = useState(editing?.name        ?? '');
  const [bankName,    setBankName   ] = useState(editing?.bank_name   ?? '');
  const [accountType, setAccountType] = useState(editing?.account_type ?? 'savings');
  const [balance,     setBalance    ] = useState(editing?.balance      != null ? String(Math.abs(editing.balance)) : '');
  const [color,       setColor      ] = useState(editing?.color        ?? '#3B82F6');
  const [notes,       setNotes      ] = useState(editing?.notes        ?? '');
  const [loading,     setLoading    ] = useState(false);
  const [error,       setError      ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setBankName(editing.bank_name);
      setAccountType(editing.account_type);
      setBalance(String(Math.abs(editing.balance)));
      setColor(editing.color);
      setNotes(editing.notes ?? '');
    }
  }, [editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !bankName.trim() || balance === '') {
      setError('Name, bank name and balance are required.');
      return;
    }
    const num = parseFloat(balance);
    if (isNaN(num) || num < 0) {
      setError('Balance must be a non-negative number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name:         name.trim(),
        bank_name:    bankName.trim(),
        account_type: accountType,
        balance:      num,
        color,
        notes:        notes.trim() || null,
      };
      if (editing) {
        await updateAccount(editing.id, payload);
      } else {
        await createAccount(payload);
      }
      onSaved?.();
      onClose();
    } catch {
      setError('Could not save — is the backend running?');
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dlgRef} onClose={onClose}
      onClick={(e) => { if (e.target === dlgRef.current) onClose(); }}
      style={{ padding: 0, border: 'none', background: 'transparent', maxWidth: 'none' }}
    >
      <div style={{
        background: '#161926', border: '1px solid #2A2D3E',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {editing ? 'Edit Account' : 'Add Bank Account'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Account Nickname</span>
                <input
                  className="modal-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HDFC Savings"
                  style={inputStyle}
                  required
                />
              </label>
              <label>
                <span style={fieldLabel}>Bank / Provider</span>
                <input
                  className="modal-input"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  style={inputStyle}
                  required
                />
              </label>
            </div>

            <label>
              <span style={fieldLabel}>Account Type</span>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                style={{
                  ...inputStyle, appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path fill='%236B7280' d='M0 0h10L5 6z'/></svg>\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                }}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={fieldLabel}>
                {accountType === 'credit_card' ? 'Outstanding Balance (₹)' : 'Current Balance (₹)'}
              </span>
              <input
                className="modal-input"
                type="number"
                min="0"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
                required
              />
              {accountType === 'credit_card' && (
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'block' }}>
                  Enter amount owed. It will be counted as a liability.
                </span>
              )}
            </label>

            <label>
              <span style={fieldLabel}>Color</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, background: c, border: 'none',
                      cursor: 'pointer', outline: color === c ? `2px solid #fff` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </label>

            <label>
              <span style={fieldLabel}>Notes <span style={{ color: '#6B7280', fontWeight: 400 }}>(optional)</span></span>
              <input
                className="modal-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Primary account, linked to UPI"
                style={inputStyle}
              />
            </label>
          </div>

          {error && (
            <div style={{
              marginTop: 14, fontSize: 12.5, color: '#EF4444',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 22px', borderRadius: 10,
                border: '1px solid #2A2D3E', background: 'transparent',
                color: '#9CA3AF', fontFamily: 'DM Sans', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: accent, color: '#000', fontFamily: 'DM Sans',
                fontSize: 13, fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.65 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Icon name="check" size={14} color="#000" />
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
