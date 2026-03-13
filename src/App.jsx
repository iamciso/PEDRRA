import { useState, useEffect, useRef, useCallback } from 'react';
import { AppContext } from './context.js';
import { C, card, btn, btnOutline, header } from './theme';
import { DEFAULT_COURSE } from './courseData.js';
import { Header } from './components.jsx';
import Admin from './Admin.jsx';
import Participant from './Participant.jsx';
import Projector from './Projector.jsx';

/* ================================================================
   UTILITIES
   ================================================================ */
const genCode = () =>
  Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[~~(Math.random() * 31)]).join('');

const load = (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ } };

const CH_NAME = 'pedrra-sync';
const broadcastMsg = (type, payload) => {
  try { const ch = new BroadcastChannel(CH_NAME); ch.postMessage({ type, payload }); ch.close(); } catch { /* noop */ }
};

/* ================================================================
   HOME VIEW
   ================================================================ */
function HomeView({ onEnterAdmin, onJoin, onLaunchSession }) {
  return (
    <div style={{ minHeight: '100vh', background: C.white, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={<span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>EUROPEAN DATA PROTECTION SUPERVISOR</span>}
      />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: C.light,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 32,
        }}>🛡️</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: C.primary, margin: '0 0 6px', letterSpacing: -1 }}>PEDRRA</h1>
        <p style={{ fontSize: 15, color: C.text, margin: '0 0 4px' }}>PErsonal Data bReach Risk Assessment</p>
        <p style={{ fontSize: 12, color: C.dim, margin: '0 0 40px' }}>Learning Management System</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
          <button onClick={onEnterAdmin} style={{ ...btn(C.primary), padding: '14px 18px', fontSize: 15 }}>
            🔧 Admin Panel
          </button>
          <button onClick={onLaunchSession} style={{ ...btn(C.success), padding: '14px 18px', fontSize: 15 }}>
            🎓 Launch Live Session
          </button>
          <button onClick={onJoin} style={{ ...btnOutline(), padding: '14px 18px', fontSize: 15 }}>
            📱 Join as Participant
          </button>
        </div>

        <div style={{ marginTop: 40, padding: '14px 18px', background: C.light, borderRadius: 10, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
            <strong>🔒 Privacy by Design:</strong> All data stays in your browser.
            No accounts, no server tracking. EUDPR compliant.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   JOIN VIEW
   ================================================================ */
function JoinView({ initialCode, onBack, onJoined }) {
  const [code, setCode] = useState(initialCode || '');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!code.trim() || code.length !== 6) { setError('Please enter a valid 6-character session code'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!team) { setError('Please select a team'); return; }
    setError('');
    // Generate participant id and broadcast join
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const participant = { id, name: name.trim(), team, xp: 0, answers: 0, joinedAt: Date.now() };
    broadcastMsg('JOIN', { code: code.toUpperCase(), participant });
    onJoined(participant);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header left={<span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>PEDRRA · Join Session</span>} />
      <div style={{ maxWidth: 380, margin: '0 auto', padding: '32px 20px' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
          ← Back
        </button>
        <div style={card}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: C.text }}>Join Session</h2>

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 4, fontWeight: 600 }}>Session Code</label>
          <input
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid #d1d5db`,
              fontSize: 22, fontFamily: 'monospace', letterSpacing: 6, textAlign: 'center',
              textTransform: 'uppercase', marginBottom: 14, boxSizing: 'border-box',
            }}
            placeholder="ABC123" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          />

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 4, fontWeight: 600 }}>Your Name</label>
          <input
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid #d1d5db`, fontSize: 14, marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit' }}
            placeholder="First name" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />

          <label style={{ fontSize: 12, color: C.dim, display: 'block', marginBottom: 4, fontWeight: 600 }}>Team</label>
          <select
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid #d1d5db`, fontSize: 14, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}
            value={team} onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">Select team...</option>
            {[1, 2, 3, 4, 5].map((i) => <option key={i} value={`Team ${i}`}>Team {i}</option>)}
          </select>

          {error && <p style={{ color: C.error, fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <button onClick={handleJoin} style={{ ...btn(C.primary), width: '100%', padding: '13px', fontSize: 15 }}>
            Join Session
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   APP ROOT
   ================================================================ */
export default function App() {
  /* ─── State ─── */
  const [course, setCourseState] = useState(() => load('pedrra-course') || DEFAULT_COURSE);
  const [session, setSession] = useState(() => load('pedrra-session'));
  const [participants, setParticipants] = useState(() => load('pedrra-participants') || []);
  const [responses, setResponses] = useState(() => load('pedrra-responses') || {});
  const [activeQ, setActiveQ] = useState(() => load('pedrra-activeq'));
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  // Routing
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') ? 'join' : 'home';
  });
  const [currentParticipant, setCurrentParticipant] = useState(null);

  // URL code
  const urlCode = new URLSearchParams(window.location.search).get('code') || '';

  /* ─── Persistence ─── */
  const setCourse = useCallback((c) => { setCourseState(c); save('pedrra-course', c); }, []);

  useEffect(() => { save('pedrra-session', session); }, [session]);
  useEffect(() => { save('pedrra-participants', participants); }, [participants]);
  useEffect(() => { save('pedrra-responses', responses); }, [responses]);
  useEffect(() => { save('pedrra-activeq', activeQ); }, [activeQ]);

  /* ─── BroadcastChannel listener ─── */
  useEffect(() => {
    let ch;
    try {
      ch = new BroadcastChannel(CH_NAME);
      ch.onmessage = (e) => {
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
            // Update participant XP
            if (payload.xp) {
              setParticipants((prev) => prev.map((p) =>
                p.id === payload.participantId
                  ? { ...p, xp: (p.xp || 0) + payload.xp, answers: (p.answers || 0) + 1 }
                  : p
              ));
            }
            break;
          case 'PUSH_Q':
            setActiveQ(payload);
            startTimer();
            break;
          case 'REVEAL':
            setActiveQ((prev) => prev ? { ...prev, revealed: true } : prev);
            stopTimer();
            break;
          case 'SESSION':
            setSession(payload);
            break;
          default:
            break;
        }
      };
    } catch { /* noop */ }
    return () => { try { ch?.close(); } catch { /* noop */ } };
  }, [session]);

  /* ─── Timer ─── */
  const startTimer = () => {
    stopTimer();
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  /* ─── Session actions ─── */
  const launchSession = useCallback(() => {
    const s = { code: genCode(), startedAt: Date.now() };
    setSession(s);
    broadcastMsg('SESSION', s);
  }, []);

  const pushQuestion = useCallback((itemId, qIndex) => {
    const q = { itemId, qIndex, pushedAt: Date.now(), revealed: false };
    setActiveQ(q);
    broadcastMsg('PUSH_Q', q);
    startTimer();
  }, []);

  const revealAnswer = useCallback(() => {
    setActiveQ((prev) => prev ? { ...prev, revealed: true } : prev);
    broadcastMsg('REVEAL', {});
    stopTimer();
  }, []);

  /* ─── Participant actions ─── */
  const recordAnswer = useCallback((participantId, itemId, qIndex, answerIdx, xp) => {
    // Update responses
    setResponses((prev) => {
      const key = `${itemId}-${qIndex}`;
      const existing = prev[key] || { counts: [], answers: [] };
      const counts = [...(existing.counts || [])];
      counts[answerIdx] = (counts[answerIdx] || 0) + 1;
      return { ...prev, [key]: { counts, answers: [...(existing.answers || []), { participantId, answerIdx }] } };
    });
    // Update XP
    const q = course.modules.flatMap((m) => m.items.filter((i) => i.id === itemId)).flatMap((i) => i.qs || [])[qIndex];
    const isCorrect = q && (q.ok < 0 || answerIdx === q.ok);
    if (isCorrect && xp > 0) {
      setParticipants((prev) => prev.map((p) =>
        p.id === participantId
          ? { ...p, xp: (p.xp || 0) + xp, answers: (p.answers || 0) + 1 }
          : p
      ));
    } else {
      setParticipants((prev) => prev.map((p) =>
        p.id === participantId ? { ...p, answers: (p.answers || 0) + 1 } : p
      ));
    }
    broadcastMsg('ANSWER', { participantId, itemId, qIndex, answerIdx, xp: isCorrect ? xp : 0 });
  }, [course]);

  const recordSurvey = useCallback((participantId, itemId, answers) => {
    setResponses((prev) => ({
      ...prev,
      [`survey-${itemId}-${participantId}`]: { answers, submittedAt: Date.now() },
    }));
  }, []);

  const markComplete = useCallback((participantId, moduleId, itemId) => {
    // Persist progress (participant handles its own localStorage)
  }, []);

  /* ─── Response helpers ─── */
  const getResponseCount = useCallback((itemId, qIndex) => {
    const key = `${itemId}-${qIndex}`;
    const r = responses[key];
    if (!r) return 0;
    return (r.counts || []).reduce((s, c) => s + (c || 0), 0);
  }, [responses]);

  const getResponseDist = useCallback((itemId, qIndex) => {
    const key = `${itemId}-${qIndex}`;
    return (responses[key]?.counts) || [];
  }, [responses]);

  /* ─── Context value ─── */
  const ctx = {
    course, setCourse,
    session, launchSession,
    participants, setParticipants,
    responses,
    activeQ, pushQuestion, revealAnswer,
    timer,
    getResponseCount, getResponseDist,
    recordAnswer, recordSurvey, markComplete,
    broadcast: broadcastMsg,
    setView,
  };

  /* ─── View handling ─── */
  const handleJoined = (participant) => {
    // Add participant locally too
    setParticipants((prev) => {
      if (prev.find((p) => p.id === participant.id)) return prev;
      return [...prev, participant];
    });
    setCurrentParticipant(participant);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    setView('participant');
  };

  const handleLaunchSession = () => {
    launchSession();
    setView('admin');
  };

  /* ─── Render ─── */
  return (
    <AppContext.Provider value={ctx}>
      {view === 'home' && (
        <HomeView
          onEnterAdmin={() => setView('admin')}
          onJoin={() => setView('join')}
          onLaunchSession={handleLaunchSession}
        />
      )}
      {view === 'join' && (
        <JoinView
          initialCode={urlCode}
          onBack={() => setView('home')}
          onJoined={handleJoined}
        />
      )}
      {view === 'admin' && (
        <Admin onExit={() => setView('home')} />
      )}
      {view === 'participant' && currentParticipant && (
        <Participant
          participantId={currentParticipant.id}
          onExit={() => setView('home')}
        />
      )}
      {view === 'projector' && (
        <Projector onExit={() => setView('admin')} />
      )}
    </AppContext.Provider>
  );
}
