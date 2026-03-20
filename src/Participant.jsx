import { useState, useEffect, useRef } from 'react';
import { useApp } from './context.js';
import { C, phaseColor, phaseLabel, itemIcon, ANS, card, btn, btnOutline, btnSm, input } from './theme';
import { Header, ProgressBar, Slide, SurveyQuestion, PresentationMode, useSwipe, SearchBar } from './components.jsx';

/* base64 beep sound for poll notifications */
const BEEP = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbBp5tn5AAAAAAAAAAAAAAAAAAAAAP/jOMAAAGEAIAAAAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jOMAAAAGkAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4zjAAAABpAAAABExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

/* ================================================================
   QUIZ REVIEW COMPONENT
   ================================================================ */
function QuizReview({ item, myAnswers, onBack }) {
  const qs = item.qs || [];
  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title} - Review</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
        {qs.length} question{qs.length !== 1 ? 's' : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {qs.map((q, i) => {
          const key = `${item.id}-${i}`;
          const myAns = myAnswers[key];
          const isCorrect = myAns === q.ok;
          const noCorrect = q.ok < 0;
          return (
            <div key={i} style={{
              ...card,
              borderLeft: `4px solid ${noCorrect ? C.primary : isCorrect ? C.success : C.danger}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>
                Question {i + 1} {q.xp ? `· ${q.xp} XP` : ''}
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>{q.text}</p>
              {q.opts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {q.opts.map((opt, oi) => {
                    const isMyAnswer = myAns === oi;
                    const isCorrectOpt = q.ok === oi;
                    let bg = 'transparent';
                    let border = `1px solid ${C.border}`;
                    if (isCorrectOpt && q.ok >= 0) { bg = C.success + '20'; border = `2px solid ${C.success}`; }
                    else if (isMyAnswer && !isCorrect && q.ok >= 0) { bg = C.danger + '20'; border = `2px solid ${C.danger}`; }
                    else if (isMyAnswer && noCorrect) { bg = C.primary + '15'; border = `2px solid ${C.primary}`; }
                    return (
                      <div key={oi} style={{
                        padding: '8px 12px', borderRadius: 8, fontSize: 13,
                        background: bg, border,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>{isMyAnswer ? (noCorrect ? '📊' : isCorrect ? '✅' : '❌') : isCorrectOpt && q.ok >= 0 ? '✅' : ''}</span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {myAns === undefined && (
                <div style={{ fontSize: 12, color: C.dim, fontStyle: 'italic' }}>Not answered</div>
              )}
              {q.explanation && (
                <div style={{
                  padding: '8px 12px', background: C.light, borderRadius: 8,
                  fontSize: 13, color: C.text, marginTop: 4,
                  borderLeft: `3px solid ${C.primary}`,
                }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   KAHOOT-STYLE LIVE QUESTION OVERLAY
   ================================================================ */
function LiveQuestionOverlay({ activeQ, course, onAnswer, myAnswers, soundEnabled }) {
  // Support both quiz questions and presentation polls
  const isFromPresentation = activeQ.fromPresentation;
  const [minimized, setMinimized] = useState(false);
  const [timerLeft, setTimerLeft] = useState(null);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const prevActiveQRef = useRef(null);

  let q = null;
  let responseKey = '';

  if (isFromPresentation) {
    q = { text: activeQ.text, opts: activeQ.opts, ok: activeQ.ok, xp: activeQ.xp, explanation: activeQ.explanation };
    responseKey = `${activeQ.itemId}-slide-${activeQ.slideIdx}`;
  } else {
    const allItems = course.modules.flatMap((m) => m.items.filter((i) => i.type === 'quiz'));
    const activeItem = allItems.find((i) => i.id === activeQ.itemId);
    q = activeItem?.qs?.[activeQ.qIndex];
    responseKey = `${activeQ.itemId}-${activeQ.qIndex}`;
  }

  // Audio notification when poll arrives
  useEffect(() => {
    if (activeQ && !prevActiveQRef.current) {
      // Poll just appeared
      const sEnabled = localStorage.getItem('pedrra-sound-enabled') !== 'false';
      if (sEnabled && soundEnabled !== false) {
        try {
          const audio = new Audio(BEEP);
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) { /* noop */ }
      }
      try { navigator.vibrate?.(200); } catch (e) { /* noop */ }
      setMinimized(false);
    }
    prevActiveQRef.current = activeQ;
  }, [activeQ, soundEnabled]);

  // Timer countdown
  useEffect(() => {
    const duration = activeQ?.timer;
    if (!duration || duration <= 0) { setTimerLeft(null); return; }
    setTimerLeft(duration);
    const interval = setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQ?.itemId, activeQ?.qIndex, activeQ?.slideIdx, activeQ?.timer]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timerLeft === 0 && q && !answered) {
      // Auto-submit with -1 (no answer / timeout)
      const qIdx = isFromPresentation ? `slide-${activeQ.slideIdx}` : activeQ.qIndex;
      onAnswer(activeQ.itemId, qIdx, -1, 0);
    }
  }, [timerLeft]);

  // Auto-expand when results are revealed
  useEffect(() => {
    if (activeQ?.revealed && minimized) {
      setMinimized(false);
      setAutoExpanded(true);
      const timeout = setTimeout(() => setAutoExpanded(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [activeQ?.revealed]);

  if (!q) return null;

  const myAnswer = myAnswers?.[responseKey];
  const answered = myAnswer !== undefined;
  const timerExpired = timerLeft === 0;
  const timerDuration = activeQ?.timer || 0;
  const timerFraction = timerDuration > 0 && timerLeft !== null ? timerLeft / timerDuration : 0;

  // Minimized state - small bottom bar
  if (minimized && answered && !activeQ.revealed) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(8, 47, 102, .95)', zIndex: 500,
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Waiting for results...</span>
        <button
          onClick={() => setMinimized(false)}
          style={{
            background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
            borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >Expand</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8, 47, 102, .97)',
      zIndex: 500, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {/* Timer bar at top */}
      {timerDuration > 0 && timerLeft !== null && !answered && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0' }}>
          <div style={{
            height: 6, background: 'rgba(255,255,255,.15)', width: '100%',
          }}>
            <div style={{
              height: '100%',
              width: `${timerFraction * 100}%`,
              background: timerLeft <= 5 ? C.danger : timerLeft <= 10 ? C.accent : C.success,
              transition: 'width 1s linear, background .3s',
              borderRadius: '0 3px 3px 0',
            }} />
          </div>
          <div style={{
            textAlign: 'center', color: timerLeft <= 5 ? '#ff6b6b' : '#fff',
            fontSize: 22, fontWeight: 800, marginTop: 8,
          }}>
            {timerLeft}s
          </div>
        </div>
      )}

      {/* Question */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 28px',
        maxWidth: 600, width: '100%', textAlign: 'center', marginBottom: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,.3)',
        marginTop: timerDuration > 0 && !answered ? 50 : 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          LIVE QUESTION · {q.xp} XP
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: C.dark, lineHeight: 1.4, margin: 0 }}>{q.text}</p>
      </div>

      {/* Answers */}
      {!answered && !timerExpired ? (
        activeQ.pollType === 'rating' ? (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', maxWidth: 600, width: '100%' }}>
            {[1,2,3,4,5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  const qIdx = isFromPresentation ? `slide-${activeQ.slideIdx}` : activeQ.qIndex;
                  onAnswer(activeQ.itemId, qIdx, n - 1, q.xp);
                }}
                style={{
                  background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.3)',
                  borderRadius: 16, padding: '16px 12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'transform .15s, background .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,215,0,.3)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <span style={{ fontSize: 36, color: '#FFD700' }}>★</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{n}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600, width: '100%' }}>
            {(q.opts || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  const qIdx = isFromPresentation ? `slide-${activeQ.slideIdx}` : activeQ.qIndex;
                  onAnswer(activeQ.itemId, qIdx, i, q.xp);
                }}
                style={{
                  background: ANS[i % 4]?.bg || C.primary,
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '20px 16px', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,.2)',
                  transition: 'transform .1s, box-shadow .1s',
                }}
              >
                <span style={{ fontSize: 20 }}>{ANS[i % 4]?.shape}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
              </button>
            ))}
          </div>
        )
      ) : timerExpired && !answered ? (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px 28px',
          maxWidth: 600, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏰</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Time's up!</p>
          <p style={{ fontSize: 13, color: C.muted }}>You didn't answer in time.</p>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px 28px',
          maxWidth: 600, width: '100%', textAlign: 'center',
        }}>
          {activeQ.revealed ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>
                {myAnswer === q.ok ? '✅' : q.ok < 0 ? '📊' : '❌'}
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                {q.ok < 0 ? 'Response recorded!' : myAnswer === q.ok ? 'Correct! +' + q.xp + ' XP' : 'Incorrect'}
              </p>
              {q.ok >= 0 && <p style={{ fontSize: 13, color: C.muted }}>
                Correct answer: {q.opts?.[q.ok]}
              </p>}
              {q.explanation && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', background: C.light, borderRadius: 8,
                  fontSize: 13, color: C.text, textAlign: 'left',
                  borderLeft: `3px solid ${C.primary}`,
                }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Answer submitted!</p>
              <p style={{ fontSize: 13, color: C.muted }}>Waiting for results...</p>
              <button
                onClick={() => setMinimized(true)}
                style={{
                  marginTop: 12, background: 'rgba(8,47,102,.08)', border: 'none',
                  color: C.primary, borderRadius: 8, padding: '8px 18px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >Minimize</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   DOCUMENT VIEWER
   ================================================================ */
function DocViewer({ item, onRead, isRead, onBack }) {
  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
        ← Back
      </button>
      <div style={card}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</h2>
        {item.desc && <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>{item.desc}</p>}

        {item.url ? (
          <div style={{ marginBottom: 20 }}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.primary, color: '#fff', padding: '10px 18px',
                borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14,
              }}
            >
              🔗 Open Document
            </a>
          </div>
        ) : (
          <div style={{ padding: 16, background: C.bg, borderRadius: 8, marginBottom: 20, color: C.muted, fontSize: 13 }}>
            Document will be provided by the facilitator.
          </div>
        )}

        <button
          onClick={onRead}
          style={btn(isRead ? C.success : C.primary)}
        >
          {isRead ? '✅ Marked as Read' : '✓ Mark as Read'}
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   SLIDE VIEWER
   ================================================================ */
function SlideViewer({ item, onComplete, isComplete, onBack }) {
  const [idx, setIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const slides = item.slides || [];
  const total = slides.length;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  // Swipe support
  const swipeRef = useSwipe(
    () => setIdx((i) => Math.min(total - 1, i + 1)), // swipe left = next
    () => setIdx((i) => Math.max(0, i - 1)),          // swipe right = prev
  );

  // Keyboard navigation
  useEffect(() => {
    if (presenting) return; // PresentationMode handles its own keys
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(total - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [total, presenting]);

  if (presenting && total > 0) {
    return <PresentationMode slides={slides} startIdx={idx} onClose={() => setPresenting(false)} />;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 }}>
          ← Back
        </button>
        {total > 0 && (
          <button onClick={() => setPresenting(true)}
            style={{ ...btn(C.dark), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
            📺 Present Fullscreen
          </button>
        )}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</h2>
      {item.desc && <p style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>{item.desc}</p>}
      <p style={{ color: C.dim, fontSize: 13, marginBottom: 16 }}>
        Slide {idx + 1} of {total} · Use arrow keys or swipe to navigate
      </p>

      {total === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: C.dim, padding: 40 }}>No slides available.</div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Thumbnail sidebar (desktop only) */}
          {isDesktop && showThumbnails && (
            <div style={{
              width: 120, flexShrink: 0, maxHeight: 500, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 6,
              paddingRight: 4,
            }}>
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    border: i === idx ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    borderRadius: 6, padding: 4, cursor: 'pointer',
                    background: i === idx ? C.primary + '10' : C.white,
                    textAlign: 'left', fontSize: 10, color: C.muted,
                    minHeight: 60, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    transition: 'border .15s, background .15s',
                    opacity: i === idx ? 1 : 0.7,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: i === idx ? C.primary : C.dim, marginBottom: 2 }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontSize: 9, color: C.muted, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                    textAlign: 'center',
                  }}>
                    {s.title || s.body?.substring(0, 20) || `Slide ${i + 1}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Main slide area */}
          <div style={{ flex: 1, minWidth: 0 }} ref={swipeRef}>
            <Slide s={slides[idx]} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}>
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                style={btnOutline()}
                disabled={idx === 0}
              >← Prev</button>

              {/* Dot indicators (mobile) or minimal on desktop */}
              {!isDesktop && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      style={{
                        width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: i === idx ? C.primary : C.border,
                        transition: 'background .2s',
                      }}
                    />
                  ))}
                </div>
              )}

              {idx === total - 1 ? (
                <button onClick={onComplete} style={btn(isComplete ? C.success : C.primary)}>
                  {isComplete ? '✅ Done' : 'Complete ✓'}
                </button>
              ) : (
                <button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} style={btn(C.primary)}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SURVEY VIEWER
   ================================================================ */
function SurveyViewer({ item, onSubmit, isSubmitted, savedAnswers, onBack }) {
  const [answers, setAnswers] = useState(savedAnswers || {});
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  const questions = (item.qs || []).filter((q) => q.type !== 'header');
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((q) => {
    if (q.type === 'text') return answers[q.id] !== undefined && answers[q.id] !== '';
    return answers[q.id] !== undefined;
  }).length;

  const allAnswered = questions.every((q) => {
    if (q.type === 'text') return true; // optional
    return answers[q.id] !== undefined;
  });

  const validate = () => {
    const newErrors = {};
    questions.forEach((q) => {
      if (q.type === 'text') return; // text is optional
      if (answers[q.id] === undefined) {
        newErrors[q.id] = 'This question is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!validate()) return;
    onSubmit(answers);
  };

  // Re-validate on answer change if user already attempted
  useEffect(() => {
    if (attempted) validate();
  }, [answers, attempted]);

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</h2>
      {item.desc && <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>{item.desc}</p>}

      {/* Progress counter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        fontSize: 13, color: C.muted,
      }}>
        <span>Question {Math.min(answeredCount + 1, totalQuestions)} of {totalQuestions}</span>
        <div style={{
          flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            height: '100%', background: C.primary, borderRadius: 2,
            transition: 'width .3s',
          }} />
        </div>
        <span style={{ fontWeight: 600 }}>{answeredCount}/{totalQuestions}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {(item.qs || []).map((q) => (
          <div key={q.id}>
            <SurveyQuestion
              q={q}
              answers={answers}
              setAnswers={setAnswers}
              readonly={isSubmitted}
            />
            {errors[q.id] && (
              <div style={{
                color: C.danger, fontSize: 12, fontWeight: 600,
                marginTop: -8, marginBottom: 8, paddingLeft: 4,
              }}>
                {errors[q.id]}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isSubmitted ? (
        <button onClick={handleSubmit} style={{ ...btn(C.primary), width: '100%' }}>
          Submit Survey
        </button>
      ) : (
        <div style={{ padding: 14, background: C.success + '18', borderRadius: 8, textAlign: 'center', color: C.success, fontWeight: 600 }}>
          ✅ Survey submitted. Thank you!
        </div>
      )}
    </div>
  );
}

/* ================================================================
   QUIZ INFO
   ================================================================ */
function QuizInfo({ item, onBack, quizAnswers, onReview }) {
  const hasAnswers = quizAnswers && Object.keys(quizAnswers).some((k) => k.startsWith(item.id + '-'));

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
        ← Back
      </button>
      <div style={{ ...card, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>{item.title}</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 6 }}>
          {item.qs?.length || 0} question{(item.qs?.length || 0) !== 1 ? 's' : ''}
        </p>
        <div style={{ padding: 16, background: C.light, borderRadius: 10, fontSize: 14, color: C.primary, fontWeight: 600, marginTop: 16 }}>
          📺 These questions will be pushed live by the facilitator during the session.
          <br />Keep your device ready!
        </div>
        {hasAnswers && (
          <button
            onClick={() => onReview(item)}
            style={{ ...btn(C.primary), marginTop: 16 }}
          >
            📋 Review My Answers
          </button>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MODULE VIEW
   ================================================================ */
function ModuleView({ module: m, progress, onItemSelect, onBack, quizAnswers, onReview }) {
  const done = Object.keys(progress).filter((k) => k.startsWith(m.id + '-')).length;
  const total = m.items.length;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: C.light, border: `1px solid ${C.primary}33`, color: C.primary, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: '8px 14px', borderRadius: 8 }}>
        ← Back to Course
      </button>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{m.icon}</span>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{m.title}</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{m.desc}</p>
          </div>
        </div>
        <ProgressBar done={done} total={total} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {m.items.map((item) => {
          const key = `${m.id}-${item.id}`;
          const isDone = !!progress[key];
          const hasQuizAnswers = item.type === 'quiz' && quizAnswers &&
            Object.keys(quizAnswers).some((k) => k.startsWith(item.id + '-'));
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onItemSelect(item)}
                style={{
                  ...card, display: 'flex', alignItems: 'center', gap: 12,
                  textAlign: 'left', cursor: 'pointer', border: 'none',
                  background: isDone ? C.success + '10' : C.white,
                  borderLeft: `4px solid ${isDone ? C.success : C.border}`,
                  transition: 'background .15s', flex: 1,
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{itemIcon[item.type] || '📄'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {item.desc || item.type}
                    {item.slides && ` · ${item.slides.length} slides`}
                    {item.qs && ` · ${item.qs.length} questions`}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {isDone
                    ? <span style={{ fontSize: 18 }}>✅</span>
                    : <span style={{ fontSize: 18, color: C.dim }}>›</span>
                  }
                </div>
              </button>
              {hasQuizAnswers && (
                <button
                  onClick={() => onReview(item)}
                  style={{
                    background: C.primary + '15', border: `1px solid ${C.primary}33`,
                    color: C.primary, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Review
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   COURSE OVERVIEW
   ================================================================ */
function CourseOverview({ course, progress, xp, onModuleSelect }) {
  const phases = ['before', 'live', 'after'];
  const totalItems = course.modules.reduce((s, m) => s + m.items.length, 0);
  const totalDone = Object.keys(progress).length;

  return (
    <div style={{ padding: 20 }}>
      {/* XP + Progress */}
      <div style={{ ...card, marginBottom: 20, background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`, border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: 1, textTransform: 'uppercase' }}>Your XP</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.accent, lineHeight: 1 }}>{xp} ⭐</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: 1, textTransform: 'uppercase' }}>Progress</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{totalDone}/{totalItems}</div>
          </div>
        </div>
        <ProgressBar done={totalDone} total={totalItems} color={C.accent} />
      </div>

      {/* Modules by phase */}
      {phases.map((phase) => {
        const mods = course.modules.filter((m) => m.phase === phase);
        if (!mods.length) return null;
        return (
          <div key={phase} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              paddingBottom: 6, borderBottom: `2px solid ${phaseColor[phase]}22`,
            }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 10,
                background: phaseColor[phase] + '18', color: phaseColor[phase],
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5,
              }}>{phaseLabel[phase]}</span>
            </div>
            {mods.map((m) => {
              const done = m.items.filter((it) => progress[`${m.id}-${it.id}`]).length;
              return (
                <button
                  key={m.id}
                  onClick={() => onModuleSelect(m)}
                  style={{
                    ...card, display: 'flex', alignItems: 'center', gap: 12,
                    marginBottom: 8, width: '100%', textAlign: 'left',
                    cursor: 'pointer', border: 'none', borderLeft: `4px solid ${phaseColor[m.phase]}`,
                    padding: 14, transition: 'background .15s',
                  }}
                >
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{m.title}</div>
                    <ProgressBar done={done} total={m.items.length} />
                  </div>
                  <span style={{ fontSize: 18, color: C.dim, flexShrink: 0 }}>›</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   PARTICIPANT MAIN
   ================================================================ */
export { LiveQuestionOverlay, DocViewer, SlideViewer, SurveyViewer, QuizInfo, QuizReview };

export default function Participant({ participantId, onExit }) {
  const {
    course, participants, activeQ, broadcast,
    recordAnswer, recordSurvey, markComplete,
    presentationActive,
  } = useApp();

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('pedrra-sound-enabled') !== 'false';
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('pedrra-sound-enabled', String(next));
  };

  // Find participant
  const participant = participants.find((p) => p.id === participantId) || { name: '', xp: 0, team: '' };

  // Local progress & survey answers (keyed by "moduleId-itemId")
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pedrra-progress-${participantId}`) || '{}'); } catch { return {}; }
  });

  // My quiz answers for the live overlay (keyed by "itemId-qIndex")
  const [myAnswers, setMyAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pedrra-quiz-answers-${participantId}`) || '{}'); } catch { return {}; }
  });

  // Navigation
  const [screen, setScreen] = useState('overview'); // overview | module | item | quizReview
  const [currentModule, setCurrentModule] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem(`pedrra-progress-${participantId}`, JSON.stringify(progress)); } catch { /* noop */ }
  }, [progress, participantId]);

  // Persist quiz answers to localStorage
  useEffect(() => {
    try { localStorage.setItem(`pedrra-quiz-answers-${participantId}`, JSON.stringify(myAnswers)); } catch { /* noop */ }
  }, [myAnswers, participantId]);

  const markDone = (moduleId, itemId) => {
    setProgress((p) => ({ ...p, [`${moduleId}-${itemId}`]: true }));
    markComplete(participantId, moduleId, itemId);
  };

  const handleAnswer = (itemId, qIndex, answerIdx, xp) => {
    const key = `${itemId}-${qIndex}`;
    if (myAnswers[key] !== undefined) return; // already answered
    setMyAnswers((p) => ({ ...p, [key]: answerIdx }));
    recordAnswer(participantId, itemId, qIndex, answerIdx, xp);
  };

  const handleSurveySubmit = (moduleId, itemId, answers) => {
    markDone(moduleId, itemId);
    recordSurvey(participantId, itemId, answers);
  };

  const selectItem = (m, item) => {
    setCurrentModule(m);
    setCurrentItem(item);
    setScreen('item');
  };

  const handleReview = (item) => {
    setReviewItem(item);
    setScreen('quizReview');
  };

  const goBack = () => {
    if (screen === 'quizReview') { setReviewItem(null); setScreen(currentModule ? 'module' : 'overview'); }
    else if (screen === 'item') { setCurrentItem(null); setScreen('module'); }
    else if (screen === 'module') { setCurrentModule(null); setScreen('overview'); }
    else setScreen('overview');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Header
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>PEDRRA</span>
            {participant.name && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>
                · {participant.name}
              </span>
            )}
          </div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Mute poll sounds' : 'Unmute poll sounds'}
              style={{
                background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
                borderRadius: 6, padding: '5px 8px', fontSize: 14, cursor: 'pointer',
                opacity: soundEnabled ? 1 : 0.5,
              }}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{participant.xp || 0} ⭐</span>
            <button onClick={onExit}
              style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
              Exit
            </button>
          </div>
        }
      />

      {/* Live question overlay */}
      {activeQ && (
        <LiveQuestionOverlay
          activeQ={activeQ}
          course={course}
          onAnswer={handleAnswer}
          myAnswers={myAnswers}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Session in progress holding screen (during presentations, no active poll) */}
      {presentationActive && !activeQ && (
        <div style={{
          position: 'fixed', inset: 0, background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
          zIndex: 400, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📺</div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
            Session in Progress
          </h2>
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 15, margin: '0 0 32px', textAlign: 'center' }}>
            Follow along on the projector
          </p>
          <div style={{
            background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: 24,
            textAlign: 'center', minWidth: 200,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              Your XP
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
              {participant.xp || 0} ⭐
            </div>
          </div>
          {participants.length > 1 && (
            <div style={{
              marginTop: 16, background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 20px',
              color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center',
            }}>
              Position: {[...participants].sort((a, b) => b.xp - a.xp).findIndex(p => p.id === participantId) + 1} of {participants.length}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {screen === 'overview' && (
        <CourseOverview
          course={course}
          progress={progress}
          xp={participant.xp || 0}
          onModuleSelect={(m) => { setCurrentModule(m); setScreen('module'); }}
        />
      )}

      {screen === 'module' && currentModule && (
        <ModuleView
          module={currentModule}
          progress={progress}
          onItemSelect={(item) => selectItem(currentModule, item)}
          onBack={() => { setCurrentModule(null); setScreen('overview'); }}
          quizAnswers={myAnswers}
          onReview={handleReview}
        />
      )}

      {screen === 'quizReview' && reviewItem && (
        <QuizReview
          item={reviewItem}
          myAnswers={myAnswers}
          onBack={goBack}
        />
      )}

      {screen === 'item' && currentItem && currentModule && (() => {
        const key = `${currentModule.id}-${currentItem.id}`;
        const isDone = !!progress[key];

        switch (currentItem.type) {
          case 'doc':
            return (
              <DocViewer
                item={currentItem}
                isRead={isDone}
                onRead={() => markDone(currentModule.id, currentItem.id)}
                onBack={goBack}
              />
            );
          case 'slides':
            return (
              <SlideViewer
                item={currentItem}
                isComplete={isDone}
                onComplete={() => markDone(currentModule.id, currentItem.id)}
                onBack={goBack}
              />
            );
          case 'survey':
            return (
              <SurveyViewer
                item={currentItem}
                isSubmitted={isDone}
                savedAnswers={null}
                onSubmit={(answers) => handleSurveySubmit(currentModule.id, currentItem.id, answers)}
                onBack={goBack}
              />
            );
          case 'quiz':
            return (
              <QuizInfo
                item={currentItem}
                onBack={goBack}
                quizAnswers={myAnswers}
                onReview={handleReview}
              />
            );
          default:
            return null;
        }
      })()}
    </div>
  );
}
