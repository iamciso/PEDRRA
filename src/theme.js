export const C = {
  primary: '#0C4DA2',
  dark: '#082F66',
  light: '#E8EFF8',
  text: '#2D3748',
  muted: '#718096',
  dim: '#A0AEC0',
  border: '#E2E8F0',
  bg: '#F7FAFC',
  white: '#FFFFFF',
  success: '#38A169',
  error: '#E53E3E',
  warning: '#ED8936',
  accent: '#FFF200',
  purple: '#6366f1',
};

export const phaseColor = { before: '#6366f1', live: C.primary, after: C.success };
export const phaseLabel = { before: 'Before Training', live: 'Training Day', after: 'After Training' };
export const itemIcon = { doc: '\u{1F4C4}', slides: '\u{1F4CA}', quiz: '\u{2753}', survey: '\u{1F4CB}' };

export const ANS = [
  { bg: '#E21B3C', shape: '\u25B2', label: 'A' },
  { bg: '#1368CE', shape: '\u25C6', label: 'B' },
  { bg: '#D89E00', shape: '\u25CF', label: 'C' },
  { bg: '#26890C', shape: '\u25A0', label: 'D' },
];

/* Reusable style helpers */
export const card = {
  background: C.white, borderRadius: 12, padding: 20,
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: `1px solid ${C.border}`,
};
export const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
});
export const btnOutline = (c = C.primary) => ({
  background: 'transparent', color: c, border: `2px solid ${c}`,
  borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
});
export const input = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit',
};
export const header = {
  background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
  padding: '10px 20px', display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', flexWrap: 'wrap', gap: 8,
};
export const tab = (active) => ({
  padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  border: 'none', background: 'transparent',
  borderBottom: active ? `3px solid ${C.primary}` : '3px solid transparent',
  color: active ? C.primary : C.dim,
});
