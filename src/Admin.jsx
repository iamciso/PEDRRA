import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from './context.js';
import {
  C, phaseColor, phaseLabel, itemIcon, ANS,
  card, btn, btnSm, btnOutline, input, label, formGroup,
  sidebarItem, statCard,
} from './theme';
import { Modal, ConfirmDialog, Toast } from './components.jsx';
import { DEFAULT_COURSE } from './courseData.js';

/* ================================================================
   UTILITIES
   ================================================================ */
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const PHASE_OPTIONS = [
  { value: 'before', label: 'Before Training' },
  { value: 'live', label: 'Training Day' },
  { value: 'after', label: 'After Training' },
];

/* ================================================================
   SIDEBAR
   ================================================================ */
const ROLES = [
  { value: 'admin', label: 'Super Admin', desc: 'Full access: users, course, sessions, settings', color: '#E53E3E' },
  { value: 'facilitator', label: 'Facilitator', desc: 'Launch sessions, push questions, view results', color: '#6366f1' },
  { value: 'editor', label: 'Content Editor', desc: 'Edit course modules and items', color: '#ED8936' },
  { value: 'viewer', label: 'Viewer', desc: 'View course and results (read-only)', color: '#38A169' },
];

const ROLE_PERMISSIONS = {
  admin:       { users: true, modules: true, live: true, participants: true, results: true, settings: true },
  facilitator: { users: false, modules: false, live: true, participants: true, results: true, settings: false },
  editor:      { users: false, modules: true, live: false, participants: false, results: true, settings: false },
  viewer:      { users: false, modules: false, live: false, participants: true, results: true, settings: false },
};

function Sidebar({ activeTab, setTab, session, onLogout, courseName, currentUser }) {
  const perms = ROLE_PERMISSIONS[currentUser?.role] || ROLE_PERMISSIONS.viewer;
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard', show: true },
    { id: 'users', icon: '🔑', label: 'Users & Roles', show: perms.users },
    { id: 'modules', icon: '📚', label: 'Modules', show: true },
    { id: 'live', icon: session ? '🔴' : '📡', label: 'Live Session', show: perms.live },
    { id: 'participants', icon: '👥', label: 'Participants', show: perms.participants },
    { id: 'results', icon: '📊', label: 'Results & Analytics', show: perms.results },
    { id: 'settings', icon: '⚙️', label: 'Settings', show: perms.settings },
  ].filter((i) => i.show);

  return (
    <div className="admin-sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>PEDRRA</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2, letterSpacing: .5 }}>
          Admin Panel
        </div>
        <div style={{ fontSize: 11, color: C.accent, marginTop: 6, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {courseName}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={sidebarItem(activeTab === item.id)}
          >
            <span style={{ fontSize: 16, minWidth: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'live' && session && (
              <span style={{
                marginLeft: 'auto', fontSize: 10, background: C.error,
                color: '#fff', borderRadius: 8, padding: '1px 6px', fontWeight: 700,
              }}>LIVE</span>
            )}
          </button>
        ))}
      </nav>

      {/* Current user + Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
        {currentUser && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(255,255,255,.06)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
              {ROLES.find((r) => r.value === currentUser.role)?.label || currentUser.role}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.6)', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%' }}
        >
          🔓 Logout
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   TOP BAR
   ================================================================ */
function TopBar({ title, children }) {
  return (
    <div style={{
      background: C.white, borderBottom: `1px solid ${C.border}`,
      padding: '14px 28px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

/* ================================================================
   DASHBOARD TAB
   ================================================================ */
function DashboardTab({ onTabChange }) {
  const { course, setCourse, session, launchSession, participants, setView } = useApp();
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [titleVal, setTitleVal] = useState(course.title);
  const [descVal, setDescVal] = useState(course.desc);

  const totalItems = course.modules.reduce((s, m) => s + m.items.length, 0);
  const totalQs = course.modules.reduce((s, m) =>
    s + m.items.reduce((si, it) => si + (it.qs ? it.qs.length : 0), 0), 0
  );

  const exportData = () => {
    const data = { course, participants, exportedAt: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `pedrra-export-${Date.now()}.json`;
    a.click();
  };

  const stats = [
    { label: 'Modules', value: course.modules.length, icon: '📚', color: C.primary },
    { label: 'Items', value: totalItems, icon: '📄', color: C.purple },
    { label: 'Questions', value: totalQs, icon: '❓', color: C.warning },
    { label: 'Participants', value: participants.length, icon: '👥', color: C.success },
  ];

  return (
    <div style={{ padding: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} style={statCard}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Course Info */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Course Information</h3>
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, marginBottom: 6 }}>Course Title</div>
          {editTitle ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={input} value={titleVal} onChange={(e) => setTitleVal(e.target.value)} autoFocus />
              <button onClick={() => { setCourse({ ...course, title: titleVal }); setEditTitle(false); }} style={btn(C.success)}>Save</button>
              <button onClick={() => { setTitleVal(course.title); setEditTitle(false); }} style={btnOutline()}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{course.title}</span>
              <button onClick={() => setEditTitle(true)} style={{ ...btnSm(C.light, C.primary), fontSize: 11 }}>Edit</button>
            </div>
          )}
        </div>
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Description</div>
          {editDesc ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={input} value={descVal} onChange={(e) => setDescVal(e.target.value)} autoFocus />
              <button onClick={() => { setCourse({ ...course, desc: descVal }); setEditDesc(false); }} style={btn(C.success)}>Save</button>
              <button onClick={() => { setDescVal(course.desc); setEditDesc(false); }} style={btnOutline()}>Cancel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: C.muted }}>{course.desc}</span>
              <button onClick={() => setEditDesc(true)} style={{ ...btnSm(C.light, C.primary), fontSize: 11 }}>Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ ...card }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!session ? (
            <button onClick={() => { launchSession(); onTabChange('live'); }} style={btn(C.success)}>
              🎓 Launch Live Session
            </button>
          ) : (
            <button onClick={() => onTabChange('live')} style={btn(C.error)}>
              🔴 View Live Session
            </button>
          )}
          <button onClick={() => setView('projector')} style={btn(C.purple)}>📺 Open Projector</button>
          <button onClick={() => onTabChange('modules')} style={btn(C.primary)}>📚 Manage Modules</button>
          <button onClick={exportData} style={btnOutline()}>📥 Export Data</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ITEM MODAL - handles doc/slides/quiz/survey creation & editing
   ================================================================ */
function ItemModal({ open, onClose, onSave, initial, moduleId }) {
  const blank = {
    id: genId(), type: 'doc', title: '', desc: '', url: '',
    slides: [], qs: [],
  };
  const [item, setItem] = useState(initial || blank);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeQ, setActiveQ] = useState(0);

  // Reset when modal opens
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    prevOpen.current = true;
  } else if (!open && prevOpen.current) {
    prevOpen.current = false;
  }

  const set = (k, v) => setItem((p) => ({ ...p, [k]: v }));

  // Slide helpers
  const blankSlide = () => ({ t: '', c: '', l: 'content' });
  const addSlide = () => {
    const slides = [...(item.slides || []), blankSlide()];
    set('slides', slides);
    setActiveSlide(slides.length - 1);
  };
  const removeSlide = (i) => {
    const slides = (item.slides || []).filter((_, idx) => idx !== i);
    set('slides', slides);
    setActiveSlide(Math.max(0, activeSlide - 1));
  };
  const updateSlide = (i, k, v) => {
    const slides = [...(item.slides || [])];
    slides[i] = { ...slides[i], [k]: v };
    set('slides', slides);
  };

  // Question helpers
  const blankQ = (forType) => {
    if (forType === 'quiz') return { id: genId(), text: '', type: 'mc', opts: ['', ''], ok: 0, xp: 100 };
    return { id: genId(), text: '', type: 'scale' };
  };
  const addQ = () => {
    const qs = [...(item.qs || []), blankQ(item.type)];
    set('qs', qs);
    setActiveQ(qs.length - 1);
  };
  const removeQ = (i) => {
    const qs = (item.qs || []).filter((_, idx) => idx !== i);
    set('qs', qs);
    setActiveQ(Math.max(0, activeQ - 1));
  };
  const updateQ = (i, k, v) => {
    const qs = [...(item.qs || [])];
    qs[i] = { ...qs[i], [k]: v };
    set('qs', qs);
  };
  const addOpt = (qi) => {
    const qs = [...(item.qs || [])];
    qs[qi] = { ...qs[qi], opts: [...(qs[qi].opts || []), ''] };
    set('qs', qs);
  };
  const removeOpt = (qi, oi) => {
    const qs = [...(item.qs || [])];
    qs[qi] = { ...qs[qi], opts: qs[qi].opts.filter((_, idx) => idx !== oi) };
    set('qs', qs);
  };
  const updateOpt = (qi, oi, v) => {
    const qs = [...(item.qs || [])];
    const opts = [...qs[qi].opts];
    opts[oi] = v;
    qs[qi] = { ...qs[qi], opts };
    set('qs', qs);
  };

  const handleSave = () => {
    if (!item.title.trim()) return;
    onSave({ ...item, id: item.id || genId() });
    onClose();
  };

  const currentSlide = (item.slides || [])[activeSlide];
  const currentQ = (item.qs || [])[activeQ];

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Item' : 'Add Item'} maxWidth={680}>
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['doc', 'slides', 'quiz', 'survey'].map((t) => (
          <button
            key={t}
            onClick={() => set('type', t)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: item.type === t ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
              background: item.type === t ? C.light : C.white,
              color: item.type === t ? C.primary : C.muted, cursor: 'pointer',
            }}
          >
            {itemIcon[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Title & Description */}
      <div style={formGroup}>
        <label style={label}>Title *</label>
        <input style={input} value={item.title} onChange={(e) => set('title', e.target.value)} placeholder="Item title" />
      </div>
      <div style={formGroup}>
        <label style={label}>Description</label>
        <input style={input} value={item.desc || ''} onChange={(e) => set('desc', e.target.value)} placeholder="Optional description" />
      </div>

      {/* Doc: URL */}
      {item.type === 'doc' && (
        <div style={formGroup}>
          <label style={label}>Document URL</label>
          <input style={input} value={item.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
        </div>
      )}

      {/* Slides */}
      {item.type === 'slides' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={label}>Slides ({(item.slides || []).length})</span>
            <button onClick={addSlide} style={btnSm(C.primary)}>+ Add Slide</button>
          </div>
          {(item.slides || []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.dim, background: C.bg, borderRadius: 8 }}>
              No slides yet. Click "+ Add Slide" to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Slide list */}
              <div style={{ width: 140, flexShrink: 0 }}>
                {(item.slides || []).map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeSlide === i ? C.light : C.bg,
                      border: activeSlide === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      color: activeSlide === i ? C.primary : C.text, fontWeight: activeSlide === i ? 700 : 400,
                    }}
                  >
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>Slide {i + 1}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.t || '(untitled)'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Slide editor */}
              {currentSlide && (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Editing Slide {activeSlide + 1}</span>
                    <button onClick={() => removeSlide(activeSlide)} style={{ ...btnSm(C.error), fontSize: 11 }}>Remove</button>
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Title</label>
                    <input style={input} value={currentSlide.t} onChange={(e) => updateSlide(activeSlide, 't', e.target.value)} placeholder="Slide title" />
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Content</label>
                    <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }}
                      value={currentSlide.c} onChange={(e) => updateSlide(activeSlide, 'c', e.target.value)}
                      placeholder="Slide content (newlines supported)" />
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Layout</label>
                    <select style={{ ...input, background: C.white }} value={currentSlide.l}
                      onChange={(e) => updateSlide(activeSlide, 'l', e.target.value)}>
                      <option value="title">Title (full screen, blue gradient)</option>
                      <option value="content">Content (white, left aligned)</option>
                      <option value="quote">Quote (light blue, centered)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quiz Questions */}
      {item.type === 'quiz' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={label}>Questions ({(item.qs || []).length})</span>
            <button onClick={addQ} style={btnSm(C.primary)}>+ Add Question</button>
          </div>
          {(item.qs || []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.dim, background: C.bg, borderRadius: 8 }}>
              No questions yet. Click "+ Add Question" to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Q list */}
              <div style={{ width: 140, flexShrink: 0 }}>
                {(item.qs || []).map((q, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveQ(i)}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeQ === i ? C.light : C.bg,
                      border: activeQ === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      color: activeQ === i ? C.primary : C.text, fontWeight: activeQ === i ? 700 : 400,
                    }}
                  >
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>Q{i + 1} · {q.type}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text || '(empty)'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Q editor */}
              {currentQ && (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Question {activeQ + 1}</span>
                    <button onClick={() => removeQ(activeQ)} style={{ ...btnSm(C.error), fontSize: 11 }}>Remove</button>
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Question Text</label>
                    <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                      value={currentQ.text} onChange={(e) => updateQ(activeQ, 'text', e.target.value)}
                      placeholder="Question text" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={label}>Type</label>
                      <select style={{ ...input, background: C.white }} value={currentQ.type}
                        onChange={(e) => updateQ(activeQ, 'type', e.target.value)}>
                        <option value="mc">Multiple Choice (mc)</option>
                        <option value="bn">Binary (bn)</option>
                        <option value="tf">True/False (tf)</option>
                        <option value="poll">Poll (no answer)</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>XP Value</label>
                      <input style={input} type="number" min="0" max="500"
                        value={currentQ.xp || 0} onChange={(e) => updateQ(activeQ, 'xp', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div style={formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={label}>Answer Options</label>
                      <button onClick={() => addOpt(activeQ)} style={{ ...btnSm(C.primary), fontSize: 10 }}>+ Option</button>
                    </div>
                    {(currentQ.opts || []).map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 4, background: ANS[oi % 4]?.bg || C.border,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>{String.fromCharCode(65 + oi)}</div>
                        <input style={{ ...input, flex: 1 }} value={opt}
                          onChange={(e) => updateOpt(activeQ, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                        <input type="radio" checked={currentQ.ok === oi} onChange={() => updateQ(activeQ, 'ok', oi)}
                          title="Correct answer" style={{ cursor: 'pointer' }} />
                        <button onClick={() => removeOpt(activeQ, oi)}
                          style={{ background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 16 }}>×</button>
                      </div>
                    ))}
                    <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                      Select the radio button next to the correct answer. For polls, no selection is needed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Survey Questions */}
      {item.type === 'survey' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={label}>Questions ({(item.qs || []).length})</span>
            <button onClick={addQ} style={btnSm(C.primary)}>+ Add Question</button>
          </div>
          {(item.qs || []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.dim, background: C.bg, borderRadius: 8 }}>
              No questions yet.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Q list */}
              <div style={{ width: 140, flexShrink: 0 }}>
                {(item.qs || []).map((q, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveQ(i)}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeQ === i ? C.light : C.bg,
                      border: activeQ === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      color: activeQ === i ? C.primary : C.text,
                    }}
                  >
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>{q.type}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text || '(empty)'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Q editor */}
              {currentQ && (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Question {activeQ + 1}</span>
                    <button onClick={() => removeQ(activeQ)} style={{ ...btnSm(C.error), fontSize: 11 }}>Remove</button>
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Question Text</label>
                    <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                      value={currentQ.text} onChange={(e) => updateQ(activeQ, 'text', e.target.value)}
                      placeholder="Question text" />
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Type</label>
                    <select style={{ ...input, background: C.white }} value={currentQ.type}
                      onChange={(e) => updateQ(activeQ, 'type', e.target.value)}>
                      <option value="scale">Scale (1–5)</option>
                      <option value="tf">True/False</option>
                      <option value="choice">Multiple Choice</option>
                      <option value="text">Open Text</option>
                      <option value="header">Section Header</option>
                    </select>
                  </div>
                  {(currentQ.type === 'tf' || currentQ.type === 'choice') && (
                    <div style={formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={label}>Options</label>
                        <button onClick={() => addOpt(activeQ)} style={{ ...btnSm(C.primary), fontSize: 10 }}>+ Option</button>
                      </div>
                      {(currentQ.opts || []).map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          <input style={{ ...input, flex: 1 }} value={opt}
                            onChange={(e) => updateOpt(activeQ, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`} />
                          <button onClick={() => removeOpt(activeQ, oi)}
                            style={{ background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 16 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={btnOutline()}>Cancel</button>
        <button onClick={handleSave} style={btn(C.primary)} disabled={!item.title.trim()}>
          {initial ? '💾 Save Changes' : '➕ Add Item'}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================
   MODULE MODAL
   ================================================================ */
function ModuleModal({ open, onClose, onSave, initial }) {
  const blank = { id: genId(), title: '', desc: '', icon: '📦', phase: 'live', items: [] };
  const [mod, setMod] = useState(initial || blank);

  const handleSave = () => {
    if (!mod.title.trim()) return;
    onSave(mod);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Module' : 'Add Module'} maxWidth={480}>
      <div style={formGroup}>
        <label style={label}>Module Title *</label>
        <input style={input} value={mod.title} onChange={(e) => setMod({ ...mod, title: e.target.value })}
          placeholder="e.g. Pre-Reading" autoFocus />
      </div>
      <div style={formGroup}>
        <label style={label}>Description</label>
        <input style={input} value={mod.desc} onChange={(e) => setMod({ ...mod, desc: e.target.value })}
          placeholder="Short description" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={label}>Icon</label>
          <input style={{ ...input, textAlign: 'center', fontSize: 22 }} value={mod.icon}
            onChange={(e) => setMod({ ...mod, icon: e.target.value })} maxLength={4} />
        </div>
        <div>
          <label style={label}>Phase</label>
          <select style={{ ...input, background: C.white }} value={mod.phase}
            onChange={(e) => setMod({ ...mod, phase: e.target.value })}>
            {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnOutline()}>Cancel</button>
        <button onClick={handleSave} style={btn(C.primary)} disabled={!mod.title.trim()}>
          {initial ? '💾 Save' : '➕ Add Module'}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================
   MODULES TAB
   ================================================================ */
function ModulesTab({ readOnly }) {
  const { course, setCourse } = useApp();
  const [expanded, setExpanded] = useState({});
  const [addModOpen, setAddModOpen] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [deleteMod, setDeleteMod] = useState(null);
  const [addItem, setAddItem] = useState(null); // moduleId
  const [editItem, setEditItem] = useState(null); // { moduleId, item }
  const [deleteItem, setDeleteItem] = useState(null); // { moduleId, itemId }
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAddModule = (mod) => {
    setCourse({ ...course, modules: [...course.modules, mod] });
    showToast('Module added');
  };

  const handleEditModule = (mod) => {
    const modules = course.modules.map((m) => m.id === mod.id ? { ...m, ...mod } : m);
    setCourse({ ...course, modules });
    showToast('Module updated');
  };

  const handleDeleteModule = (modId) => {
    setCourse({ ...course, modules: course.modules.filter((m) => m.id !== modId) });
    showToast('Module deleted');
  };

  const handleAddItem = (moduleId, item) => {
    const modules = course.modules.map((m) =>
      m.id === moduleId ? { ...m, items: [...m.items, item] } : m
    );
    setCourse({ ...course, modules });
    showToast('Item added');
  };

  const handleEditItem = (moduleId, item) => {
    const modules = course.modules.map((m) =>
      m.id === moduleId
        ? { ...m, items: m.items.map((it) => it.id === item.id ? item : it) }
        : m
    );
    setCourse({ ...course, modules });
    showToast('Item updated');
  };

  const handleDeleteItem = (moduleId, itemId) => {
    const modules = course.modules.map((m) =>
      m.id === moduleId ? { ...m, items: m.items.filter((it) => it.id !== itemId) } : m
    );
    setCourse({ ...course, modules });
    showToast('Item deleted');
  };

  const phases = ['before', 'live', 'after'];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {course.modules.length} modules · {course.modules.reduce((s, m) => s + m.items.length, 0)} items
          </p>
        </div>
        <button onClick={() => setAddModOpen(true)} style={btn(C.primary)}>+ Add Module</button>
      </div>

      {phases.map((phase) => {
        const mods = course.modules.filter((m) => m.phase === phase);
        if (!mods.length) return null;
        return (
          <div key={phase} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              paddingBottom: 8, borderBottom: `2px solid ${phaseColor[phase]}22`,
            }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                background: phaseColor[phase] + '18', color: phaseColor[phase],
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5,
              }}>{phaseLabel[phase]}</span>
              <span style={{ fontSize: 12, color: C.dim }}>{mods.length} module{mods.length !== 1 ? 's' : ''}</span>
            </div>

            {mods.map((m) => (
              <div key={m.id} style={{
                ...card, marginBottom: 8,
                borderLeft: `4px solid ${phaseColor[m.phase] || C.primary}`,
                padding: 0, overflow: 'hidden',
              }}>
                {/* Module header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: C.text }}>{m.title}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                      {m.desc} · {m.items.length} item{m.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleExpand(m.id)}
                      style={{ ...btnSm(C.bg, C.primary), border: `1px solid ${C.border}` }}>
                      {expanded[m.id] ? '▲ Collapse' : '▼ Expand'}
                    </button>
                    <button onClick={() => setEditMod(m)} style={btnSm(C.light, C.primary)}>✏️ Edit</button>
                    <button onClick={() => setDeleteMod(m)} style={btnSm(C.error)}>🗑</button>
                  </div>
                </div>

                {/* Module items */}
                {expanded[m.id] && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 18px 14px' }}>
                    {m.items.length === 0 ? (
                      <p style={{ fontSize: 13, color: C.dim, margin: '8px 0', textAlign: 'center' }}>
                        No items yet. Add your first item below.
                      </p>
                    ) : (
                      m.items.map((it) => (
                        <div key={it.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', marginBottom: 4, background: C.bg,
                          borderRadius: 8, border: `1px solid ${C.border}`,
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{itemIcon[it.type] || '📄'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{it.title}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>
                              {it.type}
                              {it.url && ' · has URL'}
                              {it.slides && ` · ${it.slides.length} slides`}
                              {it.qs && ` · ${it.qs.length} questions`}
                              {it.desc && ` · ${it.desc}`}
                            </div>
                          </div>
                          <button onClick={() => setEditItem({ moduleId: m.id, item: it })}
                            style={btnSm(C.light, C.primary)}>✏️ Edit</button>
                          <button onClick={() => setDeleteItem({ moduleId: m.id, itemId: it.id, title: it.title })}
                            style={btnSm(C.error)}>🗑</button>
                        </div>
                      ))
                    )}
                    <button onClick={() => setAddItem(m.id)} style={{ ...btnOutline(), marginTop: 8, fontSize: 12 }}>
                      + Add Item
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Modals */}
      <ModuleModal
        open={addModOpen}
        onClose={() => setAddModOpen(false)}
        onSave={handleAddModule}
      />
      <ModuleModal
        open={!!editMod}
        onClose={() => setEditMod(null)}
        onSave={handleEditModule}
        initial={editMod}
      />
      <ConfirmDialog
        open={!!deleteMod}
        onClose={() => setDeleteMod(null)}
        onConfirm={() => handleDeleteModule(deleteMod?.id)}
        title="Delete Module"
        message={`Are you sure you want to delete "${deleteMod?.title}"? All items in this module will be permanently removed.`}
      />
      <ItemModal
        open={!!addItem}
        onClose={() => setAddItem(null)}
        onSave={(item) => handleAddItem(addItem, item)}
        moduleId={addItem}
      />
      <ItemModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSave={(item) => handleEditItem(editItem?.moduleId, item)}
        initial={editItem?.item}
        moduleId={editItem?.moduleId}
      />
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => handleDeleteItem(deleteItem?.moduleId, deleteItem?.itemId)}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteItem?.title}"?`}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   LIVE SESSION TAB
   ================================================================ */
function LiveSessionTab() {
  const {
    course, session, launchSession, setView,
    participants, activeQ, pushQuestion, revealAnswer,
    timer, getResponseCount, getResponseDist,
  } = useApp();

  const allQuizItems = course.modules.flatMap((m) =>
    m.items.filter((i) => i.type === 'quiz').map((i) => ({ ...i, moduleName: m.title }))
  );
  const allQuestions = allQuizItems.flatMap((item) =>
    (item.qs || []).map((q, qi) => ({ q, qi, item }))
  );

  const activeItem = activeQ ? allQuizItems.find((i) => i.id === activeQ.itemId) : null;
  const activeQuestion = activeItem?.qs?.[activeQ?.qIndex];
  const dist = activeQuestion ? getResponseDist(activeQ.itemId, activeQ.qIndex) : [];
  const count = activeQuestion ? getResponseCount(activeQ.itemId, activeQ.qIndex) : 0;

  if (!session) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ ...card, maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Active Session</h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
            Launch a live session to push questions, track responses, and display the QR code on the projector.
          </p>
          <button onClick={launchSession} style={{ ...btn(C.success), fontSize: 15 }}>
            🎓 Launch Session
          </button>
        </div>
      </div>
    );
  }

  const url = (() => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?code=${session.code}`;
  })();

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Session info */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: C.error, marginRight: 8, animation: 'pulse 1.5s infinite' }} />
            Live Session
          </h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label, marginBottom: 4 }}>Session Code</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: C.primary, fontFamily: 'monospace' }}>
              {session.code}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ ...label, marginBottom: 4 }}>Participants</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{participants.length}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...label, marginBottom: 4 }}>Join URL</div>
            <div style={{ fontSize: 11, color: C.muted, wordBreak: 'break-all', fontFamily: 'monospace', background: C.bg, padding: '6px 8px', borderRadius: 6 }}>
              {url}
            </div>
          </div>
          <button onClick={() => setView('projector')} style={{ ...btn(C.purple), width: '100%' }}>
            📺 Open Projector View
          </button>
        </div>

        {/* QR code */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <QRCodeSVG value={url} size={140} bgColor="#fff" fgColor={C.dark} level="M" />
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10, textAlign: 'center' }}>
            Scan to join the session
          </p>
        </div>
      </div>

      {/* Active question display */}
      {activeQuestion && (
        <div style={{ ...card, marginBottom: 20, borderLeft: `4px solid ${C.error}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.error, margin: 0 }}>
              🔴 Active Question — {count} response{count !== 1 ? 's' : ''}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {!activeQ.revealed && (
                <button onClick={revealAnswer} style={btn(C.success)}>✅ Reveal Answer</button>
              )}
              {activeQ.revealed && <span style={{ color: C.success, fontWeight: 700, fontSize: 13 }}>✓ Revealed</span>}
            </div>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 14 }}>{activeQuestion.text}</p>
          {activeQ.revealed && dist.length > 0 && (
            <div>
              {(activeQuestion.opts || []).map((opt, i) => {
                const total = dist.reduce((s, d) => s + d, 0) || 1;
                const pct = Math.round((dist[i] || 0) / total * 100);
                return (
                  <div key={i} className="bar-wrap">
                    <div style={{
                      width: 24, height: 24, borderRadius: 4, background: ANS[i % 4]?.bg || C.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>{String.fromCharCode(65 + i)}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, background: ANS[i % 4]?.bg || C.primary }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text, minWidth: 60 }}>
                      {opt} — {pct}%
                    </span>
                    {i === activeQuestion.ok && (
                      <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Push questions */}
      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Push Question to Participants</h3>
        {allQuestions.length === 0 ? (
          <p style={{ color: C.dim, fontSize: 13 }}>No quiz questions found. Add quiz items in the Modules tab.</p>
        ) : (
          <div>
            {allQuestions.map(({ q, qi, item }) => {
              const isActive = activeQ?.itemId === item.id && activeQ?.qIndex === qi;
              return (
                <div key={`${item.id}-${qi}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 6,
                  background: isActive ? C.light : C.bg,
                  borderRadius: 8, border: isActive ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: C.dim, marginBottom: 2 }}>
                      {item.moduleName} › {item.title} · Q{qi + 1} · {q.type} · {q.xp} XP
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text}
                    </div>
                  </div>
                  <button
                    onClick={() => pushQuestion(item.id, qi)}
                    style={isActive ? btn(C.error) : btn(C.primary)}
                  >
                    {isActive ? '🔴 Live' : '▶ Push'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   PARTICIPANTS TAB
   ================================================================ */
function ParticipantsTab() {
  const { participants, session } = useApp();

  const exportCSV = () => {
    let csv = 'Name,Team,XP,Answers\n';
    participants.forEach((p) => { csv += `"${p.name}","${p.team}",${p.xp},${p.answers}\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pedrra-participants.csv';
    a.click();
  };

  const sorted = [...participants].sort((a, b) => b.xp - a.xp);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{participants.length} participant{participants.length !== 1 ? 's' : ''} · sorted by XP</p>
        <button onClick={exportCSV} style={btn(C.success)} disabled={!participants.length}>📥 Export CSV</button>
      </div>

      {participants.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <p style={{ color: C.muted, fontSize: 14 }}>
            {session ? 'No participants have joined yet. Share the QR code or session code.' : 'Launch a session to invite participants.'}
          </p>
        </div>
      ) : (
        <div style={card}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Name</th>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>XP</th>
                <th style={{ textAlign: 'right' }}>Answers</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: C.dim, fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: C.muted }}>{p.team}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: C.primary }}>{p.xp}</td>
                  <td style={{ textAlign: 'right', color: C.muted }}>{p.answers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   RESULTS TAB
   ================================================================ */
function ResultsTab() {
  const { course, participants, responses, getResponseDist } = useApp();

  const allQuizItems = course.modules.flatMap((m) =>
    m.items.filter((i) => i.type === 'quiz').map((i) => ({ ...i, moduleName: m.title }))
  );

  const totalXP = participants.reduce((s, p) => s + (p.xp || 0), 0);
  const totalAnswers = participants.reduce((s, p) => s + (p.answers || 0), 0);
  const avgXP = participants.length > 0 ? Math.round(totalXP / participants.length) : 0;

  const exportData = () => {
    const data = { course, participants, responses, exportedAt: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `pedrra-results-${Date.now()}.json`;
    a.click();
  };

  return (
    <div style={{ padding: 28 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Participants', value: participants.length, icon: '👥', color: C.primary },
          { label: 'Total Answers', value: totalAnswers, icon: '✅', color: C.success },
          { label: 'Avg XP', value: avgXP, icon: '⭐', color: C.warning },
          { label: 'Top XP', value: participants.length > 0 ? Math.max(...participants.map((p) => p.xp || 0)) : 0, icon: '🏆', color: C.error },
        ].map((s) => (
          <div key={s.label} style={statCard}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={exportData} style={btnOutline()}>📥 Export JSON</button>
      </div>

      {/* Per-question distributions */}
      {allQuizItems.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: C.dim }}>
          No quiz items found. Add quiz items in the Modules tab.
        </div>
      ) : (
        allQuizItems.map((item) => (
          <div key={item.id} style={{ ...card, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
              {item.moduleName} › {item.title}
            </h3>
            {(item.qs || []).map((q, qi) => {
              const dist = getResponseDist(item.id, qi);
              const total = dist.reduce((s, d) => s + d, 0);
              return (
                <div key={q.id} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                    Q{qi + 1}: {q.text}
                  </p>
                  {total === 0 ? (
                    <p style={{ fontSize: 12, color: C.dim }}>No responses yet.</p>
                  ) : (
                    (q.opts || []).map((opt, i) => {
                      const pct = total > 0 ? Math.round((dist[i] || 0) / total * 100) : 0;
                      return (
                        <div key={i} className="bar-wrap">
                          <div style={{
                            width: 24, height: 24, borderRadius: 4,
                            background: i === q.ok && q.ok >= 0 ? C.success : (ANS[i % 4]?.bg || C.border),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>{String.fromCharCode(65 + i)}</div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{
                              width: `${pct}%`,
                              background: i === q.ok && q.ok >= 0 ? C.success : (ANS[i % 4]?.bg || C.primary),
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.text, minWidth: 80 }}>
                            {opt} — {dist[i] || 0} ({pct}%)
                          </span>
                          {i === q.ok && q.ok >= 0 && <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>✓</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

/* ================================================================
   USER MODAL
   ================================================================ */
function UserModal({ open, onClose, onSave, initial, existingUsernames }) {
  const blank = { id: genId(), username: '', name: '', role: 'viewer', password: '', status: 'active', createdAt: Date.now() };
  const [user, setUser] = useState(initial || blank);
  const [newPwd, setNewPwd] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    if (!user.name.trim()) { setError('Name is required'); return; }
    if (!user.username.trim()) { setError('Username is required'); return; }
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(user.username)) { setError('Username must be 3-30 characters (letters, numbers, . _ -)'); return; }
    if (existingUsernames.filter((u) => u !== initial?.username).includes(user.username.toLowerCase())) {
      setError('This username is already taken'); return;
    }
    if (!initial && !newPwd) { setError('Password is required for new users'); return; }
    const saved = { ...user, username: user.username.toLowerCase() };
    if (newPwd) saved.password = newPwd;
    onSave(saved);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit User' : 'Add User'} maxWidth={480}>
      <div style={formGroup}>
        <label style={label}>Display Name *</label>
        <input style={input} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })}
          placeholder="e.g. Maria Garcia" autoFocus />
      </div>
      <div style={formGroup}>
        <label style={label}>Username *</label>
        <input style={input} value={user.username} onChange={(e) => setUser({ ...user, username: e.target.value.replace(/\s/g, '') })}
          placeholder="e.g. maria.garcia" />
        <p style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>Letters, numbers, dots, dashes. No spaces.</p>
      </div>
      <div style={formGroup}>
        <label style={label}>Role *</label>
        <select style={{ ...input, background: C.white }} value={user.role}
          onChange={(e) => setUser({ ...user, role: e.target.value })}>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
          {ROLES.find((r) => r.value === user.role)?.desc}
        </p>
      </div>
      <div style={formGroup}>
        <label style={label}>{initial ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
        <input style={input} type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
          placeholder={initial ? 'Leave empty to keep current' : 'Set password'} />
      </div>
      <div style={formGroup}>
        <label style={label}>Status</label>
        <select style={{ ...input, background: C.white }} value={user.status}
          onChange={(e) => setUser({ ...user, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={btnOutline()}>Cancel</button>
        <button onClick={handleSave} style={btn(C.primary)}>
          {initial ? '💾 Save Changes' : '➕ Add User'}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================
   USERS TAB
   ================================================================ */
function UsersTab() {
  const { users, setUsers } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const showToast = (message, type = 'success') => setToast({ message, type });

  const existingUsernames = users.map((u) => u.username.toLowerCase());

  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return u.name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s);
    }
    return true;
  });

  const handleAdd = (user) => {
    setUsers((prev) => [...prev, user]);
    showToast(`User "${user.name}" created`);
  };

  const handleEdit = (user) => {
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, ...user } : u));
    showToast(`User "${user.name}" updated`);
  };

  const handleDelete = (userId) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast(`User "${user?.name}" deleted`);
  };

  const handleToggleStatus = (userId) => {
    setUsers((prev) => prev.map((u) =>
      u.id === userId ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u
    ));
    showToast('User status updated');
  };

  const exportUsers = () => {
    let csv = 'Name,Username,Role,Status,Created\n';
    users.forEach((u) => {
      csv += `"${u.name}","${u.username}","${u.role}","${u.status}","${new Date(u.createdAt).toLocaleDateString()}"\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pedrra-users.csv';
    a.click();
  };

  const roleCounts = {};
  users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  return (
    <div style={{ padding: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>{users.length}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Total Users</div>
        </div>
        {ROLES.map((r) => (
          <div key={r.value} style={statCard}>
            <div style={{ fontSize: 28, fontWeight: 800, color: r.color }}>{roleCounts[r.value] || 0}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{r.label}s</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...card, marginBottom: 16, padding: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setAddOpen(true)} style={btn(C.primary)}>
          ➕ Add User
        </button>
        <button onClick={exportUsers} style={btnSm(C.success)}>
          📥 Export CSV
        </button>
        <div style={{ flex: 1 }} />
        <input
          style={{ ...input, maxWidth: 220, padding: '8px 12px', fontSize: 13 }}
          placeholder="Search name or username..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ ...input, maxWidth: 160, padding: '8px 12px', fontSize: 13, background: C.white }}
          value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40, color: C.dim }}>
          {search || filter !== 'all' ? 'No users match your filter.' : 'No users yet. Click "Add User" to create one.'}
        </div>
      ) : (
        <div style={card}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const role = ROLES.find((r) => r.value === u.role);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>@{u.username}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: (role?.color || C.dim) + '18', color: role?.color || C.dim,
                      }}>
                        {role?.label || u.role}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleToggleStatus(u.id)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                          background: u.status === 'active' ? '#38A16918' : '#E53E3E18',
                          color: u.status === 'active' ? C.success : C.error,
                        }}>
                        {u.status === 'active' ? '● Active' : '○ Disabled'}
                      </button>
                    </td>
                    <td style={{ fontSize: 12, color: C.muted }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditUser(u)} style={btnSm(C.primary)}>Edit</button>
                        {u.id !== 'admin-default' && (
                          <button onClick={() => setDeleteUser(u)} style={btnSm(C.error)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Permissions reference */}
      <div style={{ ...card, marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Role Permissions Reference</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Permission</th>
              {ROLES.map((r) => <th key={r.value} style={{ textAlign: 'center' }}>{r.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ['Manage Users', 'users'],
              ['Edit Modules & Content', 'modules'],
              ['Launch Live Sessions', 'live'],
              ['View Participants', 'participants'],
              ['View Results', 'results'],
              ['App Settings', 'settings'],
            ].map(([name, key]) => (
              <tr key={key}>
                <td style={{ fontWeight: 500 }}>{name}</td>
                {ROLES.map((r) => (
                  <td key={r.value} style={{ textAlign: 'center', fontSize: 16 }}>
                    {ROLE_PERMISSIONS[r.value]?.[key] ? '✅' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {addOpen && (
        <UserModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
          existingUsernames={existingUsernames}
        />
      )}
      {editUser && (
        <UserModal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          onSave={handleEdit}
          initial={editUser}
          existingUsernames={existingUsernames}
        />
      )}
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => handleDelete(deleteUser.id)}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteUser?.name}"? This action cannot be undone.`}
        confirmLabel="Delete User"
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   SETTINGS TAB
   ================================================================ */
function SettingsTab({ onPasswordChange, onLogout }) {
  const { course, setCourse } = useApp();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSavePwd = () => {
    setPwdError('');
    if (newPwd && newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return; }
    onPasswordChange(newPwd);
    setNewPwd('');
    setConfirmPwd('');
    showToast(newPwd ? 'Password updated' : 'Password removed');
  };

  const handleReset = () => {
    setCourse(DEFAULT_COURSE);
    showToast('Course reset to defaults');
  };

  const handleExport = () => {
    const data = JSON.stringify(course, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `pedrra-course-${Date.now()}.json`;
    a.click();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.title || !Array.isArray(data.modules)) throw new Error('Invalid format');
        setCourse(data);
        showToast('Course imported successfully');
      } catch {
        showToast('Invalid course file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ maxWidth: 560 }}>
        {/* Password */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Admin Password</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Set a password to protect the admin panel. Leave empty to remove password protection.
          </p>
          <div style={formGroup}>
            <label style={label}>New Password</label>
            <input style={input} type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Leave empty to remove password" />
          </div>
          <div style={formGroup}>
            <label style={label}>Confirm Password</label>
            <input style={input} type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password" />
          </div>
          {pwdError && <p style={{ color: C.error, fontSize: 13, marginBottom: 10 }}>{pwdError}</p>}
          <button onClick={handleSavePwd} style={btn(C.primary)}>💾 Save Password</button>
        </div>

        {/* Course Data */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Course Data</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Export or import the complete course structure as a JSON file.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleExport} style={btn(C.primary)}>📤 Export Course JSON</button>
            <label style={{ ...btn(C.purple), display: 'inline-block', cursor: 'pointer' }}>
              📥 Import Course JSON
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Reset */}
        <div style={{ ...card, borderColor: C.error + '44' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.error, marginBottom: 4 }}>Danger Zone</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Reset the course to the default PEDRRA content. This will overwrite all your customisations.
          </p>
          <button onClick={() => setResetOpen(true)} style={btn(C.error)}>⚠️ Reset Course to Defaults</button>
        </div>

        {/* Version */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: C.dim }}>
            PEDRRA LMS · European Data Protection Supervisor · v1.0.0
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset Course to Defaults"
        message="This will permanently overwrite all course content with the default PEDRRA training. This action cannot be undone."
        confirmLabel="Reset"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   LOGIN GATE
   ================================================================ */
function LoginGate({ onLogin }) {
  const { users } = useApp();
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
    if (!user) { setError('No account found with this username'); return; }
    if (user.status === 'disabled') { setError('This account has been disabled'); return; }
    if (user.password && user.password !== pwd) { setError('Incorrect password'); setPwd(''); return; }
    onLogin(user);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card, maxWidth: 380, width: '100%', padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.primary, margin: '0 0 4px' }}>PEDRRA Admin</h1>
          <p style={{ fontSize: 13, color: C.muted }}>Sign in to manage the platform</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={formGroup}>
            <label style={label}>Username</label>
            <input
              style={input} type="text" value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="admin" autoFocus
            />
          </div>
          <div style={formGroup}>
            <label style={label}>Password</label>
            <input
              style={input} type="password" value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(''); }}
              placeholder="Your password"
            />
          </div>
          {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" style={{ ...btn(C.primary), width: '100%', padding: '13px' }}>Sign In</button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
            Default admin: admin (no password)<br />
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ADMIN MAIN
   ================================================================ */
export default function Admin({ onExit }) {
  const { course, session, users, setUsers } = useApp();

  const [tab, setTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handlePasswordChange = (newPwd) => {
    if (currentUser) {
      setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, password: newPwd } : u));
    }
  };

  if (!currentUser) {
    return <LoginGate onLogin={handleLogin} />;
  }

  const perms = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.viewer;

  const tabTitles = {
    dashboard: 'Dashboard',
    users: 'Users & Roles',
    modules: 'Modules',
    live: 'Live Session',
    participants: 'Participants',
    results: 'Results & Analytics',
    settings: 'Settings',
  };

  return (
    <div className="admin-layout">
      <Sidebar
        activeTab={tab}
        setTab={setTab}
        session={session}
        onLogout={handleLogout}
        courseName={course.title}
        currentUser={currentUser}
      />
      <div className="admin-content">
        <TopBar title={tabTitles[tab] || tab}>
          <span style={{ fontSize: 12, color: C.dim }}>
            Signed in as <strong style={{ color: C.text }}>{currentUser.name}</strong>
          </span>
          <button onClick={onExit}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            ← Back to Home
          </button>
        </TopBar>

        {tab === 'dashboard' && <DashboardTab onTabChange={setTab} />}
        {tab === 'users' && perms.users && <UsersTab />}
        {tab === 'modules' && <ModulesTab readOnly={!perms.modules} />}
        {tab === 'live' && perms.live && <LiveSessionTab />}
        {tab === 'participants' && perms.participants && <ParticipantsTab />}
        {tab === 'results' && perms.results && <ResultsTab />}
        {tab === 'settings' && perms.settings && <SettingsTab onPasswordChange={handlePasswordChange} onLogout={handleLogout} />}

        {/* Permission denied fallback */}
        {((tab === 'users' && !perms.users) ||
          (tab === 'live' && !perms.live) ||
          (tab === 'settings' && !perms.settings)) && (
          <div style={{ padding: 40, textAlign: 'center', color: C.dim }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h3 style={{ color: C.text, marginBottom: 8 }}>Access Restricted</h3>
            <p>Your role ({ROLES.find((r) => r.value === currentUser.role)?.label}) does not have permission to access this section.</p>
          </div>
        )}
      </div>
    </div>
  );
}
