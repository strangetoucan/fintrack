import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) {
  const dlgRef = useRef(null);
  useEffect(() => { dlgRef.current?.showModal(); }, []);

  return (
    <dialog
      ref={dlgRef} onClose={onCancel}
      onClick={(e) => { if (e.target === dlgRef.current) onCancel(); }}
      style={{ padding: 0, border: 'none', background: 'transparent', maxWidth: 'none', margin: 'auto' }}
    >
      <div style={{
        width: 340, background: '#1A1D27', border: '1px solid #2A2D3E',
        borderRadius: 16, padding: '24px 24px 20px', fontFamily: 'DM Sans',
        color: '#E8EAF0', boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Confirm</div>
        <div style={{ fontSize: 13.5, color: '#9CA3AF', lineHeight: 1.5, marginBottom: 22 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px', borderRadius: 9, border: '1px solid #2A2D3E',
              background: 'transparent', color: '#9CA3AF', fontFamily: 'DM Sans',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: danger ? '#EF4444' : '#3B82F6',
              color: '#fff', fontFamily: 'DM Sans',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
