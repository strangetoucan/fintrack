import { useState, useEffect, useRef } from 'react';
import { useAccent } from '../../context/TweakContext';
import { createBudgetCategory, updateBudgetCategory } from '../../api/budget';

const PRESET_COLORS = [
  '#3B82F6', '#22C55E', '#F59E0B', '#A78BFA', '#06B6D4',
  '#EC4899', '#F97316', '#14B8A6', '#8B5CF6', '#EF4444',
  '#10B981', '#6366F1', '#EAB308', '#64748B', '#84CC16',
];

const fieldLabel = { fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6, display: 'block' };
const inputStyle = {
  width: '100%', background: '#1F2333', border: '1px solid #2A2D3E',
  borderRadius: 9, padding: '10px 14px', color: '#E8EAF0',
  fontSize: 13.5, fontFamily: 'DM Sans', boxSizing: 'border-box',
};

export default function BudgetCategoryModal({ onClose, onSaved, editing }) {
  const accent   = useAccent();
  const isEdit   = !!editing;
  const [name,   setName  ] = useState(editing?.name   ?? '');
  const [budget, setBudget] = useState(editing?.budget ? String(editing.budget) : '');
  const [color,  setColor ] = useState(editing?.color  ?? PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState('');
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = parseFloat(budget);
    if (!name.trim() || isNaN(num) || num <= 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await updateBudgetCategory(editing.id, { budget: num, color });
      } else {
        await createBudgetCategory({ name: name.trim(), budget: num, color });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message?.includes('400') ? 'Category name already exists.' : 'Could not save — is the backend running?');
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dlgRef} onClose={onClose}
      onClick={(e) => { if (e.target === dlgRef.current) onClose(); }}
      style={{ padding: 0, border: 'none', background: 'transparent', maxWidth: 'none' }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: '#1A1D27', border: '1px solid #2A2D3E', borderRadius: 18, padding: 24, fontFamily: 'DM Sans', color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{isEdit ? 'Edit Category' : 'New Budget Category'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span style={fieldLabel}>Category Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries"
                style={{ ...inputStyle, opacity: isEdit ? 0.5 : 1 }}
                disabled={isEdit}
                autoFocus={!isEdit}
                required
              />
              {isEdit && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Name cannot be changed after creation</div>}
            </label>

            <label>
              <span style={fieldLabel}>Monthly Budget (₹)</span>
              <input
                type="number" min="1" step="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                style={inputStyle}
                autoFocus={isEdit}
                required
              />
            </label>

            <div>
              <span style={fieldLabel}>Color</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
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
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
