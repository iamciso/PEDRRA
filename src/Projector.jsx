import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from './context.js';
import { C, ANS } from './theme';
import { Slide, Leaderboard } from './components.jsx';

export default function Projector({ onExit }) {
  const {
    course, session, participants, activeQ, timer,
    getResponseCount, getResponseDist,
    presentationActive, presentationSlides, presentationSlideIdx,
  } = useApp();

  const [tick, setTick] = useState(0);
  const [leaderboardMode, setLeaderboardMode] = useState('individual'); // 'individual' | 'team'

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const joinUrl = session
    ? `${window.location.origin}${window.location.pathname}?code=${session.code}`
    : '';

  // Determine projector state
  // States: idle | waiting | presenting | poll_active | poll_revealed
  let projectorState = 'idle';
  if (session) {
    if (presentationActive && !activeQ) {
      projectorState = 'presenting';
    } else if (activeQ && !activeQ.revealed) {
      projectorState = 'poll_active';
    } else if (activeQ && activeQ.revealed) {
      projectorState = 'poll_revealed';
    } else {
      projectorState = 'waiting';
    }
  }

  // Active question details (works for both quiz and presentation polls)
  const isFromPresentation = activeQ?.fromPresentation;
  let activeQuestion = null;
  let activeItemTitle = '';
  let dist = [];
  let responseCount = 0;

  if (activeQ) {
    if (isFromPresentation) {
      // Poll data comes from the PUSH_Q payload
      activeQuestion = { text: activeQ.text, opts: activeQ.opts, ok: activeQ.ok, xp: activeQ.xp, explanation: activeQ.explanation };
      activeItemTitle = 'Presentation Poll';
      const qKey = `${activeQ.itemId}-slide-${activeQ.slideIdx}`;
      dist = getResponseDist(activeQ.itemId, `slide-${activeQ.slideIdx}`);
      responseCount = getResponseCount(activeQ.itemId, `slide-${activeQ.slideIdx}`);
    } else {
      const allItems = course.modules.flatMap((m) => m.items.filter((i) => i.type === 'quiz'));
      const activeItem = allItems.find((i) => i.id === activeQ.itemId);
      activeQuestion = activeItem?.qs?.[activeQ?.qIndex];
      activeItemTitle = activeItem?.title || '';
      dist = activeQuestion ? getResponseDist(activeQ.itemId, activeQ.qIndex) : [];
      responseCount = activeQuestion ? getResponseCount(activeQ.itemId, activeQ.qIndex) : 0;
    }
  }

  const totalPct = dist.reduce((s, d) => s + d, 0) || 1;
  const timerMax = activeQ?.timer || 30;
  const timerPct = timer > 0 ? (timer / timerMax) * 100 : 0;
  const timerColor = timer > 10 ? C.success : timer > 5 ? C.warning : C.error;

  // Current presentation slide
  const currentPresentationSlide = presentationSlides?.[presentationSlideIdx] || null;

  // Explanation text: from activeQuestion or from activeQ payload
  const explanationText = activeQuestion?.explanation || activeQ?.explanation || '';

  // Build team leaderboard data
  const teamLeaderboardData = (() => {
    if (!participants.length) return [];
    const teamMap = {};
    participants.forEach((p) => {
      const teamName = p.team || 'No Team';
      if (!teamMap[teamName]) {
        teamMap[teamName] = { name: teamName, xp: 0, members: 0 };
      }
      teamMap[teamName].xp += (p.xp || 0);
      teamMap[teamName].members += 1;
    });
    return Object.values(teamMap).sort((a, b) => b.xp - a.xp);
  })();

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
      {projectorState === 'idle' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>📡</div>
          <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>No Active Session</h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 16, margin: 0 }}>
            Launch a session from the Admin Panel to begin.
          </p>
        </div>
      )}

      {/* Waiting screen (QR code + join) */}
      {projectorState === 'waiting' && (
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

      {/* Presenting slides (synced from trainer) */}
      {projectorState === 'presenting' && currentPresentationSlide && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
          position: 'relative',
        }}>
          <div style={{ width: '85vw', maxWidth: 960 }}>
            <Slide s={currentPresentationSlide} big />
          </div>
          {/* Small QR for latecomers during presentation */}
          {joinUrl && (
            <div style={{
              position: 'absolute', bottom: 16, right: 16,
              background: 'rgba(255,255,255,.85)', borderRadius: 8, padding: 6,
              opacity: 0.6, transition: 'opacity .3s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <QRCodeSVG value={joinUrl} size={64} bgColor="#fff" fgColor={C.dark} level="L" />
              <div style={{ fontSize: 8, textAlign: 'center', color: C.muted, marginTop: 1 }}>{session?.code}</div>
            </div>
          )}
        </div>
      )}

      {/* Active question (poll or quiz) */}
      {(projectorState === 'poll_active' || projectorState === 'poll_revealed') && activeQuestion && (
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
              {activeItemTitle}{activeQuestion.xp > 0 ? ` · ${activeQuestion.xp} XP` : ''}
            </div>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>
              {activeQuestion.text}
            </p>
          </div>

          {/* Answer options grid or rating display */}
          {activeQ.pollType === 'rating' ? (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                {[1,2,3,4,5].map((n) => {
                  const avg = activeQ.revealed && responseCount > 0
                    ? dist.reduce((s, d, i) => s + d * (i + 1), 0) / responseCount
                    : 0;
                  return (
                    <span key={n} style={{
                      fontSize: 56, color: '#FFD700',
                      opacity: activeQ.revealed ? (n <= Math.round(avg) ? 1 : 0.25) : 0.3,
                      transition: 'opacity .6s ease',
                    }}>★</span>
                  );
                })}
              </div>
              {activeQ.revealed && responseCount > 0 && (
                <div style={{ fontSize: 36, fontWeight: 800, color: '#FFD700' }}>
                  {(dist.reduce((s, d, i) => s + d * (i + 1), 0) / responseCount).toFixed(1)} / 5
                </div>
              )}
              {activeQ.revealed && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
                  {[1,2,3,4,5].map((n) => (
                    <div key={n} style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, marginBottom: 4 }}>{n}★</div>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{dist[n-1] || 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {(activeQuestion.opts || []).map((opt, i) => {
                const pct = activeQ.revealed
                  ? Math.round((dist[i] || 0) / totalPct * 100)
                  : null;
                const isCorrect = activeQuestion.ok >= 0 && i === activeQuestion.ok;

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
                      opacity: activeQ.revealed && !isCorrect && activeQuestion.ok >= 0 ? 0.65 : 1,
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
                          <div className="result-bar-animated" style={{ height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                            <div className="result-bar-animated" style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${pct}%` }} />
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
          )}

          {/* Explanation after reveal */}
          {activeQ.revealed && explanationText && (
            <div style={{
              background: 'rgba(255,255,255,.08)', borderRadius: 12,
              padding: '16px 24px', marginBottom: 16,
              border: '1px solid rgba(255,255,255,.15)',
              borderLeft: `4px solid ${C.accent}`,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: C.accent,
                letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
              }}>
                Explanation
              </div>
              <div style={{
                color: 'rgba(255,255,255,.85)', fontSize: 15, lineHeight: 1.6,
              }}>
                {explanationText}
              </div>
            </div>
          )}

          {/* Response counter + voting progress */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            {activeQ.revealed ? (
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>Results revealed · {responseCount} response{responseCount !== 1 ? 's' : ''}</span>
            ) : (
              <>
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 16, marginBottom: 8 }}>
                  {responseCount}{participants.length > 0 ? ` / ${participants.length}` : ''} voted
                </div>
                {participants.length > 0 && (
                  <div style={{ maxWidth: 400, margin: '0 auto', height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: C.accent, borderRadius: 4, width: `${Math.min(100, (responseCount / participants.length) * 100)}%`, transition: 'width .5s ease' }} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Prominent QR code during active poll for voting */}
          {!activeQ.revealed && joinUrl && (
            <div style={{
              position: 'absolute', bottom: 24, right: 24,
              background: 'rgba(255,255,255,.97)', borderRadius: 16, padding: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              animation: 'fadeIn .5s ease',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Scan to Vote
              </div>
              <QRCodeSVG value={joinUrl} size={140} bgColor="#fff" fgColor={C.dark} level="M" />
              <div style={{
                fontSize: 28, fontWeight: 800, color: C.primary,
                fontFamily: 'monospace', letterSpacing: 4,
              }}>{session?.code}</div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>
                {window.location.host}
              </div>
            </div>
          )}

          {/* Leaderboard after reveal */}
          {activeQ.revealed && participants.length > 0 && (
            <div style={{ marginTop: 24, background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '12px 0', border: '1px solid rgba(255,255,255,.1)' }}>
              {/* Leaderboard toggle: Individual vs Team */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{
                  display: 'inline-flex', background: 'rgba(255,255,255,.08)', borderRadius: 8, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,.1)',
                }}>
                  {['individual', 'team'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLeaderboardMode(mode)}
                      style={{
                        background: leaderboardMode === mode ? C.accent : 'transparent',
                        color: leaderboardMode === mode ? C.dark : 'rgba(255,255,255,.6)',
                        border: 'none', padding: '5px 16px', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.8,
                        transition: 'all .2s',
                      }}
                    >
                      {mode === 'individual' ? 'Individual' : 'Team'}
                    </button>
                  ))}
                </div>
              </div>

              {leaderboardMode === 'individual' ? (
                <>
                  <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    Leaderboard
                  </div>
                  <Leaderboard participants={participants} variant="projector" />
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    Team Leaderboard
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    {teamLeaderboardData.slice(0, 5).map((team, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                      const maxXp = teamLeaderboardData[0]?.xp || 1;
                      const barPct = Math.round((team.xp / maxXp) * 100);
                      return (
                        <div key={team.name} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '8px 12px', borderRadius: 8,
                          background: idx === 0 ? 'rgba(255,215,0,.1)' : 'transparent',
                          marginBottom: 4,
                        }}>
                          <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,.5)' }}>
                            {medal || `${idx + 1}.`}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{team.name}</span>
                              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>
                                {team.members} member{team.members !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,.12)', borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
                              <div style={{
                                height: '100%', borderRadius: 2, width: `${barPct}%`,
                                background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : C.accent,
                                transition: 'width .6s ease',
                              }} />
                            </div>
                          </div>
                          <span style={{
                            fontWeight: 800, fontSize: 16,
                            color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : C.accent,
                            minWidth: 60, textAlign: 'right',
                          }}>
                            {team.xp} XP
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
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
            {presentationActive && <span style={{ marginLeft: 12, color: C.accent }}>● Presenting</span>}
          </span>
        </div>
      )}
    </div>
  );
}
