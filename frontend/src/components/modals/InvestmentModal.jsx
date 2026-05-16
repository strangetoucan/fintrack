import { useState, useEffect, useRef } from 'react';
import { useAccent } from '../../context/TweakContext';
import { createInvestment, updateInvestment } from '../../api/investments';

const TYPES = ['MF', 'Stock', 'FD', 'PPF'];

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };
const inputStyle = {
  width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
  borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
  fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
};

export default function InvestmentModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const isEdit = !!editing;

  const [name,     setName    ] = useState(editing?.name     ?? '');
  const [type,     setType    ] = useState(editing?.type     ?? 'MF');
  const [platform, setPlatform] = useState(editing?.platform ?? '');
  const [invested, setInvested] = useState(editing?.invested ? String(editing.invested) : '');
  const [current,  setCurrent ] = useState(editing?.current  ? String(editing.current)  : '');
  const [sip,      setSip     ] = useState(editing?.sip      ? String(editing.sip)      : '');
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const inv = parseFloat(invested);
    const cur = parseFloat(current);
    if (!name.trim() || !platform.trim() || isNaN(inv) || inv <= 0 || isNaN(cur) || cur <= 0) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(), type, platform: platform.trim(),
        invested: inv, current: cur,
        sip: sip ? parseFloat(sip) || null : null,
      };
      if (isEdit) {
        await updateInvestment(editing.id, payload);
      } else {
        await createInvestment(payload);
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
      <div style={{ width: '100%', maxWidth: 460, background: '#1A1D27', border: '1px solid #2A2D3E', borderRadius: 18, padding: 24, fontFamily: 'DM Sans', color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? 'Edit Investment' : 'Add Investment'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span style={fieldLabel}>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nifty 50 Index Fund" style={inputStyle} autoFocus required />
            </label>

            <div>
              <span style={fieldLabel}>Type</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPES.map((t) => (
                  <button
                    key={t} type="button" onClick={() => setType(t)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600,
                      background: type === t ? accent : '#1F2333',
                      color:      type === t ? '#000'  : '#6B7280',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <span style={fieldLabel}>Platform</span>
              <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="e.g. Groww, Zerodha, SBI" style={inputStyle} required />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Invested (₹)</span>
                <input type="number" min="1" step="0.01" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
              <label>
                <span style={fieldLabel}>Current Value (₹)</span>
                <input type="number" min="1" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
            </div>

            <label>
              <span style={fieldLabel}>Monthly SIP (₹) <span style={{ color: '#4B5563' }}>— optional</span></span>
              <input type="number" min="0" step="1" value={sip} onChange={(e) => setSip(e.target.value)} placeholder="Leave blank if no SIP" style={inputStyle} />
            </label>
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
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
