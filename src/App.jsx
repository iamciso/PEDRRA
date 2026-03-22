import { useState, useEffect, useRef, useCallback } from 'react';
import { AppContext, useApp } from './context.js';
import {
  C, CD, phaseColor, phaseLabel, itemIcon,
  card, btn, btnOutline, input, label, formGroup,
} from './theme';
import { DEFAULT_COURSE } from './courseData.js';
import * as Sync from './sync.js';
import { Header, ProgressBar, useDragDrop, Leaderboard, XPPopup, SearchBar } from './components.jsx';
import { Modal, ConfirmDialog, Toast } from './components.jsx';
import { DocViewer, SlideViewer, SurveyViewer, QuizInfo, LiveQuestionOverlay } from './Participant.jsx';
import { ModuleModal, ItemModal } from './Admin.jsx';
import Admin from './Admin.jsx';
import Projector from './Projector.jsx';
import { useI18n, LanguageSelector } from './i18n.jsx';

/* ================================================================
   UTILITIES
   ================================================================ */
const genCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[~~(Math.random() * 31)]).join('');
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const save = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    const v = parseInt(localStorage.getItem('pedrra-sync-version') || '0', 10);
    localStorage.setItem('pedrra-sync-version', String(v + 1));
  } catch { /* noop */ }
};

const CH_NAME = 'pedrra-sync';
const broadcastMsg = (type, payload) => {
  try { const ch = new BroadcastChannel(CH_NAME); ch.postMessage({ type, payload }); ch.close(); } catch { /* noop */ }
};

const ROLE_PERMISSIONS = {
  admin:       { editContent: true, adminPanel: true, manageUsers: true, runLive: true },
  facilitator: { editContent: false, adminPanel: true, manageUsers: false, runLive: true },
  editor:      { editContent: true, adminPanel: false, manageUsers: false, runLive: false },
  viewer:      { editContent: false, adminPanel: false, manageUsers: false, runLive: false },
};

const COURSE_COLORS = ['#0C4DA2', '#6366f1', '#38A169', '#E53E3E', '#ED8936', '#D53F8C', '#319795', '#805AD5'];

/* ================================================================
   MIGRATION: single course → courses array
   ================================================================ */
function migrateCourses() {
  const existing = load('pedrra-courses');
  if (existing && Array.isArray(existing)) return existing;

  // Migrate from old single-course format
  const oldCourse = load('pedrra-course');
  if (oldCourse) {
    const migrated = {
      ...oldCourse,
      id: oldCourse.id || 'course-' + genId(),
      icon: oldCourse.icon || '🛡️',
      color: oldCourse.color || '#0C4DA2',
      createdAt: oldCourse.createdAt || Date.now(),
    };
    const arr = [migrated];
    save('pedrra-courses', arr);
    localStorage.removeItem('pedrra-course');
    return arr;
  }

  // Fresh install
  const def = [{ ...DEFAULT_COURSE }];
  save('pedrra-courses', def);
  return def;
}

/* ================================================================
   LOGIN SCREEN
   ================================================================ */
function LoginScreen({ users, onLogin, onJoinSession, installPrompt, onInstall }) {
  const { t } = useI18n();
  const urlParams = new URLSearchParams(window.location.search);
  const urlCode = urlParams.get('code');
  const urlItem = urlParams.get('item');
  const [mode, setMode] = useState((urlCode && urlCode.length === 6) || urlItem ? 'join' : 'login');
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState(() => (urlCode || '').toUpperCase());
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
    if (!user) { setError(t('login.noAccount')); return; }
    if (user.status === 'disabled') { setError(t('login.disabled')); return; }
    if (user.password && user.password !== pwd) { setError(t('login.wrongPwd')); setPwd(''); return; }
    onLogin(user);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || code.length !== 6) { setError(t('login.invalidCode')); return; }
    if (!name.trim()) { setError(t('login.enterName')); return; }
    if (!team) { setError(t('login.selectTeamErr')); return; }
    onJoinSession(code.toUpperCase(), name.trim(), team);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ ...card, maxWidth: 400, width: '100%', padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28 }}>🛡️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.primary, margin: '0 0 4px', letterSpacing: -0.5 }}>PEDRRA</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{t('login.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', marginBottom: 24, background: C.bg, borderRadius: 8, padding: 3 }}>
          <button onClick={() => { setMode('login'); setError(''); }}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: mode === 'login' ? C.primary : 'transparent', color: mode === 'login' ? '#fff' : C.muted }}>
            {t('login.signIn')}</button>
          <button onClick={() => { setMode('join'); setError(''); }}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: mode === 'join' ? C.primary : 'transparent', color: mode === 'join' ? '#fff' : C.muted }}>
            {t('login.joinSession')}</button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={formGroup}>
              <label style={label}>{t('login.username')}</label>
              <input style={input} type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} placeholder="admin" autoFocus />
            </div>
            <div style={formGroup}>
              <label style={label}>{t('login.password')}</label>
              <input style={input} type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setError(''); }} placeholder="" />
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" style={{ ...btn(C.primary), width: '100%', padding: '13px' }}>{t('login.signInBtn')}</button>
            <p style={{ fontSize: 11, color: C.dim, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>{t('login.defaultCreds')}</p>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div style={formGroup}>
              <label style={label}>{t('login.sessionCode')}</label>
              <input style={{ ...input, fontSize: 22, fontFamily: 'monospace', letterSpacing: 6, textAlign: 'center', textTransform: 'uppercase' }}
                placeholder="ABC123" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} autoFocus />
            </div>
            <div style={formGroup}>
              <label style={label}>{t('login.yourName')}</label>
              <input style={input} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="" />
            </div>
            <div style={formGroup}>
              <label style={label}>{t('login.team')}</label>
              <select style={{ ...input, background: '#fff' }} value={team} onChange={(e) => { setTeam(e.target.value); setError(''); }}>
                <option value="">{t('login.selectTeam')}</option>
                {[1, 2, 3, 4, 5].map((i) => <option key={i} value={`Team ${i}`}>{t('login.teamN', { n: i })}</option>)}
              </select>
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button type="submit" style={{ ...btn(C.primary), width: '100%', padding: '13px' }}>{t('login.joinBtn')}</button>
          </form>
        )}

        <div style={{ marginTop: 24, padding: '12px 14px', background: C.light, borderRadius: 8, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{t('login.privacy')}</p>
        </div>

        {urlCode && mode === 'join' && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.success + '18', borderRadius: 8, textAlign: 'center', border: `1px solid ${C.success}44` }}>
            <p style={{ margin: 0, fontSize: 12, color: C.success, fontWeight: 600 }}>{t('login.invited', { code })}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 10, alignItems: 'center' }}>
          <LanguageSelector style={{ fontSize: 12 }} />
          {installPrompt && (
            <button onClick={onInstall} style={{ ...btn(C.primary), opacity: 0.85, fontSize: 12 }}>
              {t('login.installApp')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   COURSE CARD MODAL (create/edit course metadata)
   ================================================================ */
function CourseCardModal({ open, onClose, onSave, initial }) {
  const blank = { id: genId(), title: '', desc: '', icon: '📚', color: COURSE_COLORS[0], modules: [], createdAt: Date.now() };
  const [c, setC] = useState(initial || blank);

  const handleSave = () => {
    if (!c.title.trim()) return;
    onSave(c);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Training' : 'New Training'} maxWidth={480}>
      <div style={formGroup}>
        <label style={label}>Training Title *</label>
        <input style={input} value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder="e.g. PEDRRA II" autoFocus />
      </div>
      <div style={formGroup}>
        <label style={label}>Description</label>
        <input style={input} value={c.desc} onChange={(e) => setC({ ...c, desc: e.target.value })} placeholder="Short description" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={label}>Icon</label>
          <input style={{ ...input, textAlign: 'center', fontSize: 22 }} value={c.icon} onChange={(e) => setC({ ...c, icon: e.target.value })} maxLength={4} />
        </div>
        <div>
          <label style={label}>Color</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {COURSE_COLORS.map((col) => (
              <button key={col} onClick={() => setC({ ...c, color: col })}
                style={{ width: 32, height: 32, borderRadius: 8, background: col, border: c.color === col ? '3px solid #333' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnOutline()}>Cancel</button>
        <button onClick={handleSave} style={btn(C.primary)} disabled={!c.title.trim()}>
          {initial ? '💾 Save' : '➕ Create Training'}
        </button>
      </div>
    </Modal>
  );
}

/* ================================================================
   COURSE LIST PAGE
   ================================================================ */
function CourseListPage({ currentUser, courses, onCourseSelect, onAdminOpen, onLogout, onAddCourse, onEditCourse, onDeleteCourse, onDuplicateCourse, darkMode, onToggleDark }) {
  const canEdit = ROLE_PERMISSIONS[currentUser.role]?.editContent;
  const canAdmin = ROLE_PERMISSIONS[currentUser.role]?.adminPanel;
  const [searchTerm, setSearchTerm] = useState('');
  const filteredCourses = searchTerm
    ? courses.filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || (c.desc || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : courses;

  // Per-user progress
  const progressKey = `pedrra-progress-${currentUser.id}`;
  const progress = (() => { try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch { return {}; } })();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>PEDRRA</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>· {currentUser.name}</span>
          </div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onToggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 14, cursor: 'pointer' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {canAdmin && (
              <button onClick={onAdminOpen}
                style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                🔧 Admin Panel
              </button>
            )}
            <button onClick={onLogout}
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        }
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>My Trainings</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{courses.length} training{courses.length !== 1 ? 's' : ''} available</p>
          </div>
          {canEdit && (
            <button onClick={onAddCourse} style={btn(C.primary)}>+ New Training</button>
          )}
        </div>
        {courses.length > 2 && (
          <div style={{ marginBottom: 16 }}>
            <input
              style={{ ...input, padding: '10px 14px', fontSize: 14 }}
              placeholder="Search trainings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
          {filteredCourses.map((course) => {
            const totalItems = course.modules.reduce((s, m) => s + m.items.length, 0);
            const doneItems = course.modules.reduce((s, m) => s + m.items.filter((it) => progress[`${course.id}-${m.id}-${it.id}`] || progress[`${m.id}-${it.id}`]).length, 0);
            const color = course.color || C.primary;
            return (
              <div key={course.id}
                onClick={() => onCourseSelect(course.id)}
                style={{
                  ...card, cursor: 'pointer', padding: 0, overflow: 'hidden',
                  transition: 'transform .15s, box-shadow .15s',
                  borderTop: `4px solid ${color}`,
                }}
              >
                <div style={{ padding: '20px 20px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
                    }}>{course.icon || '📚'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.title}
                      </h3>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.desc || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: C.dim }}>
                    <span>📚 {course.modules.length} modules</span>
                    <span>📄 {totalItems} items</span>
                  </div>

                  <ProgressBar done={doneItems} total={totalItems} color={color} />
                </div>

                {/* Edit/Delete for admin/editor */}
                {canEdit && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onDuplicateCourse(course)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#805AD5', cursor: 'pointer', fontWeight: 600, padding: '4px 8px' }}>
                      📋 Duplicate
                    </button>
                    <button onClick={() => onEditCourse(course)} style={{ background: 'none', border: 'none', fontSize: 12, color: C.primary, cursor: 'pointer', fontWeight: 600, padding: '4px 8px' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => onDeleteCourse(course)} style={{ background: 'none', border: 'none', fontSize: 12, color: C.error, cursor: 'pointer', fontWeight: 600, padding: '4px 8px' }}>
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   DRAG-REORDERABLE MODULE & ITEM LISTS
   ================================================================ */
function ModuleList({ modules, allModules, phase, canEdit, expanded, toggleExpand, progress, onActivityOpen, onReorderModules, onReorderItems, setEditMod, setDeleteMod, setEditItem, setDeleteItem, setAddItem }) {
  const handleReorder = useCallback((reorderedPhaseMods) => {
    // Merge back: replace the modules of this phase with the reordered ones, keep other phases
    const otherMods = allModules.filter((m) => m.phase !== phase);
    const phaseIdx = allModules.reduce((acc, m, i) => { if (m.phase === phase && acc.first === -1) acc.first = i; return acc; }, { first: -1 });
    // Rebuild: keep order of other phases, insert reordered phase mods at original position
    const result = [];
    let phaseInserted = false;
    for (const m of allModules) {
      if (m.phase === phase) {
        if (!phaseInserted) { result.push(...reorderedPhaseMods); phaseInserted = true; }
      } else {
        result.push(m);
      }
    }
    if (!phaseInserted) result.push(...reorderedPhaseMods);
    onReorderModules(result);
  }, [allModules, phase, onReorderModules]);

  const { dragHandlers: modDrag, overIdx: modOver } = useDragDrop(modules, handleReorder);

  return modules.map((m, mi) => {
    const done = m.items.filter((it) => progress[`${m.id}-${it.id}`]).length;
    const isExpanded = expanded[m.id];
    return (
      <div key={m.id} className={modOver === mi ? 'drag-over' : ''} style={{ ...card, marginBottom: 8, padding: 0, overflow: 'hidden', borderLeft: `4px solid ${phaseColor[m.phase]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleExpand(m.id)}>
          {canEdit && <span className="drag-handle" {...modDrag(mi)} onClick={(e) => e.stopPropagation()}>⠿</span>}
          <span style={{ fontSize: 24, flexShrink: 0 }}>{m.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.title}</span>
              {canEdit && <button onClick={(e) => { e.stopPropagation(); setEditMod(m); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 4px', color: C.muted }} title="Edit module">✏️</button>}
              {canEdit && <button onClick={(e) => { e.stopPropagation(); setDeleteMod(m); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 4px', color: C.error }} title="Delete module">🗑</button>}
            </div>
            <ProgressBar done={done} total={m.items.length} />
          </div>
          <span style={{ fontSize: 16, color: C.dim, flexShrink: 0, transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </div>
        {isExpanded && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 16px 14px' }}>
            {m.items.length === 0 ? (
              <p style={{ fontSize: 13, color: C.dim, margin: '8px 0', textAlign: 'center' }}>No items yet.</p>
            ) : (
              <ItemList items={m.items} moduleId={m.id} canEdit={canEdit} progress={progress}
                onActivityOpen={(item) => onActivityOpen(m, item)} onReorderItems={onReorderItems}
                setEditItem={setEditItem} setDeleteItem={setDeleteItem} />
            )}
            {canEdit && <button onClick={() => setAddItem(m.id)} style={{ ...btnOutline(), marginTop: 8, fontSize: 12 }}>+ Add Item</button>}
          </div>
        )}
      </div>
    );
  });
}

function ItemList({ items, moduleId, canEdit, progress, onActivityOpen, onReorderItems, setEditItem, setDeleteItem }) {
  const handleReorder = useCallback((newItems) => {
    onReorderItems(moduleId, newItems);
  }, [moduleId, onReorderItems]);

  const { dragHandlers: itemDrag, overIdx: itemOver } = useDragDrop(items, handleReorder);

  return items.map((item, ii) => {
    const key = `${moduleId}-${item.id}`;
    const isDone = !!progress[key];
    return (
      <div key={item.id} className={itemOver === ii ? 'drag-over' : ''}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4, background: isDone ? C.success + '10' : C.bg, borderRadius: 8, border: `1px solid ${isDone ? C.success + '44' : C.border}`, cursor: 'pointer', transition: 'background .15s' }}
        onClick={() => onActivityOpen(item)}>
        {canEdit && <span className="drag-handle" {...itemDrag(ii)} onClick={(e) => e.stopPropagation()}>⠿</span>}
        <div style={{ width: 22, height: 22, borderRadius: 6, border: isDone ? `2px solid ${C.success}` : `2px solid ${C.border}`, background: isDone ? C.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, fontWeight: 700 }}>
          {isDone && '✓'}
        </div>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{itemIcon[item.type] || '📄'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.title}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{item.type}{item.slides && ` · ${item.slides.length} slides`}{item.qs && ` · ${item.qs.length} questions`}</div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditItem({ moduleId, item })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: C.muted }} title="Edit item">✏️</button>
            <button onClick={() => setDeleteItem({ moduleId, itemId: item.id, title: item.title })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 4px', color: C.error }} title="Delete item">🗑</button>
          </div>
        )}
        <span style={{ fontSize: 16, color: C.dim, flexShrink: 0 }}>›</span>
      </div>
    );
  });
}

/* ================================================================
   COURSE PAGE (single course view)
   ================================================================ */
function CoursePage({ currentUser, onActivityOpen, onAdminOpen, onLogout, onBack, darkMode, onToggleDark }) {
  const {
    course, setCourse, session, activeQ,
    recordAnswer, recordSurvey, markComplete,
  } = useApp();

  const canEdit = ROLE_PERMISSIONS[currentUser.role]?.editContent;
  const canAdmin = ROLE_PERMISSIONS[currentUser.role]?.adminPanel;
  const isParticipant = currentUser._isParticipant;

  const progressKey = `pedrra-progress-${currentUser.id}`;
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch { return {}; }
  });
  const [expanded, setExpanded] = useState({});
  const [myAnswers, setMyAnswers] = useState({});

  // Editing modals
  const [addModOpen, setAddModOpen] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [deleteMod, setDeleteMod] = useState(null);
  const [addItem, setAddItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ message: msg, type });
  const [searchItems, setSearchItems] = useState('');

  useEffect(() => {
    try { localStorage.setItem(progressKey, JSON.stringify(progress)); } catch { /* noop */ }
  }, [progress, progressKey]);

  const markDone = (moduleId, itemId) => {
    setProgress((p) => ({ ...p, [`${moduleId}-${itemId}`]: true }));
    markComplete(currentUser.id, moduleId, itemId);
  };

  const handleAnswer = (itemId, qIndex, answerIdx, xp) => {
    const key = `${itemId}-${qIndex}`;
    if (myAnswers[key] !== undefined) return;
    setMyAnswers((p) => ({ ...p, [key]: answerIdx }));
    recordAnswer(currentUser.id, itemId, qIndex, answerIdx, xp);
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAddModule = (mod) => { setCourse({ ...course, modules: [...course.modules, mod] }); showToast('Module added'); };
  const handleEditModule = (mod) => { setCourse({ ...course, modules: course.modules.map((m) => m.id === mod.id ? { ...m, ...mod } : m) }); showToast('Module updated'); };
  const handleDeleteModule = (modId) => { setCourse({ ...course, modules: course.modules.filter((m) => m.id !== modId) }); showToast('Module deleted'); };
  const handleAddItem = (moduleId, item) => {
    setCourse({ ...course, modules: course.modules.map((m) => m.id === moduleId ? { ...m, items: [...m.items, item] } : m) });
    showToast('Item added');
  };
  const handleEditItem = (moduleId, item) => {
    setCourse({ ...course, modules: course.modules.map((m) => m.id === moduleId ? { ...m, items: m.items.map((it) => it.id === item.id ? item : it) } : m) });
    showToast('Item updated');
  };
  const handleDeleteItem = (moduleId, itemId) => {
    setCourse({ ...course, modules: course.modules.map((m) => m.id === moduleId ? { ...m, items: m.items.filter((it) => it.id !== itemId) } : m) });
    showToast('Item deleted');
  };

  const handleReorderModules = (newModules) => {
    setCourse({ ...course, modules: newModules });
  };

  const handleReorderItems = (moduleId, newItems) => {
    setCourse({ ...course, modules: course.modules.map((m) => m.id === moduleId ? { ...m, items: newItems } : m) });
  };

  if (!course) return null;

  const totalItems = course.modules.reduce((s, m) => s + m.items.length, 0);
  const totalDone = Object.keys(progress).length;
  const phases = ['before', 'live', 'after'];
  const courseColor = course.color || C.primary;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>PEDRRA</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>· {currentUser.name}</span>
          </div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onToggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 14, cursor: 'pointer' }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            {canAdmin && (
              <button onClick={onAdminOpen}
                style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                🔧 Admin Panel
              </button>
            )}
            <button onClick={onLogout}
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        }
      />

      {activeQ && isParticipant && (
        <LiveQuestionOverlay activeQ={activeQ} course={course} onAnswer={handleAnswer} myAnswers={myAnswers} />
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
        {/* Back to trainings */}
        <button onClick={onBack}
          style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
          ← All Trainings
        </button>

        {/* Course header */}
        <div style={{ ...card, marginBottom: 20, background: `linear-gradient(135deg, ${courseColor}, ${C.dark})`, border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 32 }}>{course.icon || '📚'}</span>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{course.title}</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: 0 }}>{course.desc}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: 1, textTransform: 'uppercase' }}>Progress</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{totalDone}/{totalItems}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar done={totalDone} total={totalItems} color={C.accent} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
          {course.modules.length > 2 && (
            <input
              style={{ ...input, flex: 1, maxWidth: 300, padding: '8px 12px', fontSize: 13 }}
              placeholder="Search modules & items..."
              value={searchItems}
              onChange={(e) => setSearchItems(e.target.value)}
            />
          )}
          <div style={{ flex: 1 }} />
          {canEdit && (
            <button onClick={() => setAddModOpen(true)} style={btn(C.primary)}>+ Add Module</button>
          )}
        </div>

        {phases.map((phase) => {
          let mods = course.modules.filter((m) => m.phase === phase);
          if (searchItems) {
            const s = searchItems.toLowerCase();
            mods = mods.filter((m) => m.title.toLowerCase().includes(s) || m.items.some((it) => it.title.toLowerCase().includes(s)));
          }
          if (!mods.length) return null;
          return (
            <div key={phase} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${phaseColor[phase]}22` }}>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, background: phaseColor[phase] + '18', color: phaseColor[phase], fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{phaseLabel[phase]}</span>
              </div>
              <ModuleList modules={mods} allModules={course.modules} phase={phase} canEdit={canEdit}
                expanded={expanded} toggleExpand={toggleExpand} progress={progress}
                onActivityOpen={onActivityOpen} onReorderModules={handleReorderModules} onReorderItems={handleReorderItems}
                setEditMod={setEditMod} setDeleteMod={setDeleteMod} setEditItem={setEditItem} setDeleteItem={setDeleteItem} setAddItem={setAddItem} />
            </div>
          );
        })}
      </div>

      <ModuleModal open={addModOpen} onClose={() => setAddModOpen(false)} onSave={handleAddModule} />
      <ModuleModal open={!!editMod} onClose={() => setEditMod(null)} onSave={handleEditModule} initial={editMod} />
      <ConfirmDialog open={!!deleteMod} onClose={() => setDeleteMod(null)} onConfirm={() => handleDeleteModule(deleteMod?.id)} title="Delete Module" message={`Delete "${deleteMod?.title}" and all its items?`} />
      <ItemModal open={!!addItem} onClose={() => setAddItem(null)} onSave={(item) => handleAddItem(addItem, item)} moduleId={addItem} />
      <ItemModal open={!!editItem} onClose={() => setEditItem(null)} onSave={(item) => handleEditItem(editItem?.moduleId, item)} initial={editItem?.item} moduleId={editItem?.moduleId} />
      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => handleDeleteItem(deleteItem?.moduleId, deleteItem?.itemId)} title="Delete Item" message={`Delete "${deleteItem?.title}"?`} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ================================================================
   ACTIVITY VIEW
   ================================================================ */
function ActivityView({ currentUser, module: mod, item, onBack }) {
  const { recordSurvey, markComplete } = useApp();

  const progressKey = `pedrra-progress-${currentUser.id}`;
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); } catch { return {}; }
  });

  const key = `${mod.id}-${item.id}`;
  const isDone = !!progress[key];

  const markDone = () => {
    const updated = { ...progress, [key]: true };
    setProgress(updated);
    try { localStorage.setItem(progressKey, JSON.stringify(updated)); } catch { /* noop */ }
    markComplete(currentUser.id, mod.id, item.id);
  };

  const handleSurveySubmit = (answers) => {
    markDone();
    recordSurvey(currentUser.id, item.id, answers);
  };

  switch (item.type) {
    case 'doc': return <DocViewer item={item} isRead={isDone} onRead={markDone} onBack={onBack} />;
    case 'slides': return <SlideViewer item={item} isComplete={isDone} onComplete={markDone} onBack={onBack} currentUser={currentUser} moduleId={mod.id} />;
    case 'survey': return <SurveyViewer item={item} isSubmitted={isDone} savedAnswers={null} onSubmit={handleSurveySubmit} onBack={onBack} />;
    case 'quiz': return <QuizInfo item={item} onBack={onBack} />;
    default: return <div style={{ padding: 20 }}><button onClick={onBack} style={btnOutline()}>← Back</button><p>Unknown item type.</p></div>;
  }
}

/* ================================================================
   APP ROOT
   ================================================================ */
export default function App() {
  // Allow ?reset in URL to clear all stored data
  if (window.location.search.includes('reset')) {
    ['pedrra-course', 'pedrra-courses', 'pedrra-session', 'pedrra-participants', 'pedrra-responses',
     'pedrra-activeq', 'pedrra-users', 'pedrra-currentUser'].forEach((k) => localStorage.removeItem(k));
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
    return null;
  }

  /* ─── State ─── */
  const [courses, setCoursesState] = useState(migrateCourses);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const course = courses.find((c) => c.id === activeCourseId) || null;

  const [session, setSession] = useState(() => load('pedrra-session'));
  const [participants, setParticipants] = useState(() => load('pedrra-participants') || []);
  const [responses, setResponses] = useState(() => load('pedrra-responses') || {});
  const [activeQ, setActiveQ] = useState(() => load('pedrra-activeq'));
  const [activeSurvey, setActiveSurvey] = useState(null); // { itemId, item } when a survey is pushed live
  const [users, setUsersState] = useState(() => {
    const stored = load('pedrra-users');
    if (!stored) return [{ id: 'admin-default', username: 'admin', name: 'Administrator', role: 'admin', password: 'EDPS2026', status: 'active', createdAt: Date.now() }];
    return stored.map((u) => {
      if (!u.username && u.email) return { ...u, username: u.email.split('@')[0], email: undefined };
      if (!u.username) return { ...u, username: u.id };
      if (u.id === 'admin-default') return { ...u, password: 'EDPS2026' };
      return u;
    });
  });
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('pedrra-dark-mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('pedrra-dark-mode', String(darkMode));
  }, [darkMode]);

  // Presentation state
  const [presentationActive, setPresentationActive] = useState(false);
  const [presentationSlides, setPresentationSlides] = useState(null);
  const [presentationSlideIdx, setPresentationSlideIdx] = useState(0);
  const [presentationItemId, setPresentationItemId] = useState(null);

  // Auth & routing
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = load('pedrra-currentUser');
    if (stored && stored.id && stored.name && stored.role) return stored;
    localStorage.removeItem('pedrra-currentUser');
    return null;
  });
  const [view, setViewRaw] = useState('courseList'); // courseList | course | activity | admin | projector
  const [activityContext, setActivityContext] = useState(null);

  // Course list modals
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourseData, setEditCourseData] = useState(null);
  const [deleteCourseData, setDeleteCourseData] = useState(null);

  // Admin sub-navigation state (lifted from Admin so we can persist across history)
  const [adminTab, setAdminTabRaw] = useState('live');
  const [adminEditing, setAdminEditing] = useState(null); // { itemId, moduleId } when editing an item

  const setView = useCallback((v, extra) => {
    setViewRaw((prev) => {
      if (prev !== v) {
        const state = { view: v, ...extra };
        window.history.pushState(state, '', '');
      }
      return v;
    });
  }, []);

  const setAdminTab = useCallback((tab) => {
    setAdminTabRaw(tab);
    window.history.pushState({ view: 'admin', adminTab: tab }, '', '');
  }, []);

  const setAdminEditingWithHistory = useCallback((editing) => {
    setAdminEditing(editing);
    if (editing) {
      window.history.pushState({ view: 'admin', adminTab: adminTab, editing }, '', '');
    }
  }, [adminTab]);

  const closeAdminEditing = useCallback(() => {
    setAdminEditing(null);
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const state = e.state;
      if (!state?.view) { setViewRaw('courseList'); setActivityContext(null); setAdminEditing(null); return; }
      setViewRaw(state.view);
      if (state.view === 'admin') {
        setAdminTabRaw(state.adminTab || 'live');
        setAdminEditing(state.editing || null);
      } else {
        setAdminEditing(null);
      }
    };
    window.addEventListener('popstate', onPop);
    window.history.replaceState({ view: 'courseList' }, '', '');
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* ─── Persistence ─── */
  const setCourses = useCallback((c) => {
    const val = typeof c === 'function' ? c(courses) : c;
    setCoursesState(val);
    save('pedrra-courses', val);
    // Sync to server so other devices get the course data
    Sync.syncCourses(val);
  }, [courses]);

  const setCourse = useCallback((updatedCourse) => {
    setCourses((prev) => prev.map((c) => c.id === updatedCourse.id ? updatedCourse : c));
  }, [setCourses]);

  useEffect(() => { save('pedrra-session', session); }, [session]);
  useEffect(() => { save('pedrra-participants', participants); }, [participants]);
  useEffect(() => { save('pedrra-responses', responses); }, [responses]);
  useEffect(() => { save('pedrra-activeq', activeQ); }, [activeQ]);

  const setUsers = useCallback((u) => {
    const val = typeof u === 'function' ? u(users) : u;
    setUsersState(val);
    save('pedrra-users', val);
    // Sync to server so other devices get the user list
    Sync.syncUsers(val);
  }, [users]);

  /* ─── BroadcastChannel listener (same-browser tabs only) ─── */
  useEffect(() => {
    let ch;
    try {
      ch = new BroadcastChannel(CH_NAME);
      ch.onmessage = (e) => {
        // Skip if WebSocket is handling cross-device sync — avoid duplicate processing
        if (Sync.isConnected()) return;
        const { type, payload } = e.data || {};
        switch (type) {
          case 'JOIN':
            if (session && payload.code === session.code) {
              setParticipants((prev) => {
                if (prev.find((p) => p.id === payload.participant.id)) return prev;
                return [...prev, payload.participant];
              });
            }
            break;
          case 'ANSWER':
            setResponses((prev) => {
              const key = `${payload.itemId}-${payload.qIndex}`;
              const existing = prev[key] || { counts: [], answers: [] };
              const counts = [...(existing.counts || [])];
              counts[payload.answerIdx] = (counts[payload.answerIdx] || 0) + 1;
              return { ...prev, [key]: { counts, answers: [...(existing.answers || []), payload] } };
            });
            if (payload.xp) {
              setParticipants((prev) => prev.map((p) =>
                p.id === payload.participantId ? { ...p, xp: (p.xp || 0) + payload.xp, answers: (p.answers || 0) + 1 } : p
              ));
            }
            break;
          case 'PUSH_Q': setActiveQ(payload); startTimer(payload.timer); break;
          case 'REVEAL': setActiveQ((prev) => prev ? { ...prev, revealed: true } : prev); stopTimer(); break;
          case 'PUSH_SURVEY': setActiveSurvey(payload); break;
          case 'CLEAR_SURVEY': setActiveSurvey(null); break;
          case 'SESSION': setSession(payload); break;
          case 'PRESENT_START':
            setPresentationActive(true);
            setPresentationSlides(payload.slides);
            setPresentationSlideIdx(0);
            setPresentationItemId(payload.itemId);
            break;
          case 'SLIDE_NAV':
            setPresentationSlideIdx(payload.slideIdx);
            // If we were showing poll results, going to next slide clears activeQ
            if (activeQ?.fromPresentation) setActiveQ(null);
            break;
          case 'PRESENT_END':
            setPresentationActive(false);
            setPresentationSlides(null);
            setPresentationSlideIdx(0);
            setPresentationItemId(null);
            if (activeQ?.fromPresentation) setActiveQ(null);
            break;
          default: break;
        }
      };
    } catch { /* noop */ }
    return () => { try { ch?.close(); } catch { /* noop */ } };
  }, [session]);

  /* ─── localStorage polling fallback (only when WebSocket unavailable) ─── */
  const syncVersionRef = useRef(localStorage.getItem('pedrra-sync-version') || '0');
  useEffect(() => {
    const poll = setInterval(() => {
      // Skip polling when WebSocket is active (more efficient)
      if (Sync.isConnected()) return;
      const current = localStorage.getItem('pedrra-sync-version') || '0';
      if (current === syncVersionRef.current) return;
      syncVersionRef.current = current;
      const s = load('pedrra-session');
      const p = load('pedrra-participants');
      const r = load('pedrra-responses');
      const q = load('pedrra-activeq');
      if (JSON.stringify(s) !== JSON.stringify(session)) setSession(s);
      if (JSON.stringify(p) !== JSON.stringify(participants)) setParticipants(p || []);
      if (JSON.stringify(r) !== JSON.stringify(responses)) setResponses(r || {});
      if (JSON.stringify(q) !== JSON.stringify(activeQ)) setActiveQ(q);
    }, 3000);
    return () => clearInterval(poll);
  }, [session, participants, responses, activeQ]);

  /* ─── WebSocket real-time sync (cross-device) ─── */
  // Use refs so WebSocket handlers always see latest state
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!currentUser) return;

    const code = session?.code || currentUser?._sessionCode;

    // Common message handlers
    const messageHandlers = {
      onPresentation: (data) => {
        if (data.active) {
          setPresentationActive(true);
          if (data.slides) setPresentationSlides(data.slides);
          setPresentationSlideIdx(data.slideIdx || 0);
          setPresentationItemId(data.itemId);
        } else {
          setPresentationActive(false);
          setPresentationSlides(null);
          setPresentationSlideIdx(0);
          setPresentationItemId(null);
        }
      },
      onSlideNav: (slideIdx) => {
        setPresentationSlideIdx(slideIdx);
        // Clear presentation polls when navigating to a DIFFERENT slide
        setActiveQ(prev => {
          if (!prev?.fromPresentation) return prev;
          if (prev.slideIdx === slideIdx) return prev; // same slide, keep poll
          return null;
        });
      },
      onPresentationEnd: () => {
        setPresentationActive(false);
        setPresentationSlides(null);
        setPresentationSlideIdx(0);
        setPresentationItemId(null);
        setActiveQ(prev => prev?.fromPresentation ? null : prev);
      },
      onActiveQ: (data) => {
        if (data) {
          setActiveQ(data);
          if (!data.revealed && data.timer) startTimer(data.timer);
          if (data.revealed) stopTimer();
        } else {
          setActiveQ(null);
        }
      },
      onParticipants: (list) => {
        setParticipants(list);
      },
      onResponses: (data) => {
        setResponses(data);
      },
      onAnswer: (data) => {
        // Update local response counts from server
        setResponses(prev => {
          const key = `${data.itemId}-${data.qIndex}`;
          const existing = prev[key] || { counts: [], answers: [] };
          return {
            ...prev,
            [key]: {
              counts: data.responseCounts || existing.counts,
              answers: [...(existing.answers || []), data],
            },
          };
        });
        // Update participant data if server sent it
        if (data.participants) setParticipants(data.participants);
      },
      onSurveyPush: (data) => {
        if (data) setActiveSurvey(data);
        else setActiveSurvey(null);
      },
      onSessionEnd: () => {
        setSession(null);
        setPresentationActive(false);
        setPresentationSlides(null);
        setActiveQ(null);
        setActiveSurvey(null);
      },
      // When a session is discovered (for users without a code)
      onDiscovered: (data) => {
        if (data?.code && !session) {
          setSession(data.session);
          // Now subscribe to that session
          Sync.connect(data.code, messageHandlers);
        }
      },
      // Receive synced users from server (created by admin on another device)
      onSyncUsers: (serverUsers) => {
        if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsersState(serverUsers);
          save('pedrra-users', serverUsers);
        }
      },
      // Receive synced courses from server
      onSyncCourses: (serverCourses) => {
        if (serverCourses && Array.isArray(serverCourses) && serverCourses.length > 0) {
          setCoursesState(serverCourses);
          save('pedrra-courses', serverCourses);
        }
      },
    };

    if (code) {
      // We know the session code — connect directly
      Sync.connect(code, messageHandlers);
    } else {
      // No session code — ask the server if there's an active session
      Sync.connectAndDiscover(messageHandlers);
    }

    return () => Sync.disconnect();
  }, [session?.code, currentUser?.id]);

  /* ─── Handle ?item= URL parameter for direct QR navigation ─── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlItemId = params.get('item');
    if (urlItemId && currentUser) {
      // Find the item in any course
      for (const c of courses) {
        for (const mod of c.modules) {
          const item = mod.items.find(i => i.id === urlItemId);
          if (item) {
            setActiveCourseId(c.id);
            setActivityContext({ module: mod, item });
            setViewRaw('activity');
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }
      }
    }
  }, []); // Run once on mount

  /* ─── Online / Offline ─── */
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* ─── PWA Install Prompt ─── */
  const [installPrompt, setInstallPrompt] = useState(null);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  /* ─── Timer ─── */
  const startTimer = (duration) => {
    stopTimer();
    const d = duration || 30;
    setTimer(d);
    timerRef.current = setInterval(() => {
      setTimer((t) => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  /* ─── Session actions ─── */
  const launchSession = useCallback(() => {
    const s = { code: genCode(), courseId: activeCourseId, startedAt: Date.now() };
    setSession(s);
    broadcastMsg('SESSION', s);
    Sync.createSession(s);
  }, [activeCourseId]);

  const pushQuestion = useCallback((itemId, qIndex, fromPresentation) => {
    if (fromPresentation) {
      // Poll launched from PresenterView - activeQ set via broadcast handler
      return;
    }
    const q = { itemId, qIndex, pushedAt: Date.now(), revealed: false };
    setActiveQ(q);
    broadcastMsg('PUSH_Q', q);
    startTimer();
  }, []);

  const revealAnswer = useCallback(() => {
    setActiveQ((prev) => prev ? { ...prev, revealed: true } : prev);
    broadcastMsg('REVEAL', {});
    Sync.revealAnswer(session?.code);
    stopTimer();
  }, [session]);

  // Auto-reveal when all participants have voted
  useEffect(() => {
    if (!activeQ || activeQ.revealed || !activeQ.autoReveal) return;
    if (participants.length === 0) return;
    const qKey = activeQ.fromPresentation
      ? `${activeQ.itemId}-slide-${activeQ.slideIdx}`
      : `${activeQ.itemId}-${activeQ.qIndex}`;
    const r = responses[qKey];
    const count = r ? (r.counts || []).reduce((s, c) => s + (c || 0), 0) : 0;
    if (count > 0 && count >= participants.length) {
      revealAnswer();
    }
  }, [responses, activeQ, participants.length, revealAnswer]);

  /* ─── Participant actions ─── */
  const recordAnswer = useCallback((participantId, itemId, qIndex, answerIdx, xp) => {
    setResponses((prev) => {
      const key = `${itemId}-${qIndex}`;
      const existing = prev[key] || { counts: [], answers: [] };
      const counts = [...(existing.counts || [])];
      counts[answerIdx] = (counts[answerIdx] || 0) + 1;
      return { ...prev, [key]: { counts, answers: [...(existing.answers || []), { participantId, answerIdx }] } };
    });
    // For presentation polls, qIndex is like "slide-3"; for quiz it's numeric
    const isPresentationPoll = typeof qIndex === 'string' && qIndex.startsWith('slide-');
    let isCorrect = false;
    if (isPresentationPoll) {
      // Get ok from activeQ payload
      const ok = activeQ?.ok;
      isCorrect = ok != null && (ok < 0 || answerIdx === ok);
    } else {
      const q = course?.modules.flatMap((m) => m.items.filter((i) => i.id === itemId)).flatMap((i) => i.qs || [])[qIndex];
      isCorrect = q && (q.ok < 0 || answerIdx === q.ok);
    }
    if (isCorrect && xp > 0) {
      setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, xp: (p.xp || 0) + xp, answers: (p.answers || 0) + 1 } : p));
    } else {
      setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, answers: (p.answers || 0) + 1 } : p));
    }
    broadcastMsg('ANSWER', { participantId, itemId, qIndex, answerIdx, xp: isCorrect ? xp : 0 });
    Sync.submitAnswer(session?.code, { participantId, itemId, qIndex, answerIdx, xp: isCorrect ? xp : 0 });
  }, [course, activeQ, session]);

  const recordSurvey = useCallback((participantId, itemId, answers) => {
    setResponses((prev) => ({ ...prev, [`survey-${itemId}-${participantId}`]: { answers, submittedAt: Date.now() } }));
    // Also sync survey response via WebSocket
    if (session?.code) {
      Sync.submitAnswer(session.code, { participantId, itemId, type: 'survey', answers });
    }
  }, [session]);

  const pushSurvey = useCallback((itemId) => {
    const item = course?.modules.flatMap((m) => m.items).find((i) => i.id === itemId);
    if (!item) return;
    const payload = { itemId, title: item.title, desc: item.desc, qs: item.qs, pushedAt: Date.now() };
    setActiveSurvey(payload);
    broadcastMsg('PUSH_SURVEY', payload);
    if (session?.code) Sync.pushSurvey(session.code, payload);
  }, [course, session]);

  const clearSurvey = useCallback(() => {
    setActiveSurvey(null);
    broadcastMsg('CLEAR_SURVEY', {});
    if (session?.code) Sync.clearSurvey(session.code);
  }, [session]);

  const markComplete = useCallback((participantId, moduleId, itemId) => {
    // Track completion via responses for analytics
    if (participantId && moduleId && itemId) {
      setResponses((prev) => ({
        ...prev,
        [`complete-${moduleId}-${itemId}-${participantId}`]: { completedAt: Date.now() },
      }));
    }
  }, []);

  const getResponseCount = useCallback((itemId, qIndex) => {
    const r = responses[`${itemId}-${qIndex}`];
    return r ? (r.counts || []).reduce((s, c) => s + (c || 0), 0) : 0;
  }, [responses]);

  const getResponseDist = useCallback((itemId, qIndex) => {
    return (responses[`${itemId}-${qIndex}`]?.counts) || [];
  }, [responses]);

  /* ─── Auto-create session for admin/facilitator ─── */
  useEffect(() => {
    if (!currentUser) return;
    const isTrainer = currentUser.role === 'admin' || currentUser.role === 'facilitator';
    if (isTrainer && !session) {
      // Auto-create a session so WebSocket connects and students can sync
      const s = { code: genCode(), courseId: activeCourseId || courses[0]?.id, startedAt: Date.now() };
      setSession(s);
      broadcastMsg('SESSION', s);
      Sync.createSession(s);
      // Push users and courses to server so other devices can access them
      setTimeout(() => {
        Sync.syncUsers(users);
        Sync.syncCourses(courses);
      }, 1000);
    }
  }, [currentUser?.id]); // Only run when user changes

  /* ─── Auth handlers ─── */
  const handleLogin = (user) => {
    // Create a copy — never mutate the original
    const loginUser = { ...user };
    if (!loginUser._isParticipant && session?.code) {
      loginUser._sessionCode = session.code;
    }
    setCurrentUser(loginUser);
    save('pedrra-currentUser', loginUser);
    // Auto-select the first course if only one exists
    if (courses.length === 1) {
      setActiveCourseId(courses[0].id);
      setView('course');
    } else {
      setView('courseList');
    }
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Navigate directly to a specific item (used when scanning QR codes)
  const navigateToItem = useCallback((itemId) => {
    const course = courses.find(c => c.id === activeCourseId) || courses[0];
    if (!course) return;
    for (const mod of course.modules) {
      const item = mod.items.find(i => i.id === itemId);
      if (item) {
        setActiveCourseId(course.id);
        setActivityContext({ module: mod, item });
        setView('activity');
        return;
      }
    }
  }, [courses, activeCourseId]);

  const handleJoinSession = async (code, name, team) => {
    const id = genId();
    const participant = { id, name, team, xp: 0, answers: 0, joinedAt: Date.now() };
    broadcastMsg('JOIN', { code, participant });
    Sync.joinSession(code, participant);
    setParticipants((prev) => {
      if (prev.find((p) => p.id === participant.id)) return prev;
      return [...prev, participant];
    });
    const tempUser = { id, username: `participant-${id}`, name, role: 'viewer', _isParticipant: true, _team: team, _sessionCode: code };
    setCurrentUser(tempUser);
    save('pedrra-currentUser', tempUser);

    // Check for ?item= parameter (QR code scan)
    const urlItemId = new URLSearchParams(window.location.search).get('item');
    if (urlItemId) {
      // Navigate directly to the linked item
      if (session?.courseId) setActiveCourseId(session.courseId);
      else if (courses.length === 1) setActiveCourseId(courses[0].id);
      // Small delay to let state settle, then navigate
      setTimeout(() => navigateToItem(urlItemId), 100);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // If there's a session with a courseId, go directly to that course
    if (session?.courseId) {
      setActiveCourseId(session.courseId);
      setView('course');
    } else if (courses.length === 1) {
      setActiveCourseId(courses[0].id);
      setView('course');
    } else {
      setView('courseList');
    }
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pedrra-currentUser');
    setViewRaw('courseList');
    setActivityContext(null);
    setActiveCourseId(null);
  };

  /* ─── Course CRUD ─── */
  const handleAddCourse = (c) => {
    setCourses((prev) => [...prev, c]);
  };
  const handleEditCourse = (c) => {
    setCourses((prev) => prev.map((existing) => existing.id === c.id ? { ...existing, ...c } : existing));
  };
  const handleDeleteCourse = (courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    if (activeCourseId === courseId) setActiveCourseId(null);
  };

  const handleDuplicateCourse = (course) => {
    const newId = 'course-' + genId();
    const cloned = JSON.parse(JSON.stringify(course));
    cloned.id = newId;
    cloned.title = course.title + ' (copy)';
    cloned.createdAt = Date.now();
    // Give new IDs to all modules and items
    cloned.modules = cloned.modules.map((m) => ({
      ...m, id: genId(),
      items: m.items.map((it) => ({ ...it, id: genId() })),
    }));
    setCourses((prev) => [...prev, cloned]);
  };

  /* ─── Context value ─── */
  const startPresentation = useCallback((itemId, slides) => {
    // Auto-create session if none exists
    let code = session?.code;
    if (!code) {
      const s = { code: genCode(), courseId: activeCourseId || courses[0]?.id, startedAt: Date.now() };
      setSession(s);
      broadcastMsg('SESSION', s);
      Sync.createSession(s);
      code = s.code;
      // Give WebSocket time to connect before sending presentation
      setTimeout(() => {
        Sync.startPresentation(code, itemId, slides);
      }, 500);
    } else {
      Sync.startPresentation(code, itemId, slides);
    }
    setPresentationActive(true);
    setPresentationSlides(slides);
    setPresentationSlideIdx(0);
    setPresentationItemId(itemId);
    broadcastMsg('PRESENT_START', { itemId, slides });
  }, [session, activeCourseId, courses]);

  const endPresentation = useCallback(() => {
    setPresentationActive(false);
    setPresentationSlides(null);
    setPresentationSlideIdx(0);
    setPresentationItemId(null);
    broadcastMsg('PRESENT_END', {});
    Sync.endPresentation(session?.code);
    if (activeQ?.fromPresentation) setActiveQ(null);
  }, [activeQ, session]);

  const navigateSlide = useCallback((slideIdx) => {
    setPresentationSlideIdx(slideIdx);
    broadcastMsg('SLIDE_NAV', { slideIdx, itemId: presentationItemId });
    Sync.navigateSlide(session?.code, slideIdx);
  }, [presentationItemId, session]);

  const ctx = {
    course, setCourse,
    courses, setCourses,
    session, launchSession,
    participants, setParticipants,
    responses,
    activeQ, pushQuestion, revealAnswer,
    activeSurvey, pushSurvey, clearSurvey,
    timer,
    getResponseCount, getResponseDist,
    recordAnswer, recordSurvey, markComplete,
    broadcast: (type, payload) => {
      broadcastMsg(type, payload);
      // Also sync via WebSocket for cross-device
      if (session?.code) {
        if (type === 'PUSH_Q') Sync.pushQuestion(session.code, payload);
        else if (type === 'REVEAL') Sync.revealAnswer(session.code);
        else if (type === 'SLIDE_NAV') Sync.navigateSlide(session.code, payload.slideIdx);
        else if (type === 'PUSH_SURVEY') Sync.pushSurvey(session.code, payload);
        else if (type === 'CLEAR_SURVEY') Sync.clearSurvey(session.code);
      }
    },
    setView,
    users, setUsers,
    currentUser,
    presentationActive, presentationSlides, presentationSlideIdx, presentationItemId,
    startPresentation, endPresentation, navigateSlide,
  };

  /* ─── Render ─── */
  const { t: _t } = useI18n();
  return (
    <AppContext.Provider value={ctx}>
      {!isOnline && (
        <div style={{ background: '#ED8936', color: '#fff', padding: '6px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center', position: 'sticky', top: 0, zIndex: 9999 }}>
          {_t('offline.banner')}
        </div>
      )}
      {!currentUser ? (
        <LoginScreen users={users} onLogin={handleLogin} onJoinSession={handleJoinSession} installPrompt={installPrompt} onInstall={handleInstall} />
      ) : (
        <>
          {view === 'courseList' && (
            <>
              <CourseListPage
                currentUser={currentUser}
                courses={courses}
                onCourseSelect={(id) => { setActiveCourseId(id); setView('course'); }}
                onAdminOpen={() => { if (!activeCourseId && courses.length) setActiveCourseId(courses[0].id); setView('admin'); }}
                onLogout={handleLogout}
                onAddCourse={() => setAddCourseOpen(true)}
                onEditCourse={(c) => setEditCourseData(c)}
                onDeleteCourse={(c) => setDeleteCourseData(c)}
                onDuplicateCourse={handleDuplicateCourse}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode((d) => !d)}
              />
              <CourseCardModal open={addCourseOpen} onClose={() => setAddCourseOpen(false)} onSave={handleAddCourse} />
              <CourseCardModal open={!!editCourseData} onClose={() => setEditCourseData(null)} onSave={handleEditCourse} initial={editCourseData} />
              <ConfirmDialog open={!!deleteCourseData} onClose={() => setDeleteCourseData(null)}
                onConfirm={() => { handleDeleteCourse(deleteCourseData?.id); setDeleteCourseData(null); }}
                title="Delete Training" message={`Delete "${deleteCourseData?.title}" and all its content? This cannot be undone.`} />
            </>
          )}
          {view === 'course' && (
            <CoursePage
              currentUser={currentUser}
              onActivityOpen={(mod, item) => { setActivityContext({ module: mod, item }); setView('activity'); }}
              onAdminOpen={() => setView('admin')}
              onLogout={handleLogout}
              onBack={() => setView('courseList')}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
            />
          )}
          {view === 'activity' && activityContext && (
            <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              <Header
                left={<span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>PEDRRA</span>}
                right={
                  <button onClick={() => setView('course')}
                    style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    ← Back to Course
                  </button>
                }
              />
              <ActivityView currentUser={currentUser} module={activityContext.module} item={activityContext.item} onBack={() => setView('course')} />
            </div>
          )}
          {view === 'admin' && (
            <Admin onExit={() => setView(activeCourseId ? 'course' : 'courseList')} currentUser={currentUser}
              adminTab={adminTab} setAdminTab={setAdminTab}
              adminEditing={adminEditing} setAdminEditing={setAdminEditingWithHistory} closeAdminEditing={closeAdminEditing} />
          )}
          {view === 'projector' && (
            <Projector onExit={() => setView('admin')} />
          )}
        </>
      )}
    </AppContext.Provider>
  );
}
