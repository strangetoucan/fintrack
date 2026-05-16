import { useState, useEffect, useRef } from 'react';
import { useAccent } from '../../context/TweakContext';
import { createSubscription, updateSubscription } from '../../api/subscriptions';

const CATEGORIES = ['Entertainment', 'Productivity', 'Cloud & Storage', 'AI & Tools', 'Health & Fitness', 'News & Media', 'Other'];
const CYCLES     = [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly']];
const STATUSES   = [['active', 'Active'], ['paused', 'Paused'], ['cancelled', 'Cancelled']];

const lbl = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };
const inp = {
  width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
  borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
  fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
};

export default function SubscriptionModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const isEdit = !!editing;

  const [name,    setName   ] = useState(editing?.name         ?? '');
  const [amount,  setAmount ] = useState(editing?.amount       ? String(editing.amount) : '');
  const [cycle,   setCycle  ] = useState(editing?.billing_cycle ?? 'monthly');
  const [cat,     setCat    ] = useState(editing?.category      ?? 'Other');
  const [nextBill,setNextBill] = useState(editing?.next_billing ?? '');
  const [status,  setStatus ] = useState(editing?.status        ?? 'active');
  const [notes,   setNotes  ] = useState(editing?.notes         ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt <= 0) {
      setError('Name and a valid amount are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name:          name.trim(),
        amount:        amt,
        billing_cycle: cycle,
        category:      cat,
        next_billing:  nextBill || null,
        status,
        notes:         notes.trim() || null,
      };
      if (isEdit) {
        await updateSubscription(editing.id, payload);
      } else {
        await createSubscription(payload);
      }
      onSaved?.();
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
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? 'Edit Subscription' : 'Add Subscription'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <label>
              <span style={lbl}>Service Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix, iCloud, Spotify" style={inp} autoFocus required />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={lbl}>Amount (₹)</span>
                <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inp} required />
              </label>
              <div>
                <span style={lbl}>Billing Cycle</span>
                <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <span style={lbl}>Category</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => setCat(c)} style={{
                    padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                    background: cat === c ? accent : '#1F2333',
                    color:      cat === c ? '#000'  : '#6B7280',
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={lbl}>Next Billing Date</span>
                <input type="date" value={nextBill} onChange={(e) => setNextBill(e.target.value)} style={{ ...inp, colorScheme: 'dark' }} />
              </label>
              <div>
                <span style={lbl}>Status</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {STATUSES.map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setStatus(v)} style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600,
                      background: status === v ? accent : '#1F2333',
                      color:      status === v ? '#000'  : '#6B7280',
                    }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label>
              <span style={lbl}>Notes <span style={{ color: '#4B5563' }}>— optional</span></span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Family plan, shared with..." style={inp} />
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
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
