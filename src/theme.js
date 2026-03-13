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
export const itemIcon = { doc: '📄', slides: '📊', quiz: '❓', survey: '📋' };

export const ANS = [
  { bg: '#E21B3C', shape: '▲', label: 'A' },
  { bg: '#1368CE', shape: '◆', label: 'B' },
  { bg: '#D89E00', shape: '●', label: 'C' },
  { bg: '#26890C', shape: '■', label: 'D' },
];

/* Reusable style helpers */
export const card = {
  background: C.white, borderRadius: 12, padding: 20,
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: `1px solid ${C.border}`,
};

export const btn = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'opacity .15s',
});

export const btnSm = (bg, color = '#fff') => ({
  background: bg, color, border: 'none', borderRadius: 6,
  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
});

export const btnOutline = (c = C.primary) => ({
  background: 'transparent', color: c, border: `2px solid ${c}`,
  borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
});

export const input = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box',
  fontFamily: 'inherit', outline: 'none', color: C.text,
  transition: 'border-color .15s',
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

/* Admin layout helpers */
export const adminLayout = {
  display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif",
};

export const adminSidebar = {
  width: 220, background: C.dark, display: 'flex', flexDirection: 'column',
  position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
  boxShadow: '2px 0 8px rgba(0,0,0,.18)',
};

export const adminContent = {
  marginLeft: 220, flex: 1, background: C.bg, minHeight: '100vh',
  display: 'flex', flexDirection: 'column',
};

export const sidebarItem = (active) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 20px', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
  color: active ? C.accent : 'rgba(255,255,255,.75)',
  background: active ? 'rgba(255,255,255,.1)' : 'transparent',
  borderLeft: active ? `3px solid ${C.accent}` : '3px solid transparent',
  transition: 'all .15s', textDecoration: 'none', border: 'none', width: '100%', textAlign: 'left',
});

export const modal = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};

export const modalBox = {
  background: C.white, borderRadius: 14, padding: 28,
  width: '100%', maxWidth: 580, maxHeight: '90vh',
  overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
};

export const formGroup = {
  marginBottom: 16,
};

export const label = {
  display: 'block', fontSize: 12, fontWeight: 600, color: C.muted,
  textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4,
};

export const statCard = {
  background: C.white, borderRadius: 12, padding: '20px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: `1px solid ${C.border}`,
  display: 'flex', flexDirection: 'column', gap: 4,
};
