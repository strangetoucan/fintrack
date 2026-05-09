export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        finance: {
          bg:     '#0F1117',
          card:   '#1A1D27',
          card2:  '#1F2333',
          border: '#2A2D3E',
          text:   '#E8EAF0',
          muted:  '#6B7280',
          sub:    '#9CA3AF',
          red:    '#EF4444',
          yellow: '#F59E0B',
          blue:   '#3B82F6',
          purple: '#A78BFA',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
