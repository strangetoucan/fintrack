import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { useAccent } from '../../context/TweakContext';
import { createTransaction } from '../../api/transactions';
import { fetchInvestments } from '../../api/investments';

const INCOME_CATS  = ['Salary', 'Freelance', 'Interest', 'Dividend', 'Rental Income', 'Bonus', 'Other Income'];
const EXPENSE_CATS = ['Rent', 'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Insurance', 'Investment', 'Education', 'EMI/Loan', 'Other'];

const INVESTMENT_CATS = new Set(['Investment', 'Dividend']);

const today = () => new Date().toISOString().slice(0, 10);

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };

export default function AddTransactionModal({ onClose, onAdded }) {
  const accent = useAccent();
  const [type,         setType        ] = useState('expense');
  const [desc,         setDesc        ] = useState('');
  const [category,     setCategory    ] = useState('');
  const [amount,       setAmount      ] = useState('');
  const [txDate,       setTxDate      ] = useState(today);
  const [investmentId, setInvestmentId] = useState('');
  const [investments,  setInvestments ] = useState([]);
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState('');

  useEffect(() => setCategory(''), [type]);
  useEffect(() => { fetchInvestments().then(setInvestments).catch(() => {}); }, []);

  const categories      = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const showInvPicker   = INVESTMENT_CATS.has(category);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!desc.trim() || !category || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createTransaction({
        date:          txDate,
        desc:          desc.trim(),
        category,
        amount:        type === 'expense' ? -Math.abs(num) : Math.abs(num),
        type,
        investment_id: investmentId ? Number(investmentId) : null,
      });
      onAdded?.();
      onClose();
    } catch {
      setError('Could not save — is the backend running?');
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: '#1A1D27',
          border: '1px solid #2A2D3E',
          borderRadius: 18,
          padding: '24px',
          fontFamily: 'DM Sans',
          color: '#E8EAF0',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Add Transaction</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Income / Expense toggle */}
          <div style={{ display: 'flex', background: '#0F1117', borderRadius: 11, padding: 3, marginBottom: 22 }}>
            {['income', 'expense'].map((t) => {
              const active = type === t;
              const bg     = active ? (t === 'income' ? accent : '#EF4444') : 'transparent';
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                    background: bg,
                    color: active ? '#000' : '#6B7280',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon name={t === 'income' ? 'up' : 'down'} size={13} color={active ? '#000' : '#6B7280'} />
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Description */}
            <label>
              <span style={fieldLabel}>Description</span>
              <input
                className="modal-input"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={type === 'income' ? 'e.g. Salary Credit' : 'e.g. Grocery — DMart'}
                style={inputStyle}
                required
                autoFocus
              />
            </label>

            {/* Category */}
            <label>
              <span style={fieldLabel}>Category</span>
              <select
                className="modal-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path fill='%236B7280' d='M0 0h10L5 6z'/></svg>\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                }}
                required
              >
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            {/* Investment link — shown when category is Investment or Dividend */}
            {showInvPicker && (
              <label>
                <span style={fieldLabel}>Link to Investment <span style={{ color: '#6B7280', fontWeight: 400 }}>(optional)</span></span>
                <select
                  value={investmentId}
                  onChange={(e) => setInvestmentId(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none',
                    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path fill='%236B7280' d='M0 0h10L5 6z'/></svg>\")",
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  }}
                >
                  <option value="">— Not linked —</option>
                  {investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.name} ({inv.type})</option>
                  ))}
                </select>
              </label>
            )}

            {/* Amount + Date side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Amount (₹)</span>
                <input
                  className="modal-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  required
                />
              </label>
              <label>
                <span style={fieldLabel}>Date</span>
                <input
                  className="modal-input"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </label>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              marginTop: 14, fontSize: 12.5, color: '#EF4444',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
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
                background: type === 'income' ? accent : '#EF4444',
                color: '#000', fontFamily: 'DM Sans', fontSize: 13,
                fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.65 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Icon name={type === 'income' ? 'up' : 'down'} size={14} color="#000" />
              {loading ? 'Saving…' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
