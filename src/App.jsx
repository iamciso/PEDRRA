import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C, phaseColor, phaseLabel, itemIcon, ANS, card, btn, btnOutline, input, header, tab } from './theme';
import { DEFAULT_COURSE } from './courseData';

/* ================================================================
   UTILITIES
   ================================================================ */

const genCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[~~(Math.random() * 31)]).join('');

const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ } };

// BroadcastChannel wrapper for cross-tab sync (admin <-> participant tabs on same browser)
const CH_NAME = 'pedrra-sync';
const broadcast = (type, payload) => {
  try { const ch = new BroadcastChannel(CH_NAME); ch.postMessage({ type, payload }); ch.close(); } catch { /* noop */ }
};

const joinUrl = (code) => {
  const base = window.location.origin + window.location.pathname;
  return `${base}?code=${code}`;
};

/* ================================================================
   CONTEXT
   ================================================================ */

const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

/* ================================================================
   REUSABLE COMPONENTS
   ================================================================ */

function Header({ left, right, children }) {
  return (
    <div style={header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
      {children}
    </div>
  );
}

function ProgressBar({ done, total, color = C.primary }) {
  const pct = total > 0 ? ~~(done / total * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

function Slide({ s, big }) {
  if (!s) return null;
  const f = big ? 1 : 0.55;
  const layouts = {
    title:   { bg: `linear-gradient(135deg, ${C.primary}, ${C.dark})`, c: '#fff', align: 'center', title: 42 * f, body: 20 * f, pad: 50 * f },
    content: { bg: C.white, c: C.text, align: 'left', title: 28 * f, body: 16 * f, pad: 36 * f },
    quote:   { bg: C.light, c: C.primary, align: 'center', title: 22 * f, body: 20 * f, pad: 50 * f },
  };
  const l = layouts[s.l] || layouts.content;
  return (
    <div style={{ background: l.bg, color: l.c, borderRadius: 12, padding: l.pad,
      minHeight: big ? 360 : 160, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', textAlign: l.align, border: `1px solid ${C.border}` }}>
      <h2 style={{ fontSize: l.title, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{s.t}</h2>
      <div style={{ fontSize: l.body, lineHeight: 1.7, whiteSpace: 'pre-wrap', opacity: 0.9 }}>{s.c}</div>
    </div>
  );
}

function SurveyQuestion({ q, answers, setAnswers }) {
  const val = answers[q.id];
  const set = (v) => setAnswers((p) => ({ ...p, [q.id]: v }));

  if (q.type === 'header') {
    return (
      <div style={{ marginBottom: 4, padding: '4px 12px 0', borderLeft: `3px solid ${C.primary}` }}>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
          {q.text}
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12, padding: 12, background: C.bg, borderRadius: 8 }}>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: C.text, lineHeight: 1.5 }}>{q.text}</p>

      {q.type === 'scale' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} onClick={() => set(v)} style={{
              width: 40, height: 40, borderRadius: 8,
              border: val === v ? `2px solid ${C.primary}` : '1px solid #d1d5db',
              background: val === v ? C.light : '#fff', color: C.text,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>{v}</button>
          ))}
        </div>
      )}

      {q.type === 'tf' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {(q.opts || ['True', 'False']).map((o, i) => (
            <button key={i} onClick={() => set(i)} style={{
              flex: 1, padding: 12, borderRadius: 8,
              border: val === i ? `2px solid ${C.primary}` : '1px solid #d1d5db',
              background: val === i ? C.light : '#fff', color: C.text,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{o}</button>
          ))}
        </div>
      )}

      {q.type === 'choice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(q.opts || []).map((o, i) => (
            <button key={i} onClick={() => set(i)} style={{
              padding: '10px 14px', borderRadius: 8, textAlign: 'left',
              border: val === i ? `2px solid ${C.primary}` : '1px solid #d1d5db',
              background: val === i ? C.light : '#fff', color: C.text,
              fontSize: 14, cursor: 'pointer',
            }}>{o}</button>
          ))}
        </div>
      )}

      {q.type === 'text' && (
        <textarea
          style={{ ...input, minHeight: 50, resize: 'vertical' }}
          value={val || ''}
          onChange={(e) => set(e.target.value)}
        />
      )}
    </div>
  );
}

/* ================================================================
   VIEWS
   ================================================================ */

/* ── Home ──────────────────────────────────────────── */
function HomeView() {
  const { setView, launchSession } = useApp();
  return (
    <div style={{ minHeight: '100vh', background: C.white, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={<span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>EUROPEAN DATA PROTECTION SUPERVISOR</span>}
      />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.light,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28 }}>
          {'\u{1F6E1}\uFE0F'}
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: C.primary, margin: '0 0 4px' }}>PEDRRA</h1>
        <p style={{ fontSize: 14, color: C.text, margin: '0 0 4px' }}>PErsonal Data bReach Risk Assessment</p>
        <p style={{ fontSize: 12, color: C.dim, margin: '0 0 32px' }}>Learning Management System</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          <button onClick={() => { setView('admin'); }} style={btn(C.primary)}>
            {'\u{1F527}'} Admin Panel
          </button>
          <button onClick={() => { launchSession(); setView('admin'); }} style={btn(C.success)}>
            {'\u{1F393}'} Launch Live Session
          </button>
          <button onClick={() => setView('join')} style={btnOutline()}>
            {'\u{1F4F1}'} Join as Participant
          </button>
        </div>

        <div style={{ marginTop: 32, padding: '10px 14px', background: C.light, borderRadius: 10, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 11, color: C.text, lineHeight: 1.6 }}>
            <strong>{'\u{1F512}'} Privacy by Design:</strong> All data stays in your browser. No accounts, no server tracking. EUDPR compliant.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Join ──────────────────────────────────────────── */
function JoinView() {
  const { setView, joinCode, setJoinCode, joinSession } = useApp();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!team) { setError('Please select a team'); return; }
    joinSession(name.trim(), team);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header left={<span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PEDRRA</span>} />
      <div style={{ maxWidth: 360, margin: '0 auto', padding: '32px 20px' }}>
        <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
          {'\u2190'} Back
        </button>
        <div style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 20, color: C.text }}>Join Session</h2>

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 2 }}>Session Code</label>
          <input
            style={{ ...input, fontSize: 18, fontFamily: 'monospace', letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase', marginBottom: 10 }}
            placeholder="ABC123" maxLength={6}
            value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 2 }}>Name</label>
          <input style={{ ...input, marginBottom: 10 }} placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 2 }}>Team</label>
          <select style={{ ...input, background: '#fff', marginBottom: 16 }} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Select...</option>
            {[1, 2, 3, 4, 5].map((i) => <option key={i} value={`Team ${i}`}>Team {i}</option>)}
          </select>

          {error && <p style={{ color: C.error, fontSize: 13, margin: '0 0 10px' }}>{error}</p>}

          <button onClick={handleJoin} style={{ ...btn(C.primary), width: '100%' }}>Join</button>
        </div>
      </div>
    </div>
  );
}

/* ── Admin ─────────────────────────────────────────── */
function AdminView() {
  const {
    course, setCourse, session, launchSession, setView,
    participants, responses, activeQ, pushQuestion, revealAnswer,
    timer, timerRunning, getResponseCount, getResponseDist,
  } = useApp();

  const [adminTab, setAdminTab] = useState(session ? 'live' : 'course');
  const [editMod, setEditMod] = useState(null);

  const allQuizItems = course.modules.flatMap((m) =>
    m.items.filter((i) => i.qs).map((i) => ({ ...i, module: m }))
  );
  const activeItem = activeQ ? allQuizItems.find((i) => i.id === activeQ.itemId) : null;
  const activeQuestion = activeItem?.qs?.[activeQ?.qIndex];

  const exportCSV = () => {
    let csv = 'Name,Team,XP,Answers\n';
    participants.forEach((p) => { csv += `"${p.name}","${p.team}",${p.xp},${p.answers}\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pedrra-results.csv';
    a.click();
  };

  const tabs = [
    ['course', '\u{1F4D6} Course'],
    ['people', '\u{1F465} Participants'],
    ...(session ? [['live', '\u{1F534} Live']] : []),
    ['results', '\u{1F4CA} Results'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={
          <>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>PEDRRA Admin</span>
            {session && (
              <span style={{ color: C.accent, fontSize: 12 }}>
                Session: <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }}>{session.code}</span>
                {' \u00B7 '}{participants.length} joined
              </span>
            )}
          </>
        }
        right={
          <>
            {session && <button onClick={() => setView('projector')} style={btn(C.purple)}>{'\u{1F4FA}'} Projector</button>}
            {!session && <button onClick={launchSession} style={btn(C.success)}>{'\u{1F393}'} Launch</button>}
            <button onClick={() => setView('home')} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              {'\u2190'} Home
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 16px', gap: 2 }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setAdminTab(k)} style={tab(adminTab === k)}>{l}</button>)}
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}>
        {/* ── Course Tab ── */}
        {adminTab === 'course' && (
          <div>
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.dim }}>Title</label>
                  <input style={input} value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.dim }}>Description</label>
                  <input style={input} value={course.desc} onChange={(e) => setCourse({ ...course, desc: e.target.value })} />
                </div>
              </div>
            </div>

            {course.modules.map((m, mi) => {
              const isEdit = editMod === m.id;
              return (
                <div key={m.id} style={{ ...card, marginBottom: 8, borderLeft: `4px solid ${phaseColor[m.phase] || C.primary}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      {isEdit ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input style={{ ...input, fontWeight: 700 }} value={m.title}
                            onChange={(e) => { const ms = [...course.modules]; ms[mi] = { ...ms[mi], title: e.target.value }; setCourse({ ...course, modules: ms }); }} />
                          <input style={input} value={m.desc} placeholder="Description"
                            onChange={(e) => { const ms = [...course.modules]; ms[mi] = { ...ms[mi], desc: e.target.value }; setCourse({ ...course, modules: ms }); }} />
                          <select style={{ ...input, background: '#fff' }} value={m.phase}
                            onChange={(e) => { const ms = [...course.modules]; ms[mi] = { ...ms[mi], phase: e.target.value }; setCourse({ ...course, modules: ms }); }}>
                            <option value="before">Before Training</option>
                            <option value="live">Training Day</option>
                            <option value="after">After Training</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <h4 style={{ margin: '0 0 2px', fontSize: 14, color: C.text }}>
                            {m.title}{' '}
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8,
                              background: phaseColor[m.phase] + '18', color: phaseColor[m.phase], fontWeight: 700 }}>
                              {m.phase}
                            </span>
                          </h4>
                          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{m.desc} {'\u00B7'} {m.items.length} items</p>
                        </>
                      )}
                    </div>
                    {isEdit
                      ? <button onClick={() => setEditMod(null)} style={btn(C.success)}>{'\u2713'}</button>
                      : <button onClick={() => setEditMod(m.id)} style={{ ...btnOutline(C.primary), padding: '4px 10px', fontSize: 12 }}>Edit</button>
                    }
                  </div>
                  {isEdit && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      {m.items.map((it) => (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', marginBottom: 2, background: C.bg, borderRadius: 6, fontSize: 12 }}>
                          <span>{itemIcon[it.type] || '\u{1F4C4}'}</span>
                          <span style={{ flex: 1, fontWeight: 600 }}>{it.title}</span>
                          <span style={{ color: C.dim }}>{it.type}</span>
                          {it.qs && <span style={{ color: C.muted }}>{it.qs.length} qs</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── People Tab ── */}
        {adminTab === 'people' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: C.text }}>Participants ({participants.length})</h2>
              <button onClick={exportCSV} style={btn(C.success)}>{'\u{1F4E5}'} Export CSV</button>
            </div>
            {!participants.length ? (
              <div style={{ ...card, textAlign: 'center', padding: 32, color: C.dim }}>
                No participants yet. {session ? 'Share the join link or QR code.' : 'Launch a session first.'}
              </div>
            ) : (
              <div style={card}>
                <div style={{ display: 'flex', padding: '8px 0', borderBottom: `2px solid ${C.border}`, fontSize: 12, fontWeight: 700, color: C.dim, gap: 8 }}>
                  <span style={{ flex: 2 }}>Name</span>
                  <span style={{ flex: 1 }}>Team</span>
                  <span style={{ width: 60, textAlign: 'right' }}>XP</span>
                  <span style={{ width: 60, textAlign: 'right' }}>Answers</span>
                </div>
                {[...participants].sort((a, b) => b.xp - a.xp).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.text, gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 2, fontWeight: 600 }}>
                      {i === 0 && participants.length > 1 ? '\u{1F947} ' : ''}{p.name}
                    </span>
                    <span style={{ flex: 1, color: C.muted }}>{p.team}</span>
                    <span style={{ width: 60, textAlign: 'right', fontWeight: 700, color: C.warning }}>{'\u26A1'}{p.xp}</span>
                    <span style={{ width: 60, textAlign: 'right', color: C.muted }}>{p.answers}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Live Tab ── */}
        {adminTab === 'live' && session && (
          <div>
            {/* Session info + QR */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, padding: 14, marginBottom: 14, flexWrap: 'wrap' }}>
              <QRCodeSVG value={joinUrl(session.code)} size={90} fgColor={C.primary} style={{ borderRadius: 8 }} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, color: C.text }}>
                  Session: <span style={{ fontFamily: 'monospace', fontSize: 22, color: C.primary, letterSpacing: 3 }}>{session.code}</span>
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: C.muted }}>{participants.length} participants connected</p>
                <p style={{ margin: 0, fontSize: 11, color: C.dim, wordBreak: 'break-all' }}>{joinUrl(session.code)}</p>
              </div>
              <button onClick={() => setView('projector')} style={btn(C.purple)}>{'\u{1F4FA}'} Projector</button>
            </div>

            {/* Active question banner */}
            {activeQuestion && (
              <div style={{ ...card, marginBottom: 14, border: `2px solid ${C.warning}`, background: '#FFFBF0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.error, animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>LIVE QUESTION</span>
                  {timerRunning && (
                    <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 22, color: timer < 10 ? C.error : C.text }}>{timer}s</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: C.text, margin: '0 0 8px', lineHeight: 1.5 }}>{activeQuestion.text}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: C.muted }}>
                    {getResponseCount(activeQuestion.id)}/{participants.length} responses
                  </span>
                  <div style={{ flex: 1 }} />
                  {!activeQ.revealed && activeQuestion.ok >= 0 && (
                    <button onClick={revealAnswer} style={btn(C.success)}>{'\u2713'} Reveal Answer</button>
                  )}
                  {activeQ.revealed && <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>Answer revealed</span>}
                </div>
              </div>
            )}

            {/* Push questions */}
            <h3 style={{ fontSize: 15, color: C.text, margin: '0 0 10px' }}>Push Questions</h3>
            {course.modules.map((m) => {
              const quizItems = m.items.filter((i) => i.qs);
              if (!quizItems.length) return null;
              return (
                <div key={m.id} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: phaseColor[m.phase], margin: '0 0 6px' }}>
                    {m.icon} {m.title}
                  </p>
                  {quizItems.map((it) => (
                    <div key={it.id} style={{ ...card, marginBottom: 4, padding: 12 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: '0 0 6px' }}>
                        {it.title} <span style={{ fontSize: 11, color: C.dim, fontWeight: 400 }}>{'\u00B7'} {it.qs.length} questions</span>
                      </p>
                      {it.qs.map((q, qi) => {
                        const isActive = activeQ?.itemId === it.id && activeQ?.qIndex === qi;
                        return (
                          <div key={q.id} onClick={() => pushQuestion(it.id, qi)}
                            style={{ padding: '6px 10px', marginBottom: 2, borderRadius: 6, cursor: 'pointer',
                              border: isActive ? `2px solid ${C.primary}` : '1px solid transparent',
                              background: isActive ? C.light : '#f9fafb', fontSize: 12,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: C.text }}>
                              {qi + 1}. {q.text.length > 60 ? q.text.substring(0, 60) + '...' : q.text}
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {isActive && (
                                <span style={{ color: C.primary, fontWeight: 700 }}>
                                  {getResponseCount(q.id)}/{participants.length}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: C.dim, padding: '1px 5px', borderRadius: 4, background: '#e2e8f0' }}>
                                {q.type}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Results Tab ── */}
        {adminTab === 'results' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: C.text }}>Results & Analytics</h2>
              <button onClick={exportCSV} style={btn(C.success)}>{'\u{1F4E5}'} Export</button>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Participants', value: participants.length, color: C.primary },
                { label: 'Avg XP', value: participants.length ? ~~(participants.reduce((s, p) => s + p.xp, 0) / participants.length) : 0, color: C.warning },
                { label: 'Questions Pushed', value: Object.keys(responses).length, color: C.success },
                { label: 'Teams', value: [...new Set(participants.map((p) => p.team))].length, color: C.purple },
              ].map((s) => (
                <div key={s.label} style={{ ...card, textAlign: 'center', padding: 16 }}>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Per-question results */}
            {allQuizItems.filter((it) => it.qs.some((q) => getResponseCount(q.id) > 0)).map((it) => (
              <div key={it.id} style={{ ...card, marginBottom: 10 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, color: C.text }}>{it.module.icon} {it.title}</h4>
                {it.qs.map((q) => {
                  const count = getResponseCount(q.id);
                  if (!count) return null;
                  const dist = getResponseDist(q.id);
                  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
                  return (
                    <div key={q.id} style={{ marginBottom: 12, padding: 10, background: C.bg, borderRadius: 8 }}>
                      <p style={{ margin: '0 0 6px', fontSize: 13, color: C.text }}>{q.text}</p>
                      {(q.opts || []).map((o, i) => {
                        const pct = ~~((dist[i] || 0) / total * 100);
                        const isCorrect = q.ok >= 0 && i === q.ok;
                        return (
                          <div key={i} style={{ marginBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span style={{ width: 20, color: C.dim }}>{String.fromCharCode(65 + i)}</span>
                              <div style={{ flex: 1, height: 20, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: isCorrect ? C.success : C.primary, borderRadius: 4, transition: 'width .3s' }} />
                              </div>
                              <span style={{ width: 35, textAlign: 'right', fontWeight: 600, color: C.text }}>{pct}%</span>
                              {isCorrect && <span style={{ color: C.success, fontSize: 14 }}>{'\u2713'}</span>}
                            </div>
                            <span style={{ fontSize: 11, color: C.muted, marginLeft: 26 }}>{o}</span>
                          </div>
                        );
                      })}
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: C.dim }}>{count} responses</p>
                    </div>
                  );
                })}
              </div>
            ))}

            {Object.keys(responses).length === 0 && (
              <div style={{ ...card, textAlign: 'center', padding: 32, color: C.dim }}>
                No quiz responses yet. Push questions from the Live tab.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Participant ───────────────────────────────────── */
function ParticipantView() {
  const {
    course, me, xp, myProgress, myAnswers, setMyAnswers, markComplete,
    setView, activeQ, activeQData, timer, timerRunning, submitAnswer,
    responses, myId,
  } = useApp();

  const [modId, setModId] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);

  const mod = modId ? course.modules.find((m) => m.id === modId) : null;
  const item = mod && itemId ? mod.items.find((i) => i.id === itemId) : null;
  const modProg = (m) => ({ total: m.items.length, done: m.items.filter((i) => myProgress[i.id]).length });
  const totalProg = () => { const all = course.modules.flatMap((m) => m.items); return { total: all.length, done: all.filter((i) => myProgress[i.id]).length }; };

  const liveQ = activeQData;
  const myLiveAnswer = liveQ ? responses[`${myId}-${liveQ.id}`] : undefined;

  /* ── Item view ── */
  if (mod && item) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Header
          left={<button onClick={() => { setItemId(null); setSlideIdx(0); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>{'\u2190'} {mod.title}</button>}
          right={<span style={{ color: C.accent, fontWeight: 700 }}>{'\u26A1'} {xp}</span>}
        />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: 14 }}>
          {/* Document */}
          {item.type === 'doc' && (
            <div style={card}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, color: C.text }}>{item.title}</h2>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: C.muted }}>{item.desc}</p>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ ...btn(C.primary), display: 'inline-block', textDecoration: 'none', marginBottom: 10 }}>
                  Open Document
                </a>
              ) : (
                <p style={{ fontSize: 13, color: C.warning, fontStyle: 'italic' }}>Document will be provided at the venue.</p>
              )}
              <button onClick={() => { markComplete(item.id); setItemId(null); }} style={{ ...btn(C.success), width: '100%', marginTop: 10 }}>
                {'\u2713'} Mark as Read
              </button>
            </div>
          )}

          {/* Slides */}
          {item.type === 'slides' && item.slides && (
            <div>
              <Slide s={item.slides[slideIdx]} big />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button onClick={() => setSlideIdx(Math.max(0, slideIdx - 1))} disabled={slideIdx === 0}
                  style={{ ...btn(C.primary), opacity: slideIdx === 0 ? 0.3 : 1 }}>{'\u2190'} Prev</button>
                <span style={{ fontSize: 13, color: C.muted }}>{slideIdx + 1} / {item.slides.length}</span>
                {slideIdx < item.slides.length - 1
                  ? <button onClick={() => setSlideIdx(slideIdx + 1)} style={btn(C.primary)}>Next {'\u2192'}</button>
                  : <button onClick={() => { markComplete(item.id); setItemId(null); setSlideIdx(0); }} style={btn(C.success)}>{'\u2713'} Done</button>
                }
              </div>
            </div>
          )}

          {/* Survey */}
          {item.type === 'survey' && item.qs && (
            <div style={card}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, color: C.text }}>{item.title}</h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>{item.desc}</p>
              {item.qs.map((q) => <SurveyQuestion key={q.id} q={q} answers={myAnswers} setAnswers={setMyAnswers} />)}
              <button onClick={() => { markComplete(item.id); setItemId(null); }} style={{ ...btn(C.success), width: '100%' }}>
                {'\u2713'} Submit
              </button>
            </div>
          )}

          {/* Quiz (self-paced, for surveys with ok field) */}
          {item.type === 'quiz' && item.qs && (
            <div style={card}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, color: C.text }}>{item.title}</h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>{item.desc}</p>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: C.dim }}>
                These questions will be pushed live by the facilitator during the session.
              </p>
              {item.qs.map((q, qi) => (
                <div key={q.id} style={{ padding: 10, marginBottom: 6, background: C.bg, borderRadius: 8, fontSize: 13, color: C.text }}>
                  {qi + 1}. {q.text}
                  <span style={{ fontSize: 11, color: C.dim, marginLeft: 8 }}>{q.type}</span>
                </div>
              ))}
              <button onClick={() => { markComplete(item.id); setItemId(null); }} style={{ ...btn(C.success), width: '100%', marginTop: 8 }}>
                {'\u2713'} Mark as Reviewed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Module view ── */
  if (mod) {
    const mp = modProg(mod);
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Header
          left={<button onClick={() => setModId(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>{'\u2190'} Course</button>}
          right={<span style={{ color: C.accent, fontWeight: 700 }}>{'\u26A1'} {xp}</span>}
        />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: 14 }}>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 26 }}>{mod.icon}</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 2px', fontSize: 18, color: C.text }}>{mod.title}</h2>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{mod.desc}</p>
              </div>
            </div>
            <ProgressBar done={mp.done} total={mp.total} />
          </div>

          {mod.items.map((it) => {
            const done = myProgress[it.id];
            return (
              <div key={it.id} onClick={() => { setItemId(it.id); setSlideIdx(0); }}
                style={{ ...card, marginBottom: 6, padding: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: done ? 0.7 : 1, borderLeft: `4px solid ${done ? C.success : C.primary}` }}>
                <span style={{ fontSize: 20 }}>{itemIcon[it.type] || '\u{1F4C4}'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 1px', fontWeight: 600, fontSize: 14, color: C.text }}>{it.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{it.desc || ''}</p>
                </div>
                {done ? <span style={{ color: C.success, fontSize: 16 }}>{'\u2713'}</span> : <span style={{ color: C.dim }}>{'\u203A'}</span>}
              </div>
            );
          })}

          {/* Live question overlay */}
          {liveQ && <LiveQuestionCard question={liveQ} myAnswer={myLiveAnswer} />}
        </div>
      </div>
    );
  }

  /* ── Course overview ── */
  const tp = totalProg();
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {me?.name || ''} <span style={{ color: '#7dd3fc', fontSize: 12 }}>{me?.team || ''}</span>
          </span>
        }
        right={
          <>
            <span style={{ color: C.accent, fontWeight: 700 }}>{'\u26A1'} {xp}</span>
            <button onClick={() => setView('home')} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
              Leave
            </button>
          </>
        }
      />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 14 }}>
        {/* Course hero */}
        <div style={{ ...card, marginBottom: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`, color: '#fff', border: 'none' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{course.title}</h1>
          <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.8 }}>{course.desc}</p>
          <ProgressBar done={tp.done} total={tp.total} color={C.accent} />
          <p style={{ margin: '6px 0 0', fontSize: 11, opacity: 0.7 }}>{tp.done}/{tp.total} items completed</p>
        </div>

        {/* Modules grouped by phase */}
        {['before', 'live', 'after'].map((ph) => {
          const mods = course.modules.filter((m) => m.phase === ph);
          if (!mods.length) return null;
          return (
            <div key={ph} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: phaseColor[ph] }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: phaseColor[ph], textTransform: 'uppercase', letterSpacing: 1 }}>
                  {phaseLabel[ph]}
                </span>
              </div>
              {mods.map((m) => {
                const p = modProg(m);
                return (
                  <div key={m.id} onClick={() => setModId(m.id)}
                    style={{ ...card, marginBottom: 6, padding: 14, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      borderLeft: `4px solid ${p.done === p.total && p.total > 0 ? C.success : phaseColor[ph]}` }}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: C.text }}>{m.title}</p>
                      <ProgressBar done={p.done} total={p.total} color={phaseColor[ph]} />
                    </div>
                    {p.done === p.total && p.total > 0
                      ? <span style={{ color: C.success, fontSize: 18 }}>{'\u2713'}</span>
                      : <span style={{ fontSize: 13, color: C.dim }}>{p.done}/{p.total}</span>
                    }
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Live question overlay */}
        {liveQ && <LiveQuestionCard question={liveQ} myAnswer={myLiveAnswer} />}
      </div>
    </div>
  );
}

/* ── Live Question Card (shown to participant) ─────── */
function LiveQuestionCard({ question: q, myAnswer }) {
  const { submitAnswer, activeQ, timer, timerRunning } = useApp();

  return (
    <div style={{ ...card, marginTop: 14, border: `2px solid ${C.warning}`, background: '#FFFBF0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.error }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>LIVE QUESTION</span>
        {timerRunning && (
          <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 20, color: timer < 10 ? C.error : C.text }}>{timer}s</span>
        )}
      </div>

      {myAnswer === undefined ? (
        <>
          <p style={{ fontSize: 15, color: C.text, lineHeight: 1.5, margin: '0 0 12px', fontWeight: 500 }}>{q.text}</p>
          <div style={{ display: 'grid', gridTemplateColumns: q.opts.length <= 3 ? '1fr' : '1fr 1fr', gap: 8 }}>
            {q.opts.map((o, i) => {
              const s = ANS[i] || ANS[0];
              return (
                <button key={i} onClick={() => submitAnswer(q.id, i, q)}
                  style={{ padding: q.type === 'mc' ? '18px' : '12px', borderRadius: 10, border: 'none',
                    background: q.type === 'mc' ? s.bg : C.primary, color: '#fff',
                    fontSize: q.type === 'mc' ? 16 : 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 3px 10px rgba(0,0,0,.2)', transition: 'transform .1s',
                  }}>
                  {q.type === 'mc' && <span style={{ fontSize: 20 }}>{s.shape}</span>}
                  {q.type === 'mc' ? s.label : o}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 14 }}>
          <span style={{ fontSize: 32 }}>{'\u2713'}</span>
          <p style={{ color: C.text, fontWeight: 600 }}>Answer recorded!</p>
          {activeQ?.revealed && q.ok >= 0 && (
            <div style={{ padding: 10, borderRadius: 8, marginTop: 8,
              background: myAnswer === q.ok ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${myAnswer === q.ok ? C.success : C.error}` }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14,
                color: myAnswer === q.ok ? C.success : C.error }}>
                {myAnswer === q.ok ? 'Correct!' : `Correct answer: ${q.opts[q.ok]}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Projector ─────────────────────────────────────── */
function ProjectorView() {
  const {
    session, participants, setView, activeQ, activeQData,
    timer, timerRunning, getResponseCount, getResponseDist,
  } = useApp();

  const q = activeQData;

  /* Waiting screen with QR */
  if (!q) {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${C.dark}, ${C.primary})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <button onClick={() => setView('admin')}
          style={{ position: 'fixed', top: 10, right: 10, background: 'rgba(255,255,255,.15)',
            border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
          Back to Admin
        </button>
        <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7 }}>European Data Protection Supervisor</p>
        <h1 style={{ fontSize: 56, fontWeight: 800, margin: '4px 0' }}>PEDRRA</h1>
        <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 32 }}>Scan to join the session</p>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 12px 48px rgba(0,0,0,.3)' }}>
          <QRCodeSVG value={joinUrl(session?.code || '')} size={240} fgColor={C.primary} />
        </div>
        <div style={{ marginTop: 24, fontSize: 56, fontWeight: 800, letterSpacing: 12, fontFamily: 'monospace',
          background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: '10px 30px' }}>
          {session?.code || ''}
        </div>
        <p style={{ position: 'fixed', bottom: 24, fontSize: 16, opacity: 0.7 }}>
          {participants.length} participant{participants.length !== 1 ? 's' : ''} connected
        </p>
      </div>
    );
  }

  /* Active question display */
  const dist = getResponseDist(q.id);
  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={{ minHeight: '100vh', background: C.white, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '24px 40px' }}>
      <button onClick={() => setView('admin')}
        style={{ position: 'fixed', top: 10, right: 10, background: C.bg, border: 'none',
          borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: C.text }}>
        Back
      </button>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Timer bar */}
        {timerRunning && (
          <div style={{ height: 6, background: C.border, borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: timer < 10 ? C.error : C.primary,
              width: `${timer / (q.type === 'mc' ? 45 : 30) * 100}%`, transition: 'width 1s linear' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: C.muted }}>{q.id}</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: C.muted }}>{getResponseCount(q.id)} / {participants.length} responses</span>
            {timerRunning && <span style={{ fontSize: 32, fontWeight: 800, color: timer < 10 ? C.error : C.text }}>{timer}</span>}
          </div>
        </div>

        {/* Question */}
        <h2 style={{ fontSize: 30, lineHeight: 1.4, margin: '0 0 28px', color: C.text }}>{q.text}</h2>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: q.opts.length <= 3 ? `repeat(${q.opts.length}, 1fr)` : '1fr 1fr', gap: 12 }}>
          {q.opts.map((o, i) => {
            const s = ANS[i] || ANS[0];
            const pct = ~~((dist[i] || 0) / total * 100);
            const isCorrect = activeQ.revealed && q.ok >= 0 && i === q.ok;
            return (
              <div key={i} style={{
                padding: '20px 18px', borderRadius: 14, background: s.bg, color: '#fff',
                opacity: activeQ.revealed && q.ok >= 0 && !isCorrect ? 0.35 : 1,
                boxShadow: '0 4px 14px rgba(0,0,0,.2)', transition: 'opacity .3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{s.shape}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{o}</span>
                </div>
                {activeQ.revealed && (
                  <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{pct}%</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mini QR in corner */}
        <div style={{ position: 'fixed', bottom: 16, right: 16, opacity: 0.3 }}>
          <QRCodeSVG value={joinUrl(session?.code || '')} size={56} fgColor={C.dim} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN APP - State Management & Routing
   ================================================================ */

export default function App() {
  /* ── State ── */
  const [course, setCourse] = useState(DEFAULT_COURSE);
  const [view, setView] = useState('home');
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState({});
  const [activeQ, setActiveQ] = useState(null); // { itemId, qIndex, revealed }
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [myId, setMyId] = useState(null);
  const [me, setMe] = useState(null);
  const [myProgress, setMyProgress] = useState({});
  const [myAnswers, setMyAnswers] = useState({});
  const [xp, setXp] = useState(0);

  const timerRef = useRef(null);

  /* ── Derived ── */
  const allItems = course.modules.flatMap((m) => m.items);
  const activeQData = activeQ
    ? allItems.find((i) => i.id === activeQ.itemId)?.qs?.[activeQ.qIndex] || null
    : null;

  /* ── Load saved state ── */
  useEffect(() => {
    const saved = load('pedrra-course');
    if (saved) setCourse(saved);

    // Check URL for join code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      setView('join');
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Save course ── */
  useEffect(() => { save('pedrra-course', course); }, [course]);

  /* ── Timer ── */
  useEffect(() => {
    if (timerRunning && timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer, timerRunning]);

  /* ── BroadcastChannel listener ── */
  useEffect(() => {
    let ch;
    try {
      ch = new BroadcastChannel(CH_NAME);
      ch.onmessage = (e) => {
        const { type, payload } = e.data;
        switch (type) {
          case 'PUSH_Q':
            setActiveQ(payload);
            setTimer(payload.timer || 30);
            setTimerRunning(true);
            break;
          case 'REVEAL':
            setActiveQ((prev) => prev ? { ...prev, revealed: true } : null);
            setTimerRunning(false);
            break;
          case 'JOIN':
            setParticipants((prev) => {
              if (prev.find((p) => p.id === payload.id)) return prev;
              return [...prev, payload];
            });
            break;
          case 'ANSWER': {
            setResponses((prev) => ({ ...prev, [payload.key]: payload.value }));
            // Update participant stats
            if (payload.participantXp !== undefined) {
              setParticipants((prev) => prev.map((p) =>
                p.id === payload.participantId
                  ? { ...p, xp: p.xp + payload.participantXp, answers: p.answers + 1 }
                  : p
              ));
            }
            break;
          }
          case 'SESSION':
            setSession(payload);
            break;
        }
      };
    } catch { /* BroadcastChannel not supported */ }
    return () => { try { ch?.close(); } catch { /* noop */ } };
  }, []);

  /* ── Actions ── */
  const launchSession = () => {
    const code = genCode();
    const s = { code, startedAt: Date.now() };
    setSession(s);
    broadcast('SESSION', s);
  };

  const joinSession = (name, team) => {
    const id = Date.now();
    const participant = { id, name, team, xp: 0, answers: 0 };
    setMyId(id);
    setMe(participant);
    setParticipants((prev) => [...prev, participant]);
    setView('participant');
    broadcast('JOIN', participant);
  };

  const pushQuestion = (itemId, qIndex) => {
    const item = allItems.find((i) => i.id === itemId);
    const q = item?.qs?.[qIndex];
    const dur = q?.type === 'mc' ? 45 : 30;
    const payload = { itemId, qIndex, revealed: false, timer: dur };
    setActiveQ(payload);
    setTimer(dur);
    setTimerRunning(true);
    broadcast('PUSH_Q', payload);
  };

  const revealAnswer = () => {
    setActiveQ((prev) => prev ? { ...prev, revealed: true } : null);
    setTimerRunning(false);
    broadcast('REVEAL', null);
  };

  const submitAnswer = (questionId, answer, question) => {
    const key = `${myId}-${questionId}`;
    if (responses[key] !== undefined) return;

    setResponses((prev) => ({ ...prev, [key]: answer }));
    setMyAnswers((prev) => ({ ...prev, [questionId]: answer }));

    let earnedXp = 0;
    if (question?.ok >= 0) {
      const correct = answer === question.ok;
      earnedXp = question.type === 'mc'
        ? (correct ? (question.xp || 100) + (timer > 30 ? 50 : 0) : 0)
        : (question.xp || 0);
    } else {
      earnedXp = question?.xp || 0;
    }

    setXp((prev) => prev + earnedXp);
    broadcast('ANSWER', { key, value: answer, participantId: myId, participantXp: earnedXp });
  };

  const markComplete = (itemId) => {
    setMyProgress((prev) => ({ ...prev, [itemId]: true }));
  };

  const getResponseCount = (questionId) =>
    Object.keys(responses).filter((k) => k.endsWith(`-${questionId}`)).length;

  const getResponseDist = (questionId) => {
    const dist = {};
    Object.keys(responses).forEach((k) => {
      if (k.endsWith(`-${questionId}`)) {
        const a = responses[k];
        dist[a] = (dist[a] || 0) + 1;
      }
    });
    return dist;
  };

  const setMyAnswersFn = (fn) => setMyAnswers(fn);

  /* ── Context value ── */
  const ctx = {
    course, setCourse, view, setView, session, launchSession,
    participants, responses, activeQ, activeQData, pushQuestion, revealAnswer,
    timer, timerRunning, joinCode, setJoinCode, joinSession,
    myId, me, xp, myProgress, myAnswers, setMyAnswers: setMyAnswersFn,
    markComplete, submitAnswer, getResponseCount, getResponseDist,
  };

  /* ── Render ── */
  return (
    <Ctx.Provider value={ctx}>
      {view === 'home' && <HomeView />}
      {view === 'join' && <JoinView />}
      {view === 'admin' && <AdminView />}
      {view === 'participant' && <ParticipantView />}
      {view === 'projector' && <ProjectorView />}
    </Ctx.Provider>
  );
}
