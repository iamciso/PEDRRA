/* EDPS brand palette — EU blue #003399, EDPS gold #FFCC00 */
export const C = {
  primary: '#003399',
  dark: '#001a4d',
  light: '#e6ecf5',
  text: '#1a1a2e',
  muted: '#5a6577',
  dim: '#8e99a9',
  border: '#d4dbe6',
  bg: '#f4f6fa',
  white: '#FFFFFF',
  success: '#2e7d32',
  error: '#c62828',
  warning: '#e65100',
  accent: '#FFCC00',
  purple: '#6366f1',
  gold: '#FFCC00',
};

/* Dark mode color palette — EDPS dark variant */
export const CD = {
  primary: '#6699cc',
  dark: '#0a0f1e',
  light: '#1e2d4a',
  text: '#e0e4eb',
  muted: '#99a5b5',
  dim: '#6b7a8d',
  border: '#3a4556',
  bg: '#111827',
  white: '#1e2433',
  surface: '#1e2433',
  success: '#66bb6a',
  error: '#ef5350',
  warning: '#ffa726',
  accent: '#FFCC00',
  purple: '#A5B4FC',
  gold: '#FFCC00',
};

export const phaseColor = { before: '#6366f1', live: C.primary, after: C.success };
export const phaseLabel = { before: 'Before Training', live: 'Training Day', after: 'After Training' };
export const itemIcon = { doc: '\u{1F4C4}', slides: '\u{1F4CA}', quiz: '\u2753', survey: '\u{1F4CB}' };

/* EDPS-style poll answer colors */
export const ANS = [
  { bg: '#003399', shape: '\u25B2', label: 'A' },
  { bg: '#0055a4', shape: '\u25C6', label: 'B' },
  { bg: '#FFCC00', shape: '\u25CF', label: 'C' },
  { bg: '#2e7d32', shape: '\u25A0', label: 'D' },
];

/* Badge definitions */
export const BADGE_DEFS = [
  { id: 'first-steps', name: 'First Steps', icon: '\u{1F463}', desc: 'Complete your first activity', condition_desc: 'Complete any 1 activity' },
  { id: 'speed-demon', name: 'Speed Demon', icon: '\u26A1', desc: 'Answer a quiz in record time', condition_desc: 'Answer a quiz question in under 3 seconds' },
  { id: 'perfect-score', name: 'Perfect Score', icon: '\u{1F3AF}', desc: 'Get 100% on a quiz', condition_desc: 'Score 100% on any quiz' },
  { id: 'bookworm', name: 'Bookworm', icon: '\u{1F4DA}', desc: 'Read all training documents', condition_desc: 'Open every document in a training' },
  { id: 'social-butterfly', name: 'Social Butterfly', icon: '\u{1F98B}', desc: 'Participate in chat discussions', condition_desc: 'Send 10 or more chat messages' },
  { id: 'team-player', name: 'Team Player', icon: '\u{1F91D}', desc: 'Respond to all polls', condition_desc: 'Vote in every poll during a live session' },
  { id: 'completionist', name: 'Completionist', icon: '\u{1F3C6}', desc: 'Complete all activities in a training', condition_desc: 'Finish every activity across all phases' },
  { id: 'early-bird', name: 'Early Bird', icon: '\u{1F426}', desc: 'Complete pre-training tasks ahead of time', condition_desc: 'Finish all before-training activities early' },
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

export const editorTab = (active) => ({
  flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 600,
  border: 'none', background: 'transparent', cursor: 'pointer',
  borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
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

/* Video layout for slide presentations */
export const videoLayout = {
  container: {
    position: 'relative', width: '100%', paddingBottom: '56.25%',
    background: '#000', borderRadius: 8, overflow: 'hidden',
  },
  inner: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '8px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
    display: 'flex', alignItems: 'center', gap: 8,
  },
};
