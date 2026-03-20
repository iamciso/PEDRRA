import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from './context.js';
import {
  C, CD, itemIcon, ANS, phaseColor,
  card, btn, btnSm, btnOutline, input, label, formGroup,
  sidebarItem, statCard, editorTab,
} from './theme';
import { Modal, ConfirmDialog, Toast, PresenterView, Slide, SearchBar, useDragDrop } from './components.jsx';
import { DEFAULT_COURSE } from './courseData.js';
import { useI18n, LanguageSelector } from './i18n.jsx';

/* ================================================================
   UTILITIES
   ================================================================ */
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const downloadFile = (data, filename, type = 'application/json') => {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const csvEscape = (val) => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
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

function Sidebar({ activeTab, setTab, session, onLogout, onBackToCourse, courseName, currentUser, className }) {
  const perms = ROLE_PERMISSIONS[currentUser?.role] || ROLE_PERMISSIONS.viewer;
  const navItems = [
    { id: 'live', icon: session ? '🔴' : '📡', label: 'Live Session', show: perms.live },
    { id: 'content', icon: '📝', label: 'Content', show: perms.modules },
    { id: 'participants', icon: '👥', label: 'Participants', show: perms.participants },
    { id: 'results', icon: '📊', label: 'Results & Analytics', show: perms.results },
    { id: 'users', icon: '🔑', label: 'Users & Roles', show: perms.users },
    { id: 'settings', icon: '⚙️', label: 'Settings', show: perms.settings },
  ].filter((i) => i.show);

  return (
    <div className={className || 'admin-sidebar'}>
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
          onClick={onBackToCourse}
          style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 6, padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%', marginBottom: 6, fontWeight: 600 }}
        >
          ← Back to Course
        </button>
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
   FULLSCREEN SLIDE EDITOR - PowerPoint-like editor
   ================================================================ */
function FullscreenSlideEditor({ item, onSave, onClose }) {
  const { t } = useI18n();
  const [editItem, setEditItem] = useState(() => JSON.parse(JSON.stringify(item)));
  const [activeSlide, setActiveSlide] = useState(0);
  const [rightTab, setRightTab] = useState('content');
  const [showTemplates, setShowTemplates] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const contentRef = useRef(null);

  // Undo/Redo system
  const historyRef = useRef([JSON.stringify(JSON.parse(JSON.stringify(item)))]);
  const historyIdxRef = useRef(0);
  const lastPushRef = useRef(Date.now());
  const pushHistory = useCallback((state) => {
    const now = Date.now();
    const json = JSON.stringify(state);
    // Debounce: only push if >500ms since last push and different
    if (now - lastPushRef.current > 500 && json !== historyRef.current[historyIdxRef.current]) {
      const h = historyRef.current.slice(0, historyIdxRef.current + 1);
      h.push(json);
      if (h.length > 50) h.shift(); // limit history
      historyRef.current = h;
      historyIdxRef.current = h.length - 1;
      lastPushRef.current = now;
    }
  }, []);
  const undo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      const restored = JSON.parse(historyRef.current[historyIdxRef.current]);
      setEditItem(restored);
      setActiveSlide((prev) => Math.min(prev, (restored.slides || []).length - 1));
    }
  }, []);
  const redo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      const restored = JSON.parse(historyRef.current[historyIdxRef.current]);
      setEditItem(restored);
    }
  }, []);
  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  // Push history on editItem changes (debounced)
  useEffect(() => {
    pushHistory(editItem);
  }, [editItem, pushHistory]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsaved(JSON.stringify(editItem) !== JSON.stringify(item));
  }, [editItem, item]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Escape') {
        if (hasUnsaved) {
          if (confirm(t('editor.unsaved') + '?')) onClose();
        } else {
          onClose();
        }
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlide((prev) => Math.max(0, prev - 1));
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlide((prev) => Math.min((editItem.slides || []).length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasUnsaved, editItem.slides?.length]);

  const set = (k, v) => setEditItem((p) => ({ ...p, [k]: v }));
  const slides = editItem.slides || [];
  const currentSlide = slides[activeSlide];

  // Global clipboard paste for images
  useEffect(() => {
    const handlePaste = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          e.preventDefault();
          const file = it.getAsFile();
          if (file.size > 512000) { alert('Image too large (max 500KB)'); return; }
          const reader = new FileReader();
          reader.onload = (ev) => updateSlide(activeSlide, 'img', ev.target.result);
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeSlide]);

  // Slide operations
  const blankSlide = () => ({ t: '', c: '', l: 'content' });
  const addSlide = () => {
    const s = [...slides, blankSlide()];
    set('slides', s);
    setActiveSlide(s.length - 1);
  };
  const addPoll = () => {
    const s = [...slides, { t: '', text: '', l: 'poll', opts: ['', ''], ok: -1, xp: 50, timer: 30, notes: '' }];
    set('slides', s);
    setActiveSlide(s.length - 1);
  };
  const removeSlide = (i) => {
    const s = slides.filter((_, idx) => idx !== i);
    set('slides', s);
    setActiveSlide(Math.max(0, Math.min(activeSlide, s.length - 1)));
  };
  const updateSlide = (i, k, v) => {
    const s = [...slides];
    s[i] = { ...s[i], [k]: v };
    set('slides', s);
  };
  const duplicateSlide = (i) => {
    const s = [...slides];
    s.splice(i + 1, 0, { ...s[i] });
    set('slides', s);
    setActiveSlide(i + 1);
  };
  const reorderSlides = useCallback((newSlides) => {
    set('slides', newSlides);
  }, []);
  const { dragHandlers: slideDrag, overIdx: slideOver } = useDragDrop(slides, reorderSlides);

  const handleSave = () => {
    onSave({ ...editItem, id: editItem.id || genId() });
  };

  // Formatting helpers
  const wrapSelection = (prefix, suffix = prefix) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    updateSlide(activeSlide, 'c', newText);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, end + prefix.length); });
  };
  const prefixLines = (prefix) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const text = ta.value;
    const before = text.substring(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const selected = text.substring(lineStart, end);
    const prefixed = selected.split('\n').map((l) => prefix + l).join('\n');
    updateSlide(activeSlide, 'c', text.substring(0, lineStart) + prefixed + text.substring(end));
  };

  // Templates
  const SLIDE_TEMPLATES = [
    { name: '🏛️ EDPS Title', data: { t: 'Presentation Title', c: 'European Data Protection Supervisor', l: 'title', notes: '' } },
    { name: '📋 Key Points', data: { t: 'Key Points', c: '- Point 1\n- Point 2\n- Point 3', l: 'bullets', notes: '' } },
    { name: '📑 Two Columns', data: { t: 'Comparison', c: 'Left side', c2: 'Right side', l: 'twocol', notes: '' } },
    { name: '🖼️ Image', data: { t: 'Visual', c: 'Caption', l: 'image', img: '', notes: '' } },
    { name: '💬 Quote', data: { t: 'Author', c: '"Quote text..."', l: 'quote', notes: '' } },
    { name: '🎬 Video', data: { t: 'Video', c: '', l: 'video', videoUrl: '', notes: '' } },
    { name: '📊 Poll', data: { t: 'Question', text: 'Your question?', l: 'poll', opts: ['Option A', 'Option B', 'Option C', 'Option D'], ok: -1, xp: 50, timer: 30, notes: '' } },
    { name: '⭐ Rating', data: { t: 'Rate', text: 'How would you rate...?', l: 'rating', xp: 0, timer: 30, notes: '' } },
    { name: '📄 Content', data: { t: 'Section Title', c: 'Body text here...', l: 'content', notes: '' } },
  ];
  const addFromTemplate = (tpl) => {
    const s = [...slides, { ...tpl.data }];
    set('slides', s);
    setActiveSlide(s.length - 1);
    setShowTemplates(false);
  };

  const SLIDE_ICONS = { title: '🎯', content: '📝', quote: '💬', twocol: '📑', bullets: '📋', image: '🖼️', poll: '📊', rating: '⭐', video: '🎬' };
  const LAYOUT_OPTIONS = [
    { value: 'title', label: 'Title (gradient)' },
    { value: 'content', label: 'Content (white)' },
    { value: 'quote', label: 'Quote (centered)' },
    { value: 'twocol', label: 'Two Columns' },
    { value: 'bullets', label: 'Bullet List' },
    { value: 'image', label: 'Image + Caption' },
    { value: 'video', label: 'Video' },
    { value: 'poll', label: 'Poll' },
    { value: 'rating', label: 'Rating' },
  ];

  // Image handlers
  const handleImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 512000) { alert('Image too large (max 500KB)'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => updateSlide(activeSlide, 'img', ev.target.result);
      reader.readAsDataURL(file);
    }
  };
  const handleImagePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault();
        const file = it.getAsFile();
        if (file.size > 512000) { alert('Image too large (max 500KB)'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => updateSlide(activeSlide, 'img', ev.target.result);
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // Render right panel content based on tab
  const renderRightPanel = () => {
    if (!currentSlide) return <div style={{ padding: 20, color: C.dim, textAlign: 'center' }}>Select a slide</div>;

    if (rightTab === 'style') {
      const COLOR_PRESETS = [
        { label: 'Default', bg: '', text: '' },
        { label: 'EDPS Blue', bg: '#003399', text: '#ffffff' },
        { label: 'EDPS Dark', bg: '#001a4d', text: '#ffffff' },
        { label: 'EDPS Light', bg: '#e6ecf5', text: '#003399' },
        { label: 'EU Gold', bg: '#FFCC00', text: '#001a4d' },
        { label: 'White', bg: '#ffffff', text: '#1a1a2e' },
        { label: 'Grey', bg: '#f4f6fa', text: '#1a1a2e' },
        { label: 'Midnight', bg: '#0a0f1e', text: '#e0e4eb' },
      ];
      return (
        <div>
          <div style={formGroup}>
            <label style={label}>Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {LAYOUT_OPTIONS.map((lo) => (
                <button key={lo.value} onClick={() => updateSlide(activeSlide, 'l', lo.value)}
                  style={{
                    padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: currentSlide.l === lo.value ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: currentSlide.l === lo.value ? C.light : C.white,
                    color: currentSlide.l === lo.value ? C.primary : C.text,
                    textAlign: 'center',
                  }}>
                  {SLIDE_ICONS[lo.value] || '📝'}<br/>{lo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color scheme */}
          <div style={formGroup}>
            <label style={label}>{t('editor.colorScheme')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {COLOR_PRESETS.map((cp) => (
                <button key={cp.label} onClick={() => { updateSlide(activeSlide, 'bgColor', cp.bg); updateSlide(activeSlide, 'textColor', cp.text); }}
                  style={{
                    padding: '4px 2px', borderRadius: 6, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    border: (currentSlide.bgColor || '') === cp.bg ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: cp.bg || C.white, color: cp.text || C.text, textAlign: 'center', minHeight: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {cp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom colors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={label}>{t('editor.bgColor')}</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="color" value={currentSlide.bgColor || '#ffffff'}
                  onChange={(e) => updateSlide(activeSlide, 'bgColor', e.target.value)}
                  style={{ width: 32, height: 28, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input style={{ ...input, fontSize: 11, padding: '4px 6px' }} value={currentSlide.bgColor || ''}
                  onChange={(e) => updateSlide(activeSlide, 'bgColor', e.target.value)}
                  placeholder="auto" />
              </div>
            </div>
            <div>
              <label style={label}>{t('editor.textColor')}</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="color" value={currentSlide.textColor || '#2D3748'}
                  onChange={(e) => updateSlide(activeSlide, 'textColor', e.target.value)}
                  style={{ width: 32, height: 28, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                <input style={{ ...input, fontSize: 11, padding: '4px 6px' }} value={currentSlide.textColor || ''}
                  onChange={(e) => updateSlide(activeSlide, 'textColor', e.target.value)}
                  placeholder="auto" />
              </div>
            </div>
          </div>

          {/* Background image */}
          <div style={formGroup}>
            <label style={label}>{t('editor.bgImage')}</label>
            <input style={{ ...input, fontSize: 12 }} value={currentSlide.bgImage || ''}
              onChange={(e) => updateSlide(activeSlide, 'bgImage', e.target.value)}
              placeholder="URL for background image" />
            {currentSlide.bgImage && (
              <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                <img src={currentSlide.bgImage} alt="" style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 4, border: `1px solid ${C.border}` }} />
                <button onClick={() => updateSlide(activeSlide, 'bgImage', '')}
                  style={{ background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 12 }}>✕ Remove</button>
              </div>
            )}
          </div>

          {/* Font size */}
          <div style={formGroup}>
            <label style={label}>{t('editor.fontSize')}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ label: 'S', value: 'small' }, { label: 'M', value: '' }, { label: 'L', value: 'large' }, { label: 'XL', value: 'xlarge' }].map((fs) => (
                <button key={fs.label} onClick={() => updateSlide(activeSlide, 'fontSize', fs.value)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    border: (currentSlide.fontSize || '') === fs.value ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: (currentSlide.fontSize || '') === fs.value ? C.light : C.white,
                    color: (currentSlide.fontSize || '') === fs.value ? C.primary : C.text,
                  }}>
                  {fs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-advance timer */}
          <div style={formGroup}>
            <label style={label}>{t('editor.autoAdvance')}</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input style={{ ...input, width: 70 }} type="number" min="0" max="300" value={currentSlide.autoAdvance || 0}
                onChange={(e) => updateSlide(activeSlide, 'autoAdvance', parseInt(e.target.value) || 0)} />
              <span style={{ fontSize: 11, color: C.dim }}>{t('editor.autoAdvanceHelp')}</span>
            </div>
          </div>
        </div>
      );
    }

    if (rightTab === 'media') {
      return (
        <div>
          {/* Image */}
          <div style={formGroup}>
            <label style={label}>🖼️ Image</label>
            <input style={input} value={currentSlide.img || ''}
              onChange={(e) => updateSlide(activeSlide, 'img', e.target.value)}
              placeholder="Image URL or paste/drop below" />
            <div onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = C.primary; }}
              onDragLeave={(e) => e.currentTarget.style.borderColor = C.border}
              onDrop={handleImageDrop} onPaste={handleImagePaste} tabIndex={0}
              style={{ marginTop: 6, padding: 16, border: `2px dashed ${C.border}`, borderRadius: 8,
                textAlign: 'center', fontSize: 11, color: C.dim, cursor: 'pointer', background: C.bg }}>
              Drop image or paste (Ctrl+V) · Max 500KB
            </div>
            {currentSlide.img && currentSlide.img.startsWith('data:') && (
              <p style={{ fontSize: 10, color: C.warning, marginTop: 4 }}>Embedded: {Math.round(currentSlide.img.length / 1024)}KB</p>
            )}
          </div>
          {/* Video */}
          <div style={formGroup}>
            <label style={label}>🎬 {t('editor.tab.media')} - Video</label>
            <input style={input} value={currentSlide.videoUrl || ''}
              onChange={(e) => updateSlide(activeSlide, 'videoUrl', e.target.value)}
              placeholder="YouTube URL or direct video URL" />
            <p style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>YouTube, .mp4, .webm</p>
          </div>
          {/* Audio */}
          <div style={formGroup}>
            <label style={label}>🔊 {t('editor.audioUrl')}</label>
            <input style={input} value={currentSlide.audioUrl || ''}
              onChange={(e) => updateSlide(activeSlide, 'audioUrl', e.target.value)}
              placeholder="https://example.com/audio.mp3" />
            <p style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{t('editor.audioHelp')}</p>
            {currentSlide.audioUrl && (
              <audio controls src={currentSlide.audioUrl} style={{ width: '100%', marginTop: 6, height: 32 }} />
            )}
          </div>
        </div>
      );
    }

    if (rightTab === 'notes') {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ ...label, marginBottom: 8 }}>Presenter Notes</label>
          <textarea style={{ ...input, flex: 1, minHeight: 200, resize: 'vertical' }}
            value={currentSlide.notes || ''}
            onChange={(e) => updateSlide(activeSlide, 'notes', e.target.value)}
            placeholder="Notes visible only to presenter..." />
        </div>
      );
    }

    // Content tab (default)
    return (
      <div>
        <div style={formGroup}>
          <label style={label}>Title</label>
          <input style={input} value={currentSlide.t || ''} onChange={(e) => updateSlide(activeSlide, 't', e.target.value)} placeholder="Slide title" />
        </div>

        {/* Content with formatting toolbar */}
        {currentSlide.l !== 'poll' && currentSlide.l !== 'rating' && (
          <div style={formGroup}>
            <label style={label}>Content</label>
            <div style={{ display: 'flex', gap: 2, marginBottom: 4, background: C.bg, borderRadius: 6, padding: 3, flexWrap: 'wrap' }}>
              {[
                { label: 'B', title: 'Bold (**text**)', fn: () => wrapSelection('**') },
                { label: 'I', title: 'Italic (*text*)', fn: () => wrapSelection('*') },
                { label: '~~', title: 'Strikethrough', fn: () => wrapSelection('~~') },
                { label: '==', title: 'Highlight', fn: () => wrapSelection('==') },
                { label: 'H', title: 'Heading (## )', fn: () => prefixLines('## ') },
                { label: '•', title: 'Bullet list', fn: () => prefixLines('- ') },
                { label: '1.', title: 'Numbered list', fn: () => prefixLines('1. ') },
                { label: '🔗', title: 'Link [text](url)', fn: () => wrapSelection('[', '](url)') },
              ].map((b) => (
                <button key={b.label} onClick={b.fn} title={b.title}
                  style={{ padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11,
                    fontWeight: b.label === 'B' ? 800 : b.label === 'I' ? 400 : 600,
                    fontStyle: b.label === 'I' ? 'italic' : 'normal', background: 'transparent', color: C.text }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.light}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {b.label}
                </button>
              ))}
            </div>
            <textarea ref={contentRef} style={{ ...input, minHeight: 100, resize: 'vertical' }}
              value={currentSlide.c || ''} onChange={(e) => updateSlide(activeSlide, 'c', e.target.value)}
              placeholder="Content (**bold**, *italic*, ## heading)" />
          </div>
        )}

        {/* Two-col */}
        {currentSlide.l === 'twocol' && (
          <div style={formGroup}>
            <label style={label}>Column 2</label>
            <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
              value={currentSlide.c2 || ''} onChange={(e) => updateSlide(activeSlide, 'c2', e.target.value)}
              placeholder="Right column content" />
          </div>
        )}

        {/* Poll fields */}
        {currentSlide.l === 'poll' && (
          <>
            <div style={formGroup}>
              <label style={label}>Question</label>
              <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                value={currentSlide.text || ''} onChange={(e) => updateSlide(activeSlide, 'text', e.target.value)}
                placeholder="What is the question?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={label}>XP</label>
                <input style={input} type="number" min="0" max="500" value={currentSlide.xp || 0}
                  onChange={(e) => updateSlide(activeSlide, 'xp', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={label}>Timer (s)</label>
                <input style={input} type="number" min="0" max="120" value={currentSlide.timer || 30}
                  onChange={(e) => updateSlide(activeSlide, 'timer', parseInt(e.target.value) || 30)} />
              </div>
              <div>
                <label style={label}>Correct</label>
                <select style={{ ...input, background: C.white }} value={currentSlide.ok ?? -1}
                  onChange={(e) => updateSlide(activeSlide, 'ok', parseInt(e.target.value))}>
                  <option value={-1}>None</option>
                  {(currentSlide.opts || []).map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}
                </select>
              </div>
            </div>
            <div style={formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={label}>Options</label>
                <button onClick={() => updateSlide(activeSlide, 'opts', [...(currentSlide.opts || []), ''])}
                  style={{ ...btnSm(C.primary), fontSize: 10 }}>+ Option</button>
              </div>
              {(currentSlide.opts || []).map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: ANS[oi % 4]?.bg || C.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                  <input style={{ ...input, flex: 1, fontSize: 12 }} value={opt}
                    onChange={(e) => { const opts = [...(currentSlide.opts || [])]; opts[oi] = e.target.value; updateSlide(activeSlide, 'opts', opts); }}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                  <button onClick={() => updateSlide(activeSlide, 'opts', (currentSlide.opts || []).filter((_, i) => i !== oi))}
                    style={{ background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={currentSlide.autoReveal || false}
                onChange={(e) => updateSlide(activeSlide, 'autoReveal', e.target.checked)} />
              Auto-reveal when all vote
            </label>
          </>
        )}

        {/* Rating fields */}
        {currentSlide.l === 'rating' && (
          <>
            <div style={formGroup}>
              <label style={label}>Question</label>
              <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                value={currentSlide.text || ''} onChange={(e) => updateSlide(activeSlide, 'text', e.target.value)}
                placeholder="What should participants rate?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={label}>XP</label>
                <input style={input} type="number" min="0" max="500" value={currentSlide.xp || 0}
                  onChange={(e) => updateSlide(activeSlide, 'xp', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label style={label}>Timer (s)</label>
                <input style={input} type="number" min="0" max="120" value={currentSlide.timer || 30}
                  onChange={(e) => updateSlide(activeSlide, 'timer', parseInt(e.target.value) || 30)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 10, background: C.bg, borderRadius: 8, marginBottom: 8 }}>
              {[1,2,3,4,5].map((n) => <span key={n} style={{ fontSize: 24, color: '#FFD700' }}>★</span>)}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fullscreen-editor">
      {/* Top Bar */}
      <div className="editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <button onClick={() => { if (hasUnsaved) { if (confirm(t('editor.unsaved') + '?')) onClose(); } else onClose(); }}
            style={{ ...btnSm(C.muted), fontSize: 16, padding: '4px 10px' }}>←</button>
          <input className="editor-title-input" value={editItem.title}
            onChange={(e) => set('title', e.target.value)} placeholder="Presentation title" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            style={{ ...btnSm(canUndo ? C.muted : C.border), fontSize: 14, padding: '4px 8px', opacity: canUndo ? 1 : 0.4 }}>↩</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            style={{ ...btnSm(canRedo ? C.muted : C.border), fontSize: 14, padding: '4px 8px', opacity: canRedo ? 1 : 0.4 }}>↪</button>
          <div style={{ width: 1, height: 20, background: C.border }} />
          <button onClick={() => setShowOutline(!showOutline)} title={t('editor.outline')}
            style={{ ...btnSm(showOutline ? C.primary : C.muted), fontSize: 12, padding: '4px 8px' }}>☰</button>
          <span style={{ fontSize: 12, color: C.dim }}>
            {slides.length > 0 ? `${activeSlide + 1} / ${slides.length}` : '0 slides'}
          </span>
          {hasUnsaved && <span style={{ fontSize: 11, color: C.warning, fontWeight: 600 }}>{t('editor.unsaved')}</span>}
          <button onClick={handleSave} style={btn(C.success)}>💾 Save</button>
        </div>
      </div>

      {/* Body */}
      <div className="editor-body">
        {/* Left: Thumbnails with real Slide previews */}
        <div className="slide-thumbnails-sidebar">
          {slides.map((s, i) => (
            <div key={i} onClick={() => setActiveSlide(i)}
              className={`slide-thumbnail${activeSlide === i ? ' active' : ''}${slideOver === i ? ' drag-over' : ''}`}
              style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
              {/* Mini Slide preview */}
              <div className="slide-thumb-preview">
                <div style={{ width: 640, height: 360, transform: 'scale(0.19)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                  <Slide s={s} />
                </div>
              </div>
              {/* Overlay with number and controls */}
              <div className="slide-thumb-overlay">
                <div {...slideDrag(i)} style={{ cursor: 'grab', fontSize: 10, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}
                  onClick={(e) => e.stopPropagation()}>⠿</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
                  {i + 1}
                </span>
                <div style={{ display: 'flex', gap: 1 }}>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(i); }}
                    style={{ background: 'rgba(0,0,0,.3)', border: 'none', fontSize: 9, color: '#fff', cursor: 'pointer', padding: '1px 3px', borderRadius: 3 }}
                    title="Duplicate">📋</button>
                  <button onClick={(e) => { e.stopPropagation(); if (slides.length > 1) removeSlide(i); }}
                    style={{ background: 'rgba(0,0,0,.3)', border: 'none', fontSize: 9, color: '#fff', cursor: 'pointer', padding: '1px 3px', borderRadius: 3 }}
                    title="Delete">🗑</button>
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: C.dim, fontSize: 12 }}>
              No slides yet
            </div>
          )}
        </div>

        {/* Outline View (toggleable) */}
        {showOutline && (
          <div className="editor-outline-panel">
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 12, color: C.text,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>☰ {t('editor.outline')}</span>
              <button onClick={() => setShowOutline(false)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: 8 }}>
              {slides.map((s, i) => (
                <div key={i} onClick={() => setActiveSlide(i)}
                  style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                    background: activeSlide === i ? C.light : 'transparent',
                    borderLeft: activeSlide === i ? `3px solid ${C.primary}` : '3px solid transparent' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: activeSlide === i ? C.primary : C.text, marginBottom: 2 }}>
                    {i + 1}. {s.t || s.text || '(untitled)'}
                  </div>
                  {s.c && <div style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.c}</div>}
                  {s.notes && <div style={{ fontSize: 9, color: C.warning, marginTop: 2 }}>📝 {s.notes.substring(0, 60)}{s.notes.length > 60 ? '...' : ''}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center: Live Preview */}
        <div className="editor-center">
          {currentSlide ? (
            <div className="slide-canvas" style={{ width: 640, height: 360, transform: 'scale(0.85)', transformOrigin: 'center center' }}>
              <div style={{ width: 640, height: 360, overflow: 'hidden' }}>
                <Slide s={currentSlide} big />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: C.dim }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
              <p style={{ fontSize: 14 }}>Add a slide to get started</p>
            </div>
          )}
        </div>

        {/* Right: Property Editor */}
        <div className="editor-right-panel">
          <div className="editor-tab-bar">
            {['content', 'style', 'media', 'notes'].map((tab) => (
              <button key={tab} className={rightTab === tab ? 'active' : ''}
                onClick={() => setRightTab(tab)}>
                {tab === 'content' ? '📝' : tab === 'style' ? '🎨' : tab === 'media' ? '📎' : '📋'}
                {' '}{t(`editor.tab.${tab}`)}
              </button>
            ))}
          </div>
          <div className="editor-tab-content">
            {renderRightPanel()}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="editor-bottom-bar">
        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          <button onClick={addSlide} style={btnSm(C.primary)}>+ Slide</button>
          <button onClick={addPoll} style={btnSm('#D89E00')}>+ Poll</button>
          <button onClick={() => setShowTemplates(!showTemplates)} style={btnSm('#805AD5')}>📄 Template</button>
          {showTemplates && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, background: '#fff',
              border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
              zIndex: 20, width: 200, padding: 4 }}>
              {SLIDE_TEMPLATES.map((tpl, i) => (
                <div key={i} onClick={() => addFromTemplate(tpl)}
                  style={{ padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.text }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.light}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  {tpl.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setActiveSlide(i)}
              style={{ width: activeSlide === i ? 10 : 6, height: 6, borderRadius: 3, cursor: 'pointer',
                background: activeSlide === i ? C.primary : C.border, transition: 'all .15s' }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.dim }}>{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}


/* ================================================================
   ITEM MODAL - handles doc/slides/quiz/survey creation & editing
   ================================================================ */
export function ItemModal({ open, onClose, onSave, initial, moduleId }) {
  const blank = {
    id: genId(), type: 'doc', title: '', desc: '', url: '',
    slides: [], qs: [],
  };
  const [item, setItem] = useState(initial || blank);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeQ, setActiveQ] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const contentRef = useRef(null);

  // Reset when modal opens with new initial data
  const prevOpen = useRef(false);
  const prevInitialId = useRef(null);
  if (open && !prevOpen.current) {
    prevOpen.current = true;
  } else if (!open && prevOpen.current) {
    prevOpen.current = false;
  }
  useEffect(() => {
    if (open && initial && initial.id !== prevInitialId.current) {
      setItem(initial);
      setActiveSlide(0);
      setActiveQ(0);
      prevInitialId.current = initial.id;
    }
    if (open && !initial) {
      setItem({ id: genId(), type: 'doc', title: '', desc: '', url: '', slides: [], qs: [] });
      prevInitialId.current = null;
    }
  }, [open, initial]);

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
  const duplicateSlide = (i) => {
    const slides = [...(item.slides || [])];
    slides.splice(i + 1, 0, { ...slides[i] });
    set('slides', slides);
    setActiveSlide(i + 1);
  };
  const moveSlide = (from, to) => {
    if (to < 0 || to >= (item.slides || []).length) return;
    const slides = [...(item.slides || [])];
    [slides[from], slides[to]] = [slides[to], slides[from]];
    set('slides', slides);
    setActiveSlide(to);
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

  // Slide templates
  const SLIDE_TEMPLATES = [
    { name: '🎯 Title Slide', data: { t: 'Presentation Title', c: 'Subtitle or author', l: 'title', notes: '' } },
    { name: '📋 Bullet Points', data: { t: 'Key Points', c: 'First point\nSecond point\nThird point', l: 'bullets', notes: '' } },
    { name: '📑 Two Columns', data: { t: 'Comparison', c: 'Left column', c2: 'Right column', l: 'twocol', notes: '' } },
    { name: '🖼️ Image + Caption', data: { t: 'Visual', c: 'Image description', l: 'image', img: '', notes: '' } },
    { name: '💬 Quote', data: { t: 'Author Name', c: 'The quote text goes here...', l: 'quote', notes: '' } },
    { name: '📊 Poll (4 options)', data: { t: 'Quick Check', text: 'Your question here?', l: 'poll', opts: ['Option A', 'Option B', 'Option C', 'Option D'], ok: -1, xp: 50, timer: 30, notes: '' } },
    { name: '✅ Yes / No Poll', data: { t: 'Quick Vote', text: 'Do you agree?', l: 'poll', opts: ['Yes', 'No'], ok: -1, xp: 0, timer: 20, notes: '' } },
  ];
  const addFromTemplate = (tpl) => {
    const slides = [...(item.slides || []), { ...tpl.data }];
    set('slides', slides);
    setActiveSlide(slides.length - 1);
    setShowTemplates(false);
  };

  // Formatting toolbar helper
  const wrapSelection = (prefix, suffix = prefix) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    updateSlide(activeSlide, 'c', newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  };
  const prefixLines = (prefix) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const before = text.substring(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const selected = text.substring(lineStart, end);
    const prefixed = selected.split('\n').map((l) => prefix + l).join('\n');
    const newText = text.substring(0, lineStart) + prefixed + text.substring(end);
    updateSlide(activeSlide, 'c', newText);
  };

  // Slide type icons
  const SLIDE_ICONS = { title: '🎯', content: '📝', quote: '💬', twocol: '📑', bullets: '📋', image: '🖼️', poll: '📊', rating: '⭐' };

  // Reorder helpers for drag & drop
  const reorderSlides = useCallback((newSlides) => {
    set('slides', newSlides);
    setActiveSlide(0);
  }, []);
  const reorderQs = useCallback((newQs) => {
    set('qs', newQs);
    setActiveQ(0);
  }, []);

  const handleSave = () => {
    if (!item.title.trim()) return;
    onSave({ ...item, id: item.id || genId() });
    onClose();
  };

  const currentSlide = (item.slides || [])[activeSlide];
  const currentQ = (item.qs || [])[activeQ];

  const { dragHandlers: slideDrag, overIdx: slideOver } = useDragDrop(item.slides || [], reorderSlides);
  const { dragHandlers: qDrag, overIdx: qOver } = useDragDrop(item.qs || [], reorderQs);

  // Fullscreen editor for slides
  if (open && item.type === 'slides') {
    return (
      <FullscreenSlideEditor
        item={item}
        onSave={(updated) => { onSave(updated); onClose(); }}
        onClose={onClose}
      />
    );
  }

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
            <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
              <button onClick={addSlide} style={btnSm(C.primary)}>+ Slide</button>
              <button onClick={() => {
                const slides = [...(item.slides || []), { t: '', text: '', l: 'poll', opts: ['', ''], ok: -1, xp: 50, timer: 30, notes: '' }];
                set('slides', slides);
                setActiveSlide(slides.length - 1);
              }} style={btnSm('#D89E00')}>+ Poll</button>
              <button onClick={() => setShowTemplates(!showTemplates)} style={btnSm('#805AD5')}>📄 Template</button>
              {showTemplates && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff',
                  border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                  zIndex: 20, width: 220, padding: 4,
                }}>
                  {SLIDE_TEMPLATES.map((tpl, i) => (
                    <div key={i} onClick={() => addFromTemplate(tpl)}
                      style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.text }}
                      onMouseEnter={(e) => e.currentTarget.style.background = C.light}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      {tpl.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                    className={slideOver === i ? 'drag-over' : ''}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeSlide === i ? C.light : C.bg,
                      border: activeSlide === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      borderLeft: s.l === 'poll' ? '3px solid #D89E00' : undefined,
                      color: activeSlide === i ? C.primary : C.text, fontWeight: activeSlide === i ? 700 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
                      <span className="drag-handle" {...slideDrag(i)} onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, cursor: 'grab', color: C.dim, lineHeight: 1 }}>⠿</span>
                      <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i - 1); }} disabled={i === 0}
                        style={{ background: 'none', border: 'none', cursor: i > 0 ? 'pointer' : 'default', fontSize: 8, padding: 0, color: i > 0 ? C.muted : 'transparent', lineHeight: 1 }}>▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i + 1); }} disabled={i === (item.slides || []).length - 1}
                        style={{ background: 'none', border: 'none', cursor: i < (item.slides || []).length - 1 ? 'pointer' : 'default', fontSize: 8, padding: 0, color: i < (item.slides || []).length - 1 ? C.muted : 'transparent', lineHeight: 1 }}>▼</button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: s.l === 'poll' || s.l === 'rating' ? '#D89E00' : C.dim, marginBottom: 2 }}>
                        {SLIDE_ICONS[s.l] || '📝'} {i + 1}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.t || s.text || '(untitled)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Slide editor */}
              {currentSlide && (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{SLIDE_ICONS[currentSlide.l] || '📝'} Editing Slide {activeSlide + 1}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => duplicateSlide(activeSlide)} style={{ ...btnSm('#805AD5'), fontSize: 11 }}>Duplicate</button>
                      <button onClick={() => removeSlide(activeSlide)} style={{ ...btnSm(C.error), fontSize: 11 }}>Remove</button>
                    </div>
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Title</label>
                    <input style={input} value={currentSlide.t} onChange={(e) => updateSlide(activeSlide, 't', e.target.value)} placeholder="Slide title" />
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Content</label>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 4, background: C.bg, borderRadius: 6, padding: 3 }}>
                      {[
                        { label: 'B', title: 'Bold', fn: () => wrapSelection('**') },
                        { label: 'I', title: 'Italic', fn: () => wrapSelection('*') },
                        { label: 'H', title: 'Heading', fn: () => prefixLines('## ') },
                        { label: '•', title: 'Bullet list', fn: () => prefixLines('- ') },
                      ].map((b) => (
                        <button key={b.label} onClick={b.fn} title={b.title}
                          style={{
                            padding: '3px 8px', border: 'none', borderRadius: 4, cursor: 'pointer',
                            fontSize: 12, fontWeight: b.label === 'B' ? 800 : b.label === 'I' ? 400 : 600,
                            fontStyle: b.label === 'I' ? 'italic' : 'normal',
                            background: 'transparent', color: C.text,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = C.light}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <textarea ref={contentRef} style={{ ...input, minHeight: 80, resize: 'vertical' }}
                      value={currentSlide.c} onChange={(e) => updateSlide(activeSlide, 'c', e.target.value)}
                      placeholder="Slide content (use **bold**, *italic*, ## heading)" />
                  </div>
                  <div style={formGroup}>
                    <label style={label}>Layout</label>
                    <select style={{ ...input, background: C.white }} value={currentSlide.l}
                      onChange={(e) => updateSlide(activeSlide, 'l', e.target.value)}>
                      <option value="title">Title (full screen, blue gradient)</option>
                      <option value="content">Content (white, left aligned)</option>
                      <option value="quote">Quote (light blue, centered)</option>
                      <option value="twocol">Two Columns (side by side)</option>
                      <option value="bullets">Bullet List (one item per line)</option>
                      <option value="image">Image + Caption</option>
                      <option value="poll">Poll (interactive question)</option>
                      <option value="rating">Rating Scale (1-5 stars)</option>
                      <option value="video">Video (embedded player)</option>
                    </select>
                  </div>
                  {currentSlide.l === 'twocol' && (
                    <div style={formGroup}>
                      <label style={label}>Column 2 Content</label>
                      <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                        value={currentSlide.c2 || ''} onChange={(e) => updateSlide(activeSlide, 'c2', e.target.value)}
                        placeholder="Right column content" />
                    </div>
                  )}
                  {currentSlide.l === 'image' && (
                    <div style={formGroup}>
                      <label style={label}>Image</label>
                      <input style={input} value={currentSlide.img || ''}
                        onChange={(e) => updateSlide(activeSlide, 'img', e.target.value)}
                        placeholder="https://example.com/image.png or paste/drop image" />
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = C.primary; }}
                        onDragLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = C.border;
                          const file = e.dataTransfer.files[0];
                          if (file && file.type.startsWith('image/')) {
                            if (file.size > 512000) { alert('Image too large (max 500KB). Consider using a URL instead.'); return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => updateSlide(activeSlide, 'img', ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (!items) return;
                          for (const item of items) {
                            if (item.type.startsWith('image/')) {
                              e.preventDefault();
                              const file = item.getAsFile();
                              if (file.size > 512000) { alert('Image too large (max 500KB). Consider using a URL instead.'); return; }
                              const reader = new FileReader();
                              reader.onload = (ev) => updateSlide(activeSlide, 'img', ev.target.result);
                              reader.readAsDataURL(file);
                              break;
                            }
                          }
                        }}
                        tabIndex={0}
                        style={{
                          marginTop: 6, padding: 16, border: `2px dashed ${C.border}`, borderRadius: 8,
                          textAlign: 'center', fontSize: 12, color: C.dim, cursor: 'pointer',
                          background: C.bg, transition: 'border-color .2s',
                        }}
                      >
                        Drop image here or click and paste (Ctrl+V) · Max 500KB
                      </div>
                      {currentSlide.img && currentSlide.img.startsWith('data:') && (
                        <p style={{ fontSize: 11, color: C.warning, marginTop: 4 }}>
                          Embedded image ({Math.round(currentSlide.img.length / 1024)}KB in data)
                        </p>
                      )}
                    </div>
                  )}
                  {currentSlide.l === 'poll' && (
                    <>
                      <div style={formGroup}>
                        <label style={label}>Question Text</label>
                        <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                          value={currentSlide.text || ''} onChange={(e) => updateSlide(activeSlide, 'text', e.target.value)}
                          placeholder="What is the question?" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={label}>XP</label>
                          <input style={input} type="number" min="0" max="500"
                            value={currentSlide.xp || 0} onChange={(e) => updateSlide(activeSlide, 'xp', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={label}>Timer (s)</label>
                          <input style={input} type="number" min="0" max="120"
                            value={currentSlide.timer || 30} onChange={(e) => updateSlide(activeSlide, 'timer', parseInt(e.target.value) || 30)} />
                        </div>
                        <div>
                          <label style={label}>Correct</label>
                          <select style={{ ...input, background: C.white }}
                            value={currentSlide.ok ?? -1} onChange={(e) => updateSlide(activeSlide, 'ok', parseInt(e.target.value))}>
                            <option value={-1}>No correct (opinion)</option>
                            {(currentSlide.opts || []).map((_, i) => (
                              <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={formGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label style={label}>Answer Options</label>
                          <button onClick={() => {
                            const opts = [...(currentSlide.opts || []), ''];
                            updateSlide(activeSlide, 'opts', opts);
                          }} style={{ ...btnSm(C.primary), fontSize: 10 }}>+ Option</button>
                        </div>
                        {(currentSlide.opts || []).map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: 4, background: ANS[oi % 4]?.bg || C.border,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}>{String.fromCharCode(65 + oi)}</div>
                            <input style={{ ...input, flex: 1 }} value={opt}
                              onChange={(e) => {
                                const opts = [...(currentSlide.opts || [])];
                                opts[oi] = e.target.value;
                                updateSlide(activeSlide, 'opts', opts);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                            <button onClick={() => {
                              const opts = (currentSlide.opts || []).filter((_, i) => i !== oi);
                              updateSlide(activeSlide, 'opts', opts);
                            }}
                              style={{ background: 'none', border: 'none', color: C.error, cursor: 'pointer', fontSize: 16 }}>×</button>
                          </div>
                        ))}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text, cursor: 'pointer', marginTop: 4 }}>
                        <input type="checkbox" checked={currentSlide.autoReveal || false}
                          onChange={(e) => updateSlide(activeSlide, 'autoReveal', e.target.checked)} />
                        Auto-reveal when all participants have voted
                      </label>
                    </>
                  )}
                  {currentSlide.l === 'rating' && (
                    <>
                      <div style={formGroup}>
                        <label style={label}>Question Text</label>
                        <textarea style={{ ...input, minHeight: 60, resize: 'vertical' }}
                          value={currentSlide.text || ''} onChange={(e) => updateSlide(activeSlide, 'text', e.target.value)}
                          placeholder="What do you want participants to rate?" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={label}>XP</label>
                          <input style={input} type="number" min="0" max="500"
                            value={currentSlide.xp || 0} onChange={(e) => updateSlide(activeSlide, 'xp', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={label}>Timer (s)</label>
                          <input style={input} type="number" min="0" max="120"
                            value={currentSlide.timer || 30} onChange={(e) => updateSlide(activeSlide, 'timer', parseInt(e.target.value) || 30)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 12, background: C.bg, borderRadius: 8, marginBottom: 8 }}>
                        {[1,2,3,4,5].map((n) => (
                          <span key={n} style={{ fontSize: 28, color: '#FFD700' }}>★</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, textAlign: 'center' }}>Participants will rate from 1 to 5 stars</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text, cursor: 'pointer', marginTop: 8 }}>
                        <input type="checkbox" checked={currentSlide.autoReveal || false}
                          onChange={(e) => updateSlide(activeSlide, 'autoReveal', e.target.checked)} />
                        Auto-reveal when all participants have voted
                      </label>
                    </>
                  )}
                  {currentSlide.l === 'video' && (
                    <div style={formGroup}>
                      <label style={label}>Video URL</label>
                      <input style={input} value={currentSlide.videoUrl || ''}
                        onChange={(e) => updateSlide(activeSlide, 'videoUrl', e.target.value)}
                        placeholder="YouTube URL or direct video URL" />
                      <p style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
                        Supports YouTube links and direct video file URLs (.mp4, .webm)
                      </p>
                    </div>
                  )}
                  <div style={formGroup}>
                    <label style={label}>Presenter Notes (optional)</label>
                    <textarea style={{ ...input, minHeight: 40, resize: 'vertical', fontSize: 12 }}
                      value={currentSlide.notes || ''} onChange={(e) => updateSlide(activeSlide, 'notes', e.target.value)}
                      placeholder="Notes visible only to presenter..." />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Preview */}
          {currentSlide && (
            <div style={{ marginTop: 16 }}>
              <div
                onClick={() => setShowPreview(!showPreview)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>
                  {showPreview ? '▼ Hide Preview' : '▶ Show Preview'}
                </span>
              </div>
              {showPreview && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', background: '#1a1a2e' }}>
                  <Slide s={currentSlide} />
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
                    className={qOver === i ? 'drag-over' : ''}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeQ === i ? C.light : C.bg,
                      border: activeQ === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      color: activeQ === i ? C.primary : C.text, fontWeight: activeQ === i ? 700 : 400,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span className="drag-handle" {...qDrag(i)} onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, cursor: 'grab', color: C.dim }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>Q{i + 1} · {q.type}</div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.text || '(empty)'}
                      </div>
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
                  <div style={formGroup}>
                    <label style={label}>Explanation (shown after reveal)</label>
                    <textarea style={{ ...input, minHeight: 50, resize: 'vertical' }}
                      value={currentQ.explanation || ''} onChange={(e) => updateQ(activeQ, 'explanation', e.target.value)}
                      placeholder="Why is this the correct answer? (optional)" />
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
                    className={qOver === i ? 'drag-over' : ''}
                    style={{
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      marginBottom: 4, background: activeQ === i ? C.light : C.bg,
                      border: activeQ === i ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                      color: activeQ === i ? C.primary : C.text,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span className="drag-handle" {...qDrag(i)} onClick={(e) => e.stopPropagation()} style={{ fontSize: 11, cursor: 'grab', color: C.dim }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>{q.type}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text || '(empty)'}
                    </div>
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
export function ModuleModal({ open, onClose, onSave, initial }) {
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
   LIVE SESSION TAB
   ================================================================ */
function LiveSessionTab() {
  const {
    course, session, launchSession, setView,
    participants, activeQ, pushQuestion, revealAnswer,
    timer, getResponseCount, getResponseDist,
    broadcast, presentationActive,
  } = useApp();

  const [presenting, setPresenting] = useState(null); // { itemId, slides } when PresenterView is open
  const [showQuizPush, setShowQuizPush] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const allQuizItems = course.modules.flatMap((m) =>
    m.items.filter((i) => i.type === 'quiz').map((i) => ({ ...i, moduleName: m.title }))
  );
  const allQuestions = allQuizItems.flatMap((item) =>
    (item.qs || []).map((q, qi) => ({ q, qi, item }))
  );

  // Presentation decks: slides items from live-phase modules
  const presentationDecks = course.modules
    .filter((m) => m.phase === 'live')
    .flatMap((m) => m.items.filter((i) => i.type === 'slides' && (i.slides || []).length > 0).map((i) => ({
      ...i, moduleName: m.title, moduleId: m.id,
      pollCount: (i.slides || []).filter((s) => s.l === 'poll').length,
    })));

  const activeItem = activeQ ? allQuizItems.find((i) => i.id === activeQ.itemId) : null;
  const activeQuestion = activeItem?.qs?.[activeQ?.qIndex];
  const dist = activeQuestion ? getResponseDist(activeQ.itemId, activeQ.qIndex) : [];
  const count = activeQuestion ? getResponseCount(activeQ.itemId, activeQ.qIndex) : 0;

  // If PresenterView is open, render it
  if (presenting) {
    return (
      <PresenterView
        slides={presenting.slides}
        itemId={presenting.itemId}
        onClose={() => setPresenting(null)}
        broadcast={broadcast}
        activeQ={activeQ}
        getResponseCount={getResponseCount}
        getResponseDist={getResponseDist}
        pushQuestion={pushQuestion}
        revealAnswer={revealAnswer}
        participantCount={participants.length}
      />
    );
  }

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
          <button
            onClick={async () => {
              if (navigator.share) {
                try { await navigator.share({ title: 'Join PEDRRA Session', text: `Join with code: ${session.code}`, url }); }
                catch { /* user cancelled */ }
              } else {
                navigator.clipboard.writeText(url);
                // Quick visual feedback
                const el = document.getElementById('share-copied');
                if (el) { el.textContent = 'Copied!'; setTimeout(() => { el.textContent = 'Share Link'; }, 1500); }
              }
            }}
            style={{ ...btnSm(C.primary), marginTop: 10, width: '100%' }}
          >
            <span id="share-copied">Share Link</span>
          </button>
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

      {/* Presentation Decks */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Presentation Decks</h3>
        {presentationDecks.length === 0 ? (
          <p style={{ color: C.dim, fontSize: 13 }}>No slide decks found in live-phase modules.</p>
        ) : (
          <div>
            {presentationDecks.map((deck) => (
              <div key={deck.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', marginBottom: 8,
                background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 24 }}>📊</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{deck.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {deck.moduleName} · {deck.slides.length} slide{deck.slides.length !== 1 ? 's' : ''}
                    {deck.pollCount > 0 && <span style={{ color: '#D89E00', fontWeight: 600 }}> · {deck.pollCount} poll{deck.pollCount !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setPresenting({ itemId: deck.id, slides: deck.slides })}
                  style={btn(C.success)}
                >
                  Start Presenting
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Push questions (standalone) */}
      <div style={card}>
        <div
          onClick={() => setShowQuizPush(!showQuizPush)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Push Standalone Question</h3>
          <span style={{ fontSize: 14, color: C.dim, transition: 'transform .2s', transform: showQuizPush ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </div>
        {showQuizPush && (
          <div style={{ marginTop: 14 }}>
            {allQuestions.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 13 }}>No quiz questions found. Add quiz items in the Modules tab.</p>
            ) : (
              <div>
                {allQuestions.length > 3 && (
                  <div style={{ marginBottom: 10 }}>
                    <input style={{ ...input, padding: '8px 12px', fontSize: 13 }}
                      placeholder="Search questions..." value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)} />
                  </div>
                )}
                {allQuestions.filter(({ q, item }) => !searchQ || `${item.title} ${q.text}`.toLowerCase().includes(searchQ.toLowerCase())).map(({ q, qi, item }) => {
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

  const allSurveyItems = course.modules.flatMap((m) =>
    m.items.filter((i) => i.type === 'survey').map((i) => ({ ...i, moduleName: m.title }))
  );

  const totalXP = participants.reduce((s, p) => s + (p.xp || 0), 0);
  const totalAnswers = participants.reduce((s, p) => s + (p.answers || 0), 0);
  const avgXP = participants.length > 0 ? Math.round(totalXP / participants.length) : 0;

  const exportData = () => {
    const data = { course, participants, responses, exportedAt: new Date().toISOString() };
    downloadFile(data, `pedrra-results-${Date.now()}.json`);
  };

  const exportQuizCSV = () => {
    let csv = 'Participant,Team,Module,Quiz,Question,Answer Given,Correct Answer,Is Correct,XP Earned\n';
    allQuizItems.forEach((item) => {
      (item.qs || []).forEach((q, qi) => {
        const resp = responses[`${item.id}-${qi}`];
        if (!resp?.answers) return;
        resp.answers.forEach((ans) => {
          const p = participants.find((pp) => pp.id === ans.participantId);
          const givenOpt = q.opts?.[ans.answerIdx] || '';
          const correctOpt = q.ok >= 0 ? (q.opts?.[q.ok] || '') : 'N/A (opinion)';
          const isCorrect = q.ok < 0 ? 'N/A' : (ans.answerIdx === q.ok ? 'Yes' : 'No');
          const xpEarned = q.ok < 0 ? 0 : (ans.answerIdx === q.ok ? (q.xp || 0) : 0);
          csv += [csvEscape(p?.name || 'Unknown'), csvEscape(p?.team || ''), csvEscape(item.moduleName),
            csvEscape(item.title), csvEscape(q.text), csvEscape(givenOpt), csvEscape(correctOpt),
            isCorrect, xpEarned].join(',') + '\n';
        });
      });
    });
    downloadFile(csv, `pedrra-quiz-results-${Date.now()}.csv`, 'text/csv');
  };

  const exportSurveyCSV = () => {
    allSurveyItems.forEach((item) => {
      const questions = (item.qs || []).filter((q) => q.type !== 'header');
      if (!questions.length) return;
      let csv = 'Participant,Team,' + questions.map((q, i) => csvEscape(`Q${i + 1}: ${q.text}`)).join(',') + '\n';
      participants.forEach((p) => {
        const resp = responses[`survey-${item.id}-${p.id}`];
        if (!resp) return;
        csv += csvEscape(p.name) + ',' + csvEscape(p.team) + ',' +
          questions.map((_, i) => csvEscape(resp.answers?.[i] ?? '')).join(',') + '\n';
      });
      downloadFile(csv, `pedrra-survey-${item.title.replace(/\s+/g, '-')}-${Date.now()}.csv`, 'text/csv');
    });
  };

  const exportSummaryCSV = () => {
    let csv = 'Module,Quiz,Question,Total Responses,% Correct,Most Common Answer,Response Distribution\n';
    allQuizItems.forEach((item) => {
      (item.qs || []).forEach((q, qi) => {
        const dist = getResponseDist(item.id, qi);
        const total = dist.reduce((s, d) => s + (d || 0), 0);
        const correctCount = q.ok >= 0 ? (dist[q.ok] || 0) : 0;
        const pctCorrect = q.ok >= 0 && total > 0 ? Math.round(correctCount / total * 100) : 'N/A';
        const maxIdx = dist.indexOf(Math.max(...dist.map((d) => d || 0)));
        const mostCommon = q.opts?.[maxIdx] || '';
        const distStr = (q.opts || []).map((opt, i) => `${opt}: ${dist[i] || 0}`).join(' | ');
        csv += [csvEscape(item.moduleName), csvEscape(item.title), csvEscape(q.text),
          total, typeof pctCorrect === 'number' ? pctCorrect + '%' : pctCorrect,
          csvEscape(mostCommon), csvEscape(distStr)].join(',') + '\n';
      });
    });
    downloadFile(csv, `pedrra-summary-${Date.now()}.csv`, 'text/csv');
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={exportData} style={btnOutline()}>📥 JSON</button>
        <button onClick={exportQuizCSV} style={btnOutline()} disabled={!allQuizItems.length}>📥 Quiz CSV</button>
        <button onClick={exportSurveyCSV} style={btnOutline()} disabled={!allSurveyItems.length}>📥 Survey CSV</button>
        <button onClick={exportSummaryCSV} style={btnOutline()} disabled={!allQuizItems.length}>📥 Summary CSV</button>
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
  const { course, setCourse, courses, setCourses } = useApp();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
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
    const fresh = { ...DEFAULT_COURSE, id: course.id, icon: course.icon, color: course.color, createdAt: course.createdAt };
    setCourse(fresh);
    showToast('Course reset to defaults');
  };

  const handleExport = () => {
    downloadFile(course, `pedrra-${course.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`);
  };

  const handleExportAll = () => {
    downloadFile(courses, `pedrra-all-courses-${Date.now()}.json`);
  };

  const handleFullBackup = () => {
    const backup = { _pedrra_backup: true, version: '1.0.0', exportedAt: new Date().toISOString(), data: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pedrra-')) {
        try { backup.data[key] = JSON.parse(localStorage.getItem(key)); }
        catch { backup.data[key] = localStorage.getItem(key); }
      }
    }
    downloadFile(backup, `pedrra-full-backup-${Date.now()}.json`);
    showToast('Full backup exported');
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup._pedrra_backup || !backup.data) throw new Error('Not a PEDRRA backup');
        setPendingRestore(backup);
        setRestoreOpen(true);
      } catch {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore?.data) return;
    Object.entries(pendingRestore.data).forEach(([key, val]) => {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
    });
    showToast('Backup restored. Reloading...');
    setTimeout(() => window.location.reload(), 800);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          // Importing multiple courses
          if (!data.every((c) => c.title && Array.isArray(c.modules))) throw new Error('Invalid format');
          setCourses(data);
          showToast(`Imported ${data.length} course(s)`);
        } else {
          // Importing single course — replace current course
          if (!data.title || !Array.isArray(data.modules)) throw new Error('Invalid format');
          const updated = { ...data, id: data.id || course.id };
          setCourse(updated);
          showToast('Course imported successfully');
        }
      } catch {
        showToast('Invalid course file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const { t } = useI18n();

  return (
    <div style={{ padding: 28 }}>
      <div style={{ maxWidth: 560 }}>
        {/* Language */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('settings.language')}</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            {t('settings.languageDesc')}
          </p>
          <LanguageSelector />
        </div>

        {/* Password */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t('settings.adminPwd')}</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            {t('settings.adminPwdDesc')}
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
            <button onClick={handleExport} style={btn(C.primary)}>📤 Export This Course</button>
            <button onClick={handleExportAll} style={btn(C.secondary || '#6B7280')}>📤 Export All Courses</button>
            <label style={{ ...btn(C.purple), display: 'inline-block', cursor: 'pointer' }}>
              📥 Import JSON
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Student progress data (localStorage):</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => {
                const progressData = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('pedrra-progress-')) {
                    try { progressData[key] = JSON.parse(localStorage.getItem(key)); } catch {}
                  }
                }
                downloadFile(progressData, `pedrra-progress-${Date.now()}.json`);
              }} style={btnSm(C.success)}>📤 Export Progress</button>
              <label style={{ ...btnSm(C.purple), display: 'inline-block', cursor: 'pointer' }}>
                📥 Import Progress
                <input type="file" accept=".json" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target.result);
                      Object.entries(data).forEach(([key, val]) => {
                        if (key.startsWith('pedrra-progress-')) {
                          const existing = JSON.parse(localStorage.getItem(key) || '{}');
                          localStorage.setItem(key, JSON.stringify({ ...existing, ...val }));
                        }
                      });
                      showToast('Progress imported');
                    } catch { showToast('Invalid file', 'error'); }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* Full Backup */}
        <div style={{ ...card, marginBottom: 20, borderColor: C.purple + '44' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Full Backup</h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Export or restore a complete backup of all data: courses, users, session results, participants, and progress.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleFullBackup} style={btn(C.success)}>📦 Export Full Backup</button>
            <label style={{ ...btn(C.purple), display: 'inline-block', cursor: 'pointer' }}>
              📥 Restore from Backup
              <input type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
            </label>
          </div>
          <p style={{ fontSize: 11, color: C.dim, marginTop: 10, lineHeight: 1.5 }}>
            Warning: Restoring a backup will overwrite all current data. The page will reload after restoring.
          </p>
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
            PEDRRA LMS · v1.1.0
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

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => { setRestoreOpen(false); setPendingRestore(null); }}
        onConfirm={handleConfirmRestore}
        title="Restore Full Backup"
        message={`This will overwrite ALL current data with the backup from ${pendingRestore?.exportedAt ? new Date(pendingRestore.exportedAt).toLocaleString() : 'unknown date'}. The page will reload. This action cannot be undone.`}
        confirmLabel="Restore"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   CONTENT TAB - Overview of all items across modules
   ================================================================ */
function ContentTab() {
  const { course, setCourse } = useApp();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editModuleId, setEditModuleId] = useState(null);
  const [addItemModuleId, setAddItemModuleId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const handleSaveItem = (moduleId, item) => {
    setCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === moduleId
          ? { ...m, items: m.items.some((it) => it.id === item.id)
              ? m.items.map((it) => it.id === item.id ? item : it)
              : [...m.items, item] }
          : m
      ),
    });
    showToast(editItem ? 'Item updated' : 'Item added');
    setEditItem(null);
    setEditModuleId(null);
    setAddItemModuleId(null);
  };

  const handleDuplicate = (moduleId, item) => {
    const cloned = JSON.parse(JSON.stringify(item));
    cloned.id = genId();
    cloned.title = item.title + ' (copy)';
    if (cloned.slides) cloned.slides = cloned.slides.map((s) => ({ ...s }));
    if (cloned.qs) cloned.qs = cloned.qs.map((q) => ({ ...q, id: genId() }));
    setCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === moduleId ? { ...m, items: [...m.items, cloned] } : m
      ),
    });
    showToast(`Duplicated "${item.title}"`);
  };

  const handleDelete = (moduleId, itemId) => {
    setCourse({
      ...course,
      modules: course.modules.map((m) =>
        m.id === moduleId ? { ...m, items: m.items.filter((it) => it.id !== itemId) } : m
      ),
    });
    showToast('Item deleted');
  };

  // Flatten all items with module info
  const allItems = course.modules.flatMap((m) =>
    m.items.map((it) => ({ ...it, moduleId: m.id, moduleName: m.title, moduleIcon: m.icon, phase: m.phase }))
  );

  // Filter
  const filtered = allItems.filter((it) => {
    if (filterType !== 'all' && it.type !== filterType) return false;
    if (filterModule !== 'all' && it.moduleId !== filterModule) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!it.title.toLowerCase().includes(s) && !(it.desc || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Group by module
  const groupedByModule = course.modules
    .filter((m) => filterModule === 'all' || m.id === filterModule)
    .map((m) => ({
      ...m,
      filteredItems: filtered.filter((it) => it.moduleId === m.id),
    }))
    .filter((m) => m.filteredItems.length > 0 || filterType === 'all');

  const typeCounts = { all: allItems.length };
  allItems.forEach((it) => { typeCounts[it.type] = (typeCounts[it.type] || 0) + 1; });

  const itemDetail = (it) => {
    if (it.type === 'slides') {
      const polls = (it.slides || []).filter((s) => s.l === 'poll' || s.l === 'rating').length;
      return `${(it.slides || []).length} slides${polls > 0 ? `, ${polls} polls` : ''}`;
    }
    if (it.type === 'quiz' || it.type === 'survey') return `${(it.qs || []).length} questions`;
    if (it.type === 'doc') return it.url ? 'Has URL' : 'No URL';
    return '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Filter bar */}
      <div className="content-filter-bar">
        <input style={{ ...input, flex: 1, maxWidth: 280, padding: '8px 12px', fontSize: 13 }}
          placeholder={t('content.search')} value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <div className="content-type-filter">
          {[
            { value: 'all', label: t('content.allTypes'), icon: '📋' },
            { value: 'slides', label: 'Slides', icon: '🎬' },
            { value: 'quiz', label: 'Quiz', icon: '❓' },
            { value: 'survey', label: 'Survey', icon: '📋' },
            { value: 'doc', label: 'Doc', icon: '📄' },
          ].map((f) => (
            <button key={f.value} className={filterType === f.value ? 'active' : ''}
              onClick={() => setFilterType(f.value)}>
              {f.icon} {f.label} {typeCounts[f.value] ? `(${typeCounts[f.value]})` : ''}
            </button>
          ))}
        </div>
        <select style={{ ...input, maxWidth: 180, padding: '8px 12px', fontSize: 13, background: C.white }}
          value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
          <option value="all">{t('content.allModules')}</option>
          {course.modules.map((m) => <option key={m.id} value={m.id}>{m.icon} {m.title}</option>)}
        </select>
      </div>

      {/* Content list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 20px' }}>
        {groupedByModule.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: C.dim }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14 }}>{t('content.noItems')}</p>
          </div>
        ) : (
          groupedByModule.map((m) => (
            <div key={m.id}>
              {/* Module header */}
              <div className="content-module-header">
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <span style={{ flex: 1, color: C.text }}>{m.title}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: (phaseColor[m.phase] || C.dim) + '18',
                  color: phaseColor[m.phase] || C.dim, textTransform: 'uppercase',
                }}>{m.phase}</span>
                <span style={{ fontSize: 12, color: C.dim }}>{m.items.length} items</span>
                <button onClick={() => setAddItemModuleId(m.id)} style={btnSm(C.primary)}>+ {t('content.addItem')}</button>
              </div>

              {/* Items */}
              {m.filteredItems.length === 0 ? (
                <div style={{ padding: '12px 16px', color: C.dim, fontSize: 13, fontStyle: 'italic', borderBottom: `1px solid ${C.border}` }}>
                  No matching items in this module
                </div>
              ) : (
                m.filteredItems.map((it) => (
                  <div key={it.id} className="content-item-row">
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{itemIcon[it.type] || '📄'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.title || '(untitled)'}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {it.type} · {itemDetail(it)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: it.type === 'slides' ? '#6366f118' : it.type === 'quiz' ? '#E53E3E18' : it.type === 'survey' ? '#ED893618' : '#38A16918',
                      color: it.type === 'slides' ? '#6366f1' : it.type === 'quiz' ? '#E53E3E' : it.type === 'survey' ? '#ED8936' : '#38A169',
                    }}>{it.type}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setEditItem(it); setEditModuleId(it.moduleId); }}
                        style={btnSm(C.primary)} title={t('content.edit')}>✏️</button>
                      <button onClick={() => handleDuplicate(it.moduleId, it)}
                        style={btnSm('#805AD5')} title={t('content.duplicate')}>📋</button>
                      <button onClick={() => setDeleteItem({ moduleId: it.moduleId, itemId: it.id, title: it.title })}
                        style={btnSm(C.error)} title={t('content.delete')}>🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <ItemModal
        open={!!editItem}
        onClose={() => { setEditItem(null); setEditModuleId(null); }}
        onSave={(item) => handleSaveItem(editModuleId, item)}
        initial={editItem}
        moduleId={editModuleId}
      />
      <ItemModal
        open={!!addItemModuleId}
        onClose={() => setAddItemModuleId(null)}
        onSave={(item) => handleSaveItem(addItemModuleId, item)}
        moduleId={addItemModuleId}
      />
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => { handleDelete(deleteItem.moduleId, deleteItem.itemId); setDeleteItem(null); }}
        title={t('content.delete')}
        message={`Delete "${deleteItem?.title}"?`}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   ADMIN MAIN
   ================================================================ */
export default function Admin({ onExit, currentUser: propUser }) {
  const { course, session, users, setUsers, currentUser: ctxUser } = useApp();
  const currentUser = propUser || ctxUser;

  const [tab, setTab] = useState('live');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    // Navigate back; actual logout is handled by App.jsx
    onExit();
  };

  const handlePasswordChange = (newPwd) => {
    if (currentUser) {
      setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, password: newPwd } : u));
    }
  };

  const perms = ROLE_PERMISSIONS[currentUser?.role] || ROLE_PERMISSIONS.viewer;

  const tabTitles = {
    live: 'Live Session',
    content: 'Content Overview',
    participants: 'Participants',
    results: 'Results & Analytics',
    users: 'Users & Roles',
    settings: 'Settings',
  };

  return (
    <div className="admin-layout">
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar
        activeTab={tab}
        setTab={(t) => { setTab(t); setSidebarOpen(false); }}
        session={session}
        onLogout={handleLogout}
        onBackToCourse={onExit}
        courseName={course.title}
        currentUser={currentUser}
        className={sidebarOpen ? 'admin-sidebar open' : 'admin-sidebar'}
      />
      <div className="admin-content">
        <TopBar title={tabTitles[tab] || tab}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span style={{ fontSize: 12, color: C.dim }}>
            {currentUser?.name}
          </span>
          <button onClick={onExit}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            ←
          </button>
        </TopBar>

        {tab === 'live' && perms.live && <LiveSessionTab />}
        {tab === 'content' && perms.modules && <ContentTab />}
        {tab === 'participants' && perms.participants && <ParticipantsTab />}
        {tab === 'results' && perms.results && <ResultsTab />}
        {tab === 'users' && perms.users && <UsersTab />}
        {tab === 'settings' && perms.settings && <SettingsTab onPasswordChange={handlePasswordChange} onLogout={handleLogout} />}

        {/* Permission denied fallback */}
        {((tab === 'users' && !perms.users) ||
          (tab === 'live' && !perms.live) ||
          (tab === 'settings' && !perms.settings)) && (
          <div style={{ padding: 40, textAlign: 'center', color: C.dim }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h3 style={{ color: C.text, marginBottom: 8 }}>Access Restricted</h3>
            <p>Your role ({ROLES.find((r) => r.value === currentUser?.role)?.label}) does not have permission to access this section.</p>
          </div>
        )}
      </div>
    </div>
  );
}
