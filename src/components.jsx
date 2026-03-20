import { useState, useEffect, useRef, useCallback } from 'react';
import { C, ANS, card, btn, btnOutline, input, header, label, modal, modalBox, formGroup } from './theme';

/* ================================================================
   RESPONSIVE HOOK
   ================================================================ */
export function useResponsive() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isMobile: width < 640, isTablet: width < 768 };
}

/* ================================================================
   SWIPE HOOK
   ================================================================ */
export function useSwipe(onSwipeLeft, onSwipeRight, threshold = 50) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0, startY = 0;
    const onStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) onSwipeRight?.(); else onSwipeLeft?.();
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [onSwipeLeft, onSwipeRight, threshold]);
  return ref;
}

/* ================================================================
   DRAG & DROP HOOK
   ================================================================ */
export function useDragDrop(list, onReorder) {
  const dragIdx = useRef(null);
  const [overIdx, setOverIdx] = useState(null);

  const dragHandlers = useCallback((index) => ({
    draggable: true,
    onDragStart: (e) => {
      dragIdx.current = index;
      e.dataTransfer.effectAllowed = 'move';
      e.currentTarget.classList.add('dragging');
    },
    onDragEnd: (e) => {
      e.currentTarget.classList.remove('dragging');
      dragIdx.current = null;
      setOverIdx(null);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverIdx(index);
    },
    onDragLeave: () => setOverIdx(null),
    onDrop: (e) => {
      e.preventDefault();
      const from = dragIdx.current;
      if (from == null || from === index) { setOverIdx(null); return; }
      const newList = [...list];
      const [moved] = newList.splice(from, 1);
      newList.splice(index, 0, moved);
      onReorder(newList);
      dragIdx.current = null;
      setOverIdx(null);
    },
  }), [list, onReorder]);

  return { dragHandlers, overIdx };
}

/* ================================================================
   LEADERBOARD
   ================================================================ */
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
export function Leaderboard({ participants, currentParticipantId, compact, variant = 'participant' }) {
  const sorted = [...participants].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const count = compact ? 3 : 5;
  const top = sorted.slice(0, count);
  const isDark = variant === 'projector';
  const myRank = currentParticipantId ? sorted.findIndex((p) => p.id === currentParticipantId) + 1 : 0;

  if (!participants.length) return null;

  return (
    <div style={{ padding: compact ? 12 : 16 }}>
      {top.map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: compact ? '8px 10px' : '10px 14px', marginBottom: 6,
          background: p.id === currentParticipantId ? (isDark ? 'rgba(255,255,255,.15)' : C.light) : (isDark ? 'rgba(255,255,255,.06)' : '#fff'),
          borderRadius: 8, border: p.id === currentParticipantId ? `2px solid ${C.primary}` : `1px solid ${isDark ? 'rgba(255,255,255,.1)' : C.border}`,
          animation: 'leaderboardSlideIn .3s ease both',
          animationDelay: `${i * 0.08}s`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < 3 ? RANK_COLORS[i] : (isDark ? 'rgba(255,255,255,.15)' : C.bg),
            color: i < 3 ? '#fff' : (isDark ? '#fff' : C.muted), fontSize: 13, fontWeight: 800,
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: isDark ? '#fff' : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            {!compact && <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,.5)' : C.muted }}>{p.team}</div>}
          </div>
          <div style={{ fontSize: compact ? 14 : 16, fontWeight: 800, color: i === 0 ? '#FFD700' : (isDark ? '#fff' : C.primary) }}>
            {p.xp || 0} XP
          </div>
        </div>
      ))}
      {myRank > count && currentParticipantId && (
        <div style={{ textAlign: 'center', padding: 8, fontSize: 13, fontWeight: 600, color: isDark ? 'rgba(255,255,255,.7)' : C.muted }}>
          Your rank: #{myRank} of {sorted.length}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   XP POPUP ANIMATION
   ================================================================ */
export function XPPopup({ xp, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1300);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="xp-popup" style={{ top: '40%', left: '50%', transform: 'translateX(-50%)' }}>
      +{xp} XP
    </div>
  );
}

/* ================================================================
   HEADER
   ================================================================ */
export function Header({ left, right, children }) {
  return (
    <div style={header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
      {children}
    </div>
  );
}

/* ================================================================
   PROGRESS BAR
   ================================================================ */
export function ProgressBar({ done, total, color = C.primary, height = 8 }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

/* ================================================================
   SEARCH BAR
   ================================================================ */
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.dim }}>🔍</span>
      <input
        style={{ ...input, paddingLeft: 36, background: C.white }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, color: C.dim, cursor: 'pointer' }}
          aria-label="Clear search"
        >×</button>
      )}
    </div>
  );
}

/* ================================================================
   BADGE POPUP
   ================================================================ */
export function BadgePopup({ badge, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
      background: '#fff', borderRadius: 16, padding: '24px 32px', textAlign: 'center',
      boxShadow: '0 8px 40px rgba(0,0,0,.3)', zIndex: 9999, animation: 'badgeReveal .5s ease',
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>{badge.icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{badge.name}</div>
      <div style={{ fontSize: 13, color: C.muted }}>{badge.desc}</div>
    </div>
  );
}

/* ================================================================
   NOTIFICATION BELL
   ================================================================ */
export function NotificationBell({ notifications, onClear }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#fff', position: 'relative', padding: 4 }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        🔔
        {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -4, background: C.error, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.2)', width: 280, maxHeight: 320, overflowY: 'auto', zIndex: 1000, border: `1px solid ${C.border}` }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Notifications</span>
            {notifications.length > 0 && <button onClick={() => { onClear(); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 11, color: C.primary, cursor: 'pointer' }}>Clear all</button>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.dim, fontSize: 13 }}>No notifications</div>
          ) : notifications.slice(0, 10).map((n, i) => (
            <div key={i} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: n.read ? 'transparent' : C.light }}>
              <div style={{ fontSize: 13, color: C.text }}>{n.text}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{new Date(n.time).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   FORMATTED TEXT RENDERER (markdown-lite)
   ================================================================ */
function renderFormattedText(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const isHeading = line.startsWith('## ');
    const content = isHeading ? line.slice(3) : line;
    // Process inline formatting: **bold** and *italic*
    const parts = [];
    let remaining = content;
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={`${li}-b-${match.index}`}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`${li}-i-${match.index}`}>{match[3]}</em>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    if (parts.length === 0) parts.push(content);
    const lineEl = isHeading
      ? <span key={li} style={{ fontSize: '1.2em', fontWeight: 700, display: 'block', marginBottom: 4 }}>{parts}</span>
      : <span key={li}>{parts}</span>;
    return <span key={li}>{lineEl}{li < lines.length - 1 && <br />}</span>;
  });
}

/* ================================================================
   SLIDE
   ================================================================ */
export function Slide({ s, big, showNotes }) {
  if (!s) return null;
  const f = big ? 1 : 0.55;
  const layouts = {
    title:   { bg: `linear-gradient(135deg, ${C.primary}, ${C.dark})`, c: '#fff', align: 'center', title: 42 * f, body: 20 * f, pad: 50 * f },
    content: { bg: C.white, c: C.text, align: 'left', title: 28 * f, body: 16 * f, pad: 36 * f },
    quote:   { bg: C.light, c: C.primary, align: 'center', title: 22 * f, body: 20 * f, pad: 50 * f },
    twocol:  { bg: C.white, c: C.text, align: 'left', title: 28 * f, body: 15 * f, pad: 36 * f },
    bullets: { bg: C.white, c: C.text, align: 'left', title: 28 * f, body: 15 * f, pad: 36 * f },
    image:   { bg: C.bg, c: C.text, align: 'center', title: 26 * f, body: 14 * f, pad: 30 * f },
    video:   { bg: C.bg, c: C.text, align: 'center', title: 26 * f, body: 14 * f, pad: 30 * f },
  };
  const l = layouts[s.l] || layouts.content;
  const base = {
    background: l.bg, color: l.c, borderRadius: 12, padding: l.pad,
    minHeight: big ? 360 : 160, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', textAlign: l.align, border: `1px solid ${C.border}`,
  };

  // Two-column layout
  if (s.l === 'twocol') {
    return (
      <div style={base}>
        <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>{s.t}</h2>
        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          <div style={{ flex: 1, fontSize: l.body, lineHeight: 1.7, opacity: 0.9 }}>{renderFormattedText(s.c)}</div>
          <div style={{ width: 1, background: C.border, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: l.body, lineHeight: 1.7, opacity: 0.9 }}>{renderFormattedText(s.c2 || '')}</div>
        </div>
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Bullet list layout
  if (s.l === 'bullets') {
    const items = (s.c || '').split('\n').filter((line) => line.trim());
    return (
      <div style={base}>
        <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>{s.t}</h2>
        <ul style={{ margin: 0, paddingLeft: 24, listStyle: 'none' }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: l.body, lineHeight: 1.8, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <span style={{ color: C.primary, fontWeight: 700, fontSize: l.body * 1.1, flexShrink: 0 }}>▸</span>
              <span>{renderFormattedText(item)}</span>
            </li>
          ))}
        </ul>
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Image layout
  if (s.l === 'image') {
    return (
      <div style={base}>
        <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{s.t}</h2>
        {s.img ? (
          <img src={s.img} alt={s.t} style={{ maxWidth: '100%', maxHeight: big ? 300 : 140, objectFit: 'contain', borderRadius: 8, margin: '0 auto 12px' }} />
        ) : (
          <div style={{ width: '100%', height: big ? 200 : 100, background: C.border, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 14, marginBottom: 12 }}>
            🖼️ Image placeholder
          </div>
        )}
        {s.c && <div style={{ fontSize: l.body, lineHeight: 1.7, opacity: 0.9 }}>{renderFormattedText(s.c)}</div>}
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Video layout
  if (s.l === 'video') {
    const isYT = s.videoUrl && (s.videoUrl.includes('youtube.com') || s.videoUrl.includes('youtu.be'));
    const ytId = isYT ? s.videoUrl.match(/(?:youtu\.be\/|v=)([^&?#]+)/)?.[1] : null;
    return (
      <div style={base}>
        <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{s.t}</h2>
        {ytId ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, marginBottom: 12 }}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={s.t} />
          </div>
        ) : s.videoUrl ? (
          <video src={s.videoUrl} controls style={{ width: '100%', maxHeight: big ? 400 : 200, borderRadius: 8, marginBottom: 12 }} />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: C.dim, background: C.border, borderRadius: 8, marginBottom: 12 }}>🎬 Video placeholder</div>
        )}
        {s.c && <div style={{ fontSize: l.body, lineHeight: 1.7, opacity: 0.9 }}>{renderFormattedText(s.c)}</div>}
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Rating layout (1-5 stars)
  if (s.l === 'rating') {
    return (
      <div style={{ ...base, background: `linear-gradient(135deg, ${C.dark}, #1a1a2e)`, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 11 * f, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 * f }}>
          {s.xp > 0 ? `RATING · ${s.xp} XP` : 'RATING'}
        </div>
        <h2 style={{ fontSize: (l.title || 28 * f), fontWeight: 700, margin: '0 0 20px', lineHeight: 1.3, color: '#fff' }}>{s.t || s.text}</h2>
        {s.text && s.t && s.text !== s.t && <p style={{ fontSize: 18 * f, margin: '0 0 20px', opacity: 0.9 }}>{s.text}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 * f }}>
          {[1,2,3,4,5].map((n) => (
            <span key={n} style={{ fontSize: 40 * f, color: '#FFD700', opacity: 0.4, transition: 'opacity .3s' }}>★</span>
          ))}
        </div>
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Poll layout (Kahoot-style)
  if (s.l === 'poll') {
    const POLL_COLORS = ['#E21B3C', '#1368CE', '#D89E00', '#26890C'];
    return (
      <div style={{ ...base, background: `linear-gradient(135deg, ${C.dark}, #1a1a2e)`, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 11 * f, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 * f }}>
          {s.xp > 0 ? `POLL · ${s.xp} XP` : 'POLL'}
        </div>
        <h2 style={{ fontSize: l.title || 28 * f, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3, color: '#fff' }}>{s.t || s.text}</h2>
        {s.text && s.t && s.text !== s.t && <p style={{ fontSize: 18 * f, margin: '0 0 20px', opacity: 0.9 }}>{s.text}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 * f, marginTop: 8 }}>
          {(s.opts || []).map((opt, i) => (
            <div key={i} style={{
              background: POLL_COLORS[i % 4], borderRadius: 10 * f, padding: `${14 * f}px ${16 * f}px`,
              display: 'flex', alignItems: 'center', gap: 10 * f,
              fontSize: 15 * f, fontWeight: 700, color: '#fff',
            }}>
              <span style={{ fontSize: 20 * f }}>{ANS[i % 4]?.shape}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
            </div>
          ))}
        </div>
        {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
      </div>
    );
  }

  // Default layouts (title, content, quote)
  return (
    <div style={base}>
      <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{s.t}</h2>
      <div style={{ fontSize: l.body, lineHeight: 1.7, opacity: 0.9 }}>{renderFormattedText(s.c)}</div>
      {showNotes && s.notes && <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF9DB', borderRadius: 6, fontSize: 12, color: '#744210', borderLeft: '3px solid #ECC94B' }}>📝 {s.notes}</div>}
    </div>
  );
}

/* ================================================================
   PRESENTATION MODE (fullscreen slide viewer)
   ================================================================ */
export function PresentationMode({ slides, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const containerRef = useRef();

  const goNext = useCallback(() => setIdx((i) => Math.min(slides.length - 1, i + 1)), [slides.length]);
  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  // Swipe support for slide navigation
  const swipeRef = useSwipe(goNext, goPrev);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [slides.length, onClose, goNext, goPrev]);

  // Try fullscreen
  useEffect(() => {
    try { containerRef.current?.requestFullscreen?.(); } catch { /* noop */ }
    return () => { try { document.exitFullscreen?.(); } catch { /* noop */ } };
  }, []);

  return (
    <div ref={(el) => { containerRef.current = el; swipeRef.current = el; }} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: '#111',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Close button */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)',
        border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px',
        fontSize: 13, cursor: 'pointer', zIndex: 10, fontWeight: 600,
      }}>✕ Exit</button>

      {/* Slide */}
      <div style={{ width: '85vw', maxWidth: 960 }}>
        <Slide s={slides[idx]} big />
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: 'rgba(0,0,0,.6)',
      }}>
        <button onClick={goPrev} disabled={idx === 0}
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: idx === 0 ? '#555' : '#fff', borderRadius: 6, padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          ← Prev
        </button>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, fontWeight: 600 }}>
          {idx + 1} / {slides.length}
        </div>
        <button onClick={goNext} disabled={idx === slides.length - 1}
          style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: idx === slides.length - 1 ? '#555' : '#fff', borderRadius: 6, padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          Next →
        </button>
      </div>

      {/* Dot indicators */}
      <div style={{ position: 'absolute', bottom: 56, display: 'flex', gap: 6 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: i === idx ? '#fff' : 'rgba(255,255,255,.3)', transition: 'background .2s',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   PRESENTER VIEW (trainer's control panel with notes + poll controls)
   ================================================================ */
export function PresenterView({ slides, itemId, onClose, broadcast, activeQ, getResponseCount, getResponseDist, pushQuestion, revealAnswer, participantCount = 0 }) {
  const [idx, setIdx] = useState(0);
  const [pollLaunched, setPollLaunched] = useState(false);
  const ref = useRef();
  const startTimeRef = useRef(Date.now());
  const [clock, setClock] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);

  const slide = slides[idx];
  const nextSlide = slides[idx + 1] || null;
  const isPoll = slide?.l === 'poll' || slide?.l === 'rating';

  // Clock and elapsed timer
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date());
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const formatElapsed = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Broadcast navigation
  const navigate = (newIdx) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, newIdx));
    setIdx(clamped);
    setPollLaunched(false);
    broadcast('SLIDE_NAV', { slideIdx: clamped, itemId });
  };

  // Broadcast start on mount, end on close
  useEffect(() => {
    broadcast('PRESENT_START', { itemId, slides });
    return () => broadcast('PRESENT_END', {});
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); navigate(idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(idx - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (isPoll && !pollLaunched) handleLaunchPoll();
        else if (isPoll && pollLaunched && !activeQ?.revealed) handleReveal();
      }
      else if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [idx, slides.length, isPoll, pollLaunched, activeQ]);

  const handleLaunchPoll = () => {
    setPollLaunched(true);
    const s = slide;
    const opts = s.l === 'rating' ? ['1','2','3','4','5'] : s.opts;
    broadcast('PUSH_Q', {
      itemId, slideIdx: idx, text: s.text || s.t, opts, ok: s.ok ?? -1,
      xp: s.xp || 0, timer: s.timer || 30, fromPresentation: true,
      autoReveal: s.autoReveal || false, pollType: s.l,
    });
    if (pushQuestion) pushQuestion(itemId, idx, true);
  };

  const handleReveal = () => {
    if (revealAnswer) revealAnswer();
  };

  // Poll response data
  const responseKey = `${itemId}-slide-${idx}`;
  const respCount = isPoll && pollLaunched && getResponseCount ? getResponseCount(itemId, `slide-${idx}`) : 0;
  const respDist = isPoll && pollLaunched && getResponseDist ? getResponseDist(itemId, `slide-${idx}`) : [];

  return (
    <div ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: '#1a1a2e',
      display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(0,0,0,.4)', padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600 }}>
          Presenter View — Slide {idx + 1} of {slides.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, fontFamily: 'monospace' }}>
            🕐 {formatTime(clock)}
          </span>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, fontFamily: 'monospace' }}>
            ⏱ {formatElapsed(elapsed)}
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
            borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>✕ End Presentation</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: current slide */}
        <div style={{ flex: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 900 }}>
            <Slide s={slide} big showNotes={false} />
          </div>
        </div>

        {/* Right panel: preview + notes + controls */}
        <div style={{
          flex: 35, background: 'rgba(0,0,0,.3)', borderLeft: '1px solid rgba(255,255,255,.1)',
          display: 'flex', flexDirection: 'column', padding: 16, gap: 12, overflowY: 'auto',
        }}>
          {/* Next slide preview */}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Next Slide
            </div>
            {nextSlide ? (
              <div style={{ opacity: 0.7, transform: 'scale(0.85)', transformOrigin: 'top left' }}>
                <Slide s={nextSlide} />
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13, background: 'rgba(255,255,255,.05)', borderRadius: 8 }}>
                End of deck
              </div>
            )}
          </div>

          {/* Presenter notes */}
          {slide?.notes && (
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Notes
              </div>
              <div style={{
                background: '#FFF9DB', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#744210', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {slide.notes}
              </div>
            </div>
          )}

          {/* Poll controls */}
          {isPoll && (
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Poll Controls
              </div>
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 8, padding: 14 }}>
                {!pollLaunched ? (
                  <button onClick={handleLaunchPoll} style={{
                    background: C.success, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
                  }}>
                    Launch Poll
                  </button>
                ) : activeQ && !activeQ.revealed ? (
                  <>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>
                      {respCount}{participantCount > 0 ? ` / ${participantCount}` : ''} voted
                    </div>
                    {participantCount > 0 && (
                      <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ height: '100%', background: C.accent, borderRadius: 3, width: `${Math.min(100, (respCount / participantCount) * 100)}%`, transition: 'width .5s ease' }} />
                      </div>
                    )}
                    {activeQ.autoReveal && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textAlign: 'center', marginBottom: 8 }}>Auto-reveal when all vote</div>}
                    <button onClick={handleReveal} style={{
                      background: C.warning, color: '#fff', border: 'none', borderRadius: 8,
                      padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
                    }}>
                      Reveal Answer
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: C.accent, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                      Results Revealed
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>
                      {respCount} response{respCount !== 1 ? 's' : ''}
                    </div>
                    {respDist.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {(slide.opts || []).map((opt, i) => {
                          const total = respDist.reduce((s, d) => s + d, 0) || 1;
                          const pct = Math.round((respDist[i] || 0) / total * 100);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                              <div style={{ width: 16, height: 16, borderRadius: 3, background: ANS[i % 4]?.bg, flexShrink: 0 }} />
                              <span style={{ color: '#fff', flex: 1, textAlign: 'left' }}>{opt}</span>
                              <span style={{ color: 'rgba(255,255,255,.7)' }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div style={{
        background: 'rgba(0,0,0,.5)', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => navigate(idx - 1)} disabled={idx === 0} style={{
          background: 'rgba(255,255,255,.15)', border: 'none',
          color: idx === 0 ? '#555' : '#fff', borderRadius: 6, padding: '8px 18px',
          fontSize: 14, cursor: 'pointer', fontWeight: 600,
        }}>← Prev</button>
        <div style={{ display: 'flex', gap: 5 }}>
          {slides.map((s, i) => (
            <button key={i} onClick={() => navigate(i)} style={{
              width: s.l === 'poll' ? 14 : 10, height: 10, borderRadius: s.l === 'poll' ? 3 : '50%',
              border: 'none', cursor: 'pointer',
              background: i === idx ? '#fff' : s.l === 'poll' ? 'rgba(255,200,0,.5)' : 'rgba(255,255,255,.3)',
              transition: 'background .2s',
            }} />
          ))}
        </div>
        <button onClick={() => navigate(idx + 1)} disabled={idx === slides.length - 1} style={{
          background: 'rgba(255,255,255,.15)', border: 'none',
          color: idx === slides.length - 1 ? '#555' : '#fff', borderRadius: 6, padding: '8px 18px',
          fontSize: 14, cursor: 'pointer', fontWeight: 600,
        }}>Next →</button>
      </div>
    </div>
  );
}

/* ================================================================
   SURVEY QUESTION
   ================================================================ */
export function SurveyQuestion({ q, answers, setAnswers, readonly }) {
  const val = answers[q.id];
  const set = (v) => { if (!readonly) setAnswers((p) => ({ ...p, [q.id]: v })); };

  if (q.type === 'header') {
    return (
      <div style={{ marginBottom: 4, padding: '12px 12px 0', borderLeft: `3px solid ${C.primary}` }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
          {q.text}
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, padding: 14, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <p style={{ margin: '0 0 10px', fontSize: 14, color: C.text, lineHeight: 1.5 }}>{q.text}</p>

      {q.type === 'scale' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.dim, minWidth: 40 }}>Disagree</span>
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} onClick={() => set(v)} style={{
              width: 42, height: 42, borderRadius: 8,
              border: val === v ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: val === v ? C.light : '#fff', color: C.text,
              fontSize: 15, fontWeight: 600, cursor: readonly ? 'default' : 'pointer',
              opacity: readonly && val !== v ? 0.5 : 1,
            }}>{v}</button>
          ))}
          <span style={{ fontSize: 11, color: C.dim, minWidth: 40 }}>Agree</span>
        </div>
      )}

      {q.type === 'tf' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {(q.opts || ['True', 'False']).map((o, i) => (
            <button key={i} onClick={() => set(i)} style={{
              flex: 1, padding: 12, borderRadius: 8,
              border: val === i ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: val === i ? C.light : '#fff', color: C.text,
              fontSize: 14, fontWeight: 600, cursor: readonly ? 'default' : 'pointer',
            }}>{o}</button>
          ))}
        </div>
      )}

      {q.type === 'choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(q.opts || []).map((o, i) => (
            <button key={i} onClick={() => set(i)} style={{
              padding: '10px 14px', borderRadius: 8, textAlign: 'left',
              border: val === i ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: val === i ? C.light : '#fff', color: C.text,
              fontSize: 14, cursor: readonly ? 'default' : 'pointer',
            }}>{o}</button>
          ))}
        </div>
      )}

      {q.type === 'text' && (
        <textarea
          style={{ ...input, minHeight: 60, resize: 'vertical' }}
          value={val || ''}
          onChange={(e) => set(e.target.value)}
          readOnly={readonly}
          placeholder="Type your response..."
        />
      )}
    </div>
  );
}

/* ================================================================
   MODAL
   ================================================================ */
export function Modal({ open, onClose, title, children, maxWidth = 580 }) {
  const ref = useRef();
  const contentRef = useRef();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Focus trap: focus the first focusable element when modal opens
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const focusable = contentRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={modal}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
      ref={ref}
      role="dialog"
      aria-modal="true"
    >
      <div ref={contentRef} style={{ ...modalBox, maxWidth }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
            title="Close"
            aria-label="Close dialog"
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ================================================================
   CONFIRM DIALOG
   ================================================================ */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', confirmColor = C.error }) {
  if (!open) return null;
  return (
    <div style={{ ...modal, zIndex: 1100 }}>
      <div style={{ ...modalBox, maxWidth: 400 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnOutline()}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} style={btn(confirmColor)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TOAST
   ================================================================ */
export function Toast({ message, type = 'success', onClose }) {
  const colors = { success: C.success, error: C.error, info: C.primary, warning: C.warning };
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="toast" style={{ background: colors[type] || C.primary }}>
      {message}
    </div>
  );
}
