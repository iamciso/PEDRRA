import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from './context.js';
import { C, ANS } from './theme';

export default function Projector({ onExit }) {
  const { course, session, participants, activeQ, timer, getResponseCount, getResponseDist } = useApp();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const joinUrl = session
    ? `${window.location.origin}${window.location.pathname}?code=${session.code}`
    : '';

  // Find active question details
  const allItems = course.modules.flatMap((m) => m.items.filter((i) => i.type === 'quiz'));
  const activeItem = activeQ ? allItems.find((i) => i.id === activeQ.itemId) : null;
  const activeQuestion = activeItem?.qs?.[activeQ?.qIndex];
  const dist = activeQuestion ? getResponseDist(activeQ.itemId, activeQ.qIndex) : [];
  const responseCount = activeQuestion ? getResponseCount(activeQ.itemId, activeQ.qIndex) : 0;
  const totalPct = dist.reduce((s, d) => s + d, 0) || 1;

  const timerPct = timer > 0 ? (timer / 30) * 100 : 0;
  const timerColor = timer > 10 ? C.success : timer > 5 ? C.warning : C.error;

  return (
    <div style={{
      minHeight: '100vh', background: C.dark, fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.1)',
          border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.7)',
          borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', zIndex: 10,
        }}
      >× Exit Projector</button>

      {/* EDPS branding bar */}
      <div style={{
        background: C.primary, padding: '8px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
          EUROPEAN DATA PROTECTION SUPERVISOR · PEDRRA
        </span>
        <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>
          {course.title}
        </span>
      </div>

      {/* No session */}
      {!session && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>📡</div>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>No Active Session</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 16, margin: 0 }}>
            Launch a session from the Admin Panel to begin.
          </p>
        </div>
      )}

      {/* Waiting screen */}
      {session && !activeQ && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 40, gap: 32,
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#fff', fontSize: 48, fontWeight: 800, margin: '0 0 8px', letterSpacing: 2 }}>
              {session.code}
            </h1>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 18, margin: 0 }}>
              Enter this code at the join page
            </p>
          </div>

          <div style={{
            background: '#fff', borderRadius: 20, padding: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,.4)',
          }}>
            <QRCodeSVG value={joinUrl} size={240} bgColor="#fff" fgColor={C.dark} level="M" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
              {participants.length}
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 18, marginTop: 4 }}>
              participant{participants.length !== 1 ? 's' : ''} joined
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,.08)', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, color: 'rgba(255,255,255,.5)',
          }}>
            Scan the QR code or visit{' '}
            <span style={{ color: C.accent, fontFamily: 'monospace' }}>
              {window.location.host}
            </span>
          </div>
        </div>
      )}

      {/* Active question */}
      {session && activeQ && activeQuestion && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '32px 60px 40px',
        }}>
          {/* Timer bar */}
          {timer > 0 && !activeQ.revealed && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600 }}>TIME</span>
                <span style={{ color: timerColor, fontSize: 16, fontWeight: 800 }}>{timer}s</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: timerColor,
                  width: `${timerPct}%`, transition: 'width 1s linear, background .5s',
                }} />
              </div>
            </div>
          )}

          {/* Question */}
          <div style={{
            background: 'rgba(255,255,255,.06)', borderRadius: 16,
            padding: '28px 36px', marginBottom: 28, textAlign: 'center',
            border: '1px solid rgba(255,255,255,.12)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              {activeItem?.title} · {activeQuestion.xp} XP
            </div>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>
              {activeQuestion.text}
            </p>
          </div>

          {/* Answer options grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {(activeQuestion.opts || []).map((opt, i) => {
              const pct = activeQ.revealed
                ? Math.round((dist[i] || 0) / totalPct * 100)
                : null;
              const isCorrect = i === activeQuestion.ok;

              return (
                <div
                  key={i}
                  style={{
                    background: activeQ.revealed && isCorrect
                      ? C.success
                      : activeQ.revealed
                        ? 'rgba(255,255,255,.08)'
                        : ANS[i % 4]?.bg || C.primary,
                    borderRadius: 14, padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    border: activeQ.revealed && isCorrect ? `2px solid ${C.accent}` : '2px solid transparent',
                    opacity: activeQ.revealed && !isCorrect ? 0.65 : 1,
                    transition: 'all .4s',
                  }}
                >
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{ANS[i % 4]?.shape}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: pct !== null ? 6 : 0 }}>
                      {opt}
                    </div>
                    {pct !== null && (
                      <>
                        <div style={{ height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${pct}%`, transition: 'width .6s ease' }} />
                        </div>
                        <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, fontWeight: 700 }}>
                          {pct}% ({dist[i] || 0})
                        </div>
                      </>
                    )}
                  </div>
                  {activeQ.revealed && isCorrect && (
                    <span style={{ fontSize: 28, flexShrink: 0 }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Response counter */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.6)', fontSize: 16 }}>
            {activeQ.revealed
              ? <span style={{ color: C.accent, fontWeight: 700 }}>Results revealed · {responseCount} response{responseCount !== 1 ? 's' : ''}</span>
              : <span>{responseCount} response{responseCount !== 1 ? 's' : ''} received</span>
            }
          </div>
        </div>
      )}

      {/* Footer */}
      {session && (
        <div style={{
          padding: '8px 24px', background: 'rgba(0,0,0,.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
            Session: <span style={{ fontFamily: 'monospace', color: C.accent, fontWeight: 700 }}>{session.code}</span>
          </span>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
