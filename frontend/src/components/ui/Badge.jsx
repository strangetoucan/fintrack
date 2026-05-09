import { useAccent } from '../../context/TweakContext';

export default function Badge({ children, color }) {
  const accent = useAccent();
  const c = color || accent;
  return (
    <span style={{
      background:   c + '22',
      color:        c,
      fontSize:     11,
      fontWeight:   600,
      padding:      '2px 8px',
      borderRadius: 99,
      fontFamily:   'DM Sans',
      whiteSpace:   'nowrap',
    }}>
      {children}
    </span>
  );
}
