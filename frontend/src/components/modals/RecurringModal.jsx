import { useState, useEffect, useRef } from 'react';
import Icon from '../ui/Icon';
import { useAccent } from '../../context/TweakContext';
import { createRecurring, updateRecurring } from '../../api/recurring';
import { fetchInvestments } from '../../api/investments';

const INCOME_CATS  = ['Salary', 'Freelance', 'Interest', 'Dividend', 'Rental Income', 'Bonus', 'Other Income'];
const EXPENSE_CATS = ['Rent', 'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Insurance', 'Investment', 'Education', 'EMI/Loan', 'Other'];
const INVESTMENT_CATS = new Set(['Investment', 'Dividend']);

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };

function parseTags(str) {
  if (!str) return [];
  return str.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export default function RecurringModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const [type,         setType        ] = useState(editing?.type          ?? 'expense');
  const [desc,         setDesc        ] = useState(editing?.desc          ?? '');
  const [category,     setCategory    ] = useState(editing?.category      ?? '');
  const [amount,       setAmount      ] = useState(editing?.amount        ? String(Math.abs(editing.amount)) : '');
  const [dayOfMonth,   setDayOfMonth  ] = useState(editing?.day_of_month  ?? 1);
  const [active,       setActive      ] = useState(editing?.active        ?? true);
  const [investmentId, setInvestmentId] = useState(editing?.investment_id ? String(editing.investment_id) : '');
  const [investments,  setInvestments ] = useState([]);
  const [tags,         setTags        ] = useState(parseTags(editing?.tags));
  const [tagInput,     setTagInput    ] = useState('');
  const [loading,      setLoading     ] = useState(false);
  const [error,        setError       ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  useEffect(() => { fetchInvestments().then(setInvestments).catch(() => {}); }, []);

  const categories    = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const showInvPicker = INVESTMENT_CATS.has(category);

  const inputStyle = {
    width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
    borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
    fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/,/g, '');
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput('');
  };

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && tags.length) setTags((p) => p.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!desc.trim() || !category || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Amount must be positive.'); return; }
    const day = parseInt(dayOfMonth);
    if (isNaN(day) || day < 1 || day > 28) { setError('Day must be between 1 and 28.'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = {
        desc: desc.trim(), category, amount: num, type,
        investment_id: investmentId ? Number(investmentId) : null,
        day_of_month: day, active,
        tags: tags.length ? tags.join(',') : null,
      };
      if (editing) await updateRecurring(editing.id, payload);
      else         await createRecurring(payload);
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
        width: '100%', maxWidth: 440, background: '#1A1D27',
        border: '1px solid #2A2D3E', borderRadius: 18, padding: 24,
        fontFamily: 'DM Sans', color: '#E8EAF0',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{editing ? 'Edit Recurring' : 'New Recurring Template'}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Logs automatically repeat every month</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', background: '#0F1117', borderRadius: 11, padding: 3, marginBottom: 22 }}>
            {['income', 'expense'].map((t) => {
              const isActive = type === t;
              return (
                <button
                  key={t} type="button" onClick={() => { setType(t); setCategory(''); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
                    background: isActive ? (t === 'income' ? accent : '#EF4444') : 'transparent',
                    color: isActive ? '#000' : '#6B7280', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon name={t === 'income' ? 'up' : 'down'} size={13} color={isActive ? '#000' : '#6B7280'} />
                  {t === 'income' ? 'Income' : 'Expense'}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span style={fieldLabel}>Description</span>
              <input
                className="modal-input" value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. HDFC SIP — Nifty 50" style={inputStyle} required autoFocus
              />
            </label>

            <label>
              <span style={fieldLabel}>Category</span>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
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

            {showInvPicker && (
              <label>
                <span style={fieldLabel}>Link to Investment <span style={{ color: '#6B7280', fontWeight: 400 }}>(optional)</span></span>
                <select
                  value={investmentId} onChange={(e) => setInvestmentId(e.target.value)}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Amount (₹)</span>
                <input
                  className="modal-input" type="number" min="0.01" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" style={inputStyle} required
                />
              </label>
              <label>
                <span style={fieldLabel}>Day of Month</span>
                <input
                  className="modal-input" type="number" min="1" max="28"
                  value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}
                  style={inputStyle} required
                />
              </label>
            </div>

            {/* Tags */}
            <div>
              <span style={fieldLabel}>Tags <span style={{ color: '#6B7280', fontWeight: 400 }}>(optional)</span></span>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {tags.map((tag) => (
                    <span key={tag} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: accent + '22', color: accent,
                      padding: '3px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600,
                    }}>
                      #{tag}
                      <button type="button" onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                className="modal-input" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey} onBlur={addTag}
                placeholder="Type a tag and press Enter…" style={inputStyle}
              />
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1F2333', borderRadius: 9, padding: '10px 14px' }}>
              <span style={{ fontSize: 13.5, color: '#E8EAF0' }}>Active</span>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                style={{
                  width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: active ? accent : '#374151', transition: 'background 0.2s',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: active ? 20 : 3,
                  width: 16, height: 16, borderRadius: 99, background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
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
            <button type="button" onClick={onClose} style={{
              padding: '10px 22px', borderRadius: 10, border: '1px solid #2A2D3E',
              background: 'transparent', color: '#9CA3AF', fontFamily: 'DM Sans',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: accent, color: '#000', fontFamily: 'DM Sans',
              fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Icon name="check" size={14} color="#000" />
              {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
