import { useAccent } from '../../context/TweakContext';

export default function AccentButton({ children, onClick, style = {} }) {
  const accent = useAccent();
  return (
    <button
      onClick={onClick}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        background:  accent,
        color:       '#000',
        border:      'none',
        borderRadius: 10,
        padding:     '9px 18px',
        fontWeight:  600,
        fontSize:    13,
        cursor:      'pointer',
        fontFamily:  'inherit',
        transition:  'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
