import { useEffect, useRef } from 'react';
import { C, card, btn, btnOutline, input, header, label, modal, modalBox, formGroup } from './theme';

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
   SLIDE
   ================================================================ */
export function Slide({ s, big }) {
  if (!s) return null;
  const f = big ? 1 : 0.55;
  const layouts = {
    title:   { bg: `linear-gradient(135deg, ${C.primary}, ${C.dark})`, c: '#fff', align: 'center', title: 42 * f, body: 20 * f, pad: 50 * f },
    content: { bg: C.white, c: C.text, align: 'left', title: 28 * f, body: 16 * f, pad: 36 * f },
    quote:   { bg: C.light, c: C.primary, align: 'center', title: 22 * f, body: 20 * f, pad: 50 * f },
  };
  const l = layouts[s.l] || layouts.content;
  return (
    <div style={{
      background: l.bg, color: l.c, borderRadius: 12, padding: l.pad,
      minHeight: big ? 360 : 160, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', textAlign: l.align, border: `1px solid ${C.border}`,
    }}>
      <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{s.t}</h2>
      <div style={{ fontSize: l.body, lineHeight: 1.7, whiteSpace: 'pre-wrap', opacity: 0.9 }}>{s.c}</div>
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

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={modal}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
      ref={ref}
    >
      <div style={{ ...modalBox, maxWidth }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
            title="Close"
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
