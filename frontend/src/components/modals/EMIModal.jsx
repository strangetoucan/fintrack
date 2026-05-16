import { useState, useEffect, useRef } from 'react';
import { useAccent } from '../../context/TweakContext';
import { createEmi, updateEmi } from '../../api/goals';

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };
const inputStyle = {
  width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
  borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
  fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
};

export default function EMIModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const isEdit = !!editing;

  const [name,        setName       ] = useState(editing?.name        ?? '');
  const [bank,        setBank       ] = useState(editing?.bank        ?? '');
  const [emi,         setEmi        ] = useState(editing?.emi         ? String(editing.emi)         : '');
  const [outstanding, setOutstanding] = useState(editing?.outstanding ? String(editing.outstanding) : '');
  const [totalLoan,   setTotalLoan  ] = useState(editing?.total_loan  ? String(editing.total_loan)  : '');
  const [endDate,     setEndDate    ] = useState(editing?.end_date    ?? '');
  const [loading,     setLoading    ] = useState(false);
  const [error,       setError      ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emiAmt  = parseFloat(emi);
    const outAmt  = parseFloat(outstanding);
    const loanAmt = parseFloat(totalLoan);
    if (!name.trim() || !bank.trim() || !endDate.trim() || isNaN(emiAmt) || isNaN(outAmt) || isNaN(loanAmt)) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(), bank: bank.trim(),
        emi: emiAmt, outstanding: outAmt, total_loan: loanAmt,
        end_date: endDate.trim(),
      };
      if (isEdit) await updateEmi(editing.id, payload);
      else        await createEmi(payload);
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
      <div style={{ width: '100%', maxWidth: 440, background: '#1A1D27', border: '1px solid #2A2D3E', borderRadius: 18, padding: 24, fontFamily: 'DM Sans', color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? 'Edit EMI / Loan' : 'Add EMI / Loan'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span style={fieldLabel}>Loan Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car Loan — Maruti" style={inputStyle} autoFocus required />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Bank / Lender</span>
                <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. HDFC Bank" style={inputStyle} required />
              </label>
              <label>
                <span style={fieldLabel}>End Date</span>
                <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="e.g. Jun 2029" style={inputStyle} required />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>EMI / month (₹)</span>
                <input type="number" min="1" step="1" value={emi} onChange={(e) => setEmi(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
              <label>
                <span style={fieldLabel}>Total Loan (₹)</span>
                <input type="number" min="1" step="1" value={totalLoan} onChange={(e) => setTotalLoan(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
              <label>
                <span style={fieldLabel}>Outstanding (₹)</span>
                <input type="number" min="0" step="1" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid #2A2D3E', background: 'transparent', color: '#9CA3AF', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: accent, color: '#000', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add EMI'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
