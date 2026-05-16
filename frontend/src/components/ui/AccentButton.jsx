import { useState } from 'react';
import { useAccent } from '../../context/TweakContext';

export default function AccentButton({ children, onClick, style = {} }) {
  const accent = useAccent();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        background:   accent,
        color:        '#000',
        border:       'none',
        borderRadius: 10,
        padding:      '9px 18px',
        fontWeight:   600,
        fontSize:     13,
        cursor:       'pointer',
        fontFamily:   'inherit',
        transition:   'transform 0.12s ease, box-shadow 0.12s ease',
        transform:    pressed ? 'scale(0.95)' : 'scale(1)',
        boxShadow:    hovered && !pressed ? `0 4px 16px ${accent}66` : 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
