export default function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background:           'var(--card-bg, #1A1D27)',
        border:               'var(--card-border, 1px solid #2A2D3E)',
        borderRadius:         'var(--card-radius, 14px)',
        padding:              'var(--card-pad, 20px)',
        backdropFilter:       'var(--card-blur, none)',
        WebkitBackdropFilter: 'var(--card-blur, none)',
        boxShadow:            'var(--card-shadow, none)',
        transition:           'all 0.3s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
