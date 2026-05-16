import { useState } from 'react';

export default function Card({ children, style = {}, className = '' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:           'var(--card-bg, #1A1D27)',
        border:               'var(--card-border, 1px solid #2A2D3E)',
        borderRadius:         'var(--card-radius, 14px)',
        padding:              'var(--card-pad, 20px)',
        backdropFilter:       'var(--card-blur, none)',
        WebkitBackdropFilter: 'var(--card-blur, none)',
        boxShadow:            hovered ? '0 10px 28px rgba(0, 0, 0, 0.35)' : 'var(--card-shadow, none)',
        transition:           'transform 0.22s ease, box-shadow 0.22s ease',
        transform:            hovered ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
