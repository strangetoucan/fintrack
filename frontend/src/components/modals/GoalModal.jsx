import { useState } from 'react';
import { useAccent } from '../../context/TweakContext';
import { createGoal, updateGoal } from '../../api/goals';

const PRESET_COLORS = [
  '#22C55E', '#3B82F6', '#A78BFA', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#8B5CF6',
];

const PRESET_ICONS = ['🛡', '✈', '💻', '🏠', '🚗', '📚', '💍', '🏖', '🎓', '💰', '🏋', '🎮'];

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };
const inputStyle = {
  width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
  borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
  fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
};

export default function GoalModal({ onClose, onSaved, editing }) {
  const accent = useAccent();
  const isEdit = !!editing;

  const [name,     setName    ] = useState(editing?.name     ?? '');
  const [target,   setTarget  ] = useState(editing?.target   ? String(editing.target)  : '');
  const [current,  setCurrent ] = useState(editing?.current  ? String(editing.current) : '');
  const [deadline, setDeadline] = useState(editing?.deadline ?? '');
  const [color,    setColor   ] = useState(editing?.color    ?? PRESET_COLORS[0]);
  const [icon,     setIcon    ] = useState(editing?.icon     ?? PRESET_ICONS[0]);
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tgt = parseFloat(target);
    const cur = parseFloat(current);
    if (!name.trim() || !deadline.trim() || isNaN(tgt) || tgt <= 0 || isNaN(cur) || cur < 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { name: name.trim(), target: tgt, current: cur, deadline: deadline.trim(), color, icon };
      if (isEdit) await updateGoal(editing.id, payload);
      else        await createGoal(payload);
      onSaved?.();
      onClose();
    } catch {
      setError('Could not save — is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: '#1A1D27', border: '1px solid #2A2D3E', borderRadius: 18, padding: 24, fontFamily: 'DM Sans', color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? 'Edit Goal' : 'New Savings Goal'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span style={fieldLabel}>Goal Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" style={inputStyle} autoFocus required />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <span style={fieldLabel}>Target Amount (₹)</span>
                <input type="number" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
              <label>
                <span style={fieldLabel}>Saved So Far (₹)</span>
                <input type="number" min="0" step="1" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" style={inputStyle} required />
              </label>
            </div>

            <label>
              <span style={fieldLabel}>Target Deadline</span>
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="e.g. Dec 2026" style={inputStyle} required />
            </label>

            <div>
              <span style={fieldLabel}>Icon</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic} type="button" onClick={() => setIcon(ic)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 18, border: 'none', cursor: 'pointer',
                      background: icon === ic ? accent + '33' : '#1F2333',
                      outline: icon === ic ? `2px solid ${accent}` : '2px solid transparent',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span style={fieldLabel}>Color</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c} type="button" onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                      outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
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
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
