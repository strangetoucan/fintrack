import { createContext, useContext } from 'react';

export const PALETTES = {
  green:  { hex: '#22C55E', dark: '#16A34A', name: 'Growth Green'    },
  indigo: { hex: '#6366F1', dark: '#4F46E5', name: 'Premium Indigo'  },
  rose:   { hex: '#F43F5E', dark: '#E11D48', name: 'Bold Rose'       },
  amber:  { hex: '#F59E0B', dark: '#D97706', name: 'Warm Amber'      },
  sky:    { hex: '#0EA5E9', dark: '#0284C7', name: 'Clear Sky'       },
};

export const SURFACES = {
  flat: {
    cardBg:  '#1A1D27',
    sideBg:  '#13161F',
    border:  '1px solid #2A2D3E',
    radius:  14,
    blur:    'none',
    shadow:  'none',
  },
  frosted: {
    cardBg:  'rgba(255,255,255,0.04)',
    sideBg:  'rgba(10,12,20,0.85)',
    border:  '1px solid rgba(255,255,255,0.08)',
    radius:  18,
    blur:    'blur(18px) saturate(160%)',
    shadow:  '0 4px 32px rgba(0,0,0,0.35)',
  },
  outlined: {
    cardBg:  'transparent',
    sideBg:  'transparent',
    border:  '1px solid rgba(255,255,255,0.13)',
    radius:  10,
    blur:    'none',
    shadow:  'none',
  },
};

export const DENSITIES = {
  focused:  { pad: 32, gap: 20, cardPad: 28, fontSize: 14, rowPad: '16px 14px' },
  balanced: { pad: 24, gap: 14, cardPad: 20, fontSize: 13, rowPad: '13px 12px' },
  analyst:  { pad: 16, gap: 10, cardPad: 14, fontSize: 12, rowPad: '9px 10px'  },
};

export const TWEAK_DEFAULTS = {
  palette: 'indigo',
  density: 'balanced',
  surface: 'frosted',
};

export const TweakCtx = createContext(TWEAK_DEFAULTS);

export const useTweakCtx = () => useContext(TweakCtx);

export const useAccent = () => {
  const { palette } = useTweakCtx();
  return PALETTES[palette]?.hex ?? '#6366F1';
};
