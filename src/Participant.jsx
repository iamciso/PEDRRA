import { useState, useEffect } from 'react';
import { useApp } from './context.js';
import { C, phaseColor, phaseLabel, itemIcon, ANS, card, btn, btnOutline, btnSm, input } from './theme';
import { Header, ProgressBar, Slide, SurveyQuestion } from './components.jsx';

/* ================================================================
   KAHOOT-STYLE LIVE QUESTION OVERLAY
   ================================================================ */
function LiveQuestionOverlay({ activeQ, course, onAnswer, myAnswers }) {
  const allItems = course.modules.flatMap((m) => m.items.filter((i) => i.type === 'quiz'));
  const activeItem = allItems.find((i) => i.id === activeQ.itemId);
  const q = activeItem?.qs?.[activeQ.qIndex];

  if (!q) return null;

  const myAnswer = myAnswers?.[`${activeQ.itemId}-${activeQ.qIndex}`];
  const answered = myAnswer !== undefined;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(8, 47, 102, .97)',
      zIndex: 500, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {/* Question */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 28px',
        maxWidth: 600, width: '100%', textAlign: 'center', marginBottom: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,.3)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          LIVE QUESTION · {q.xp} XP
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: C.dark, lineHeight: 1.4, margin: 0 }}>{q.text}</p>
      </div>

      {/* Answers */}
      {!answered ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600, width: '100%' }}>
          {(q.opts || []).map((opt, i) => (
            <button
              key={i}
              onClick={() => onAnswer(activeQ.itemId, activeQ.qIndex, i, q.xp)}
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
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Answer submitted!</p>
              <p style={{ fontSize: 13, color: C.muted }}>Waiting for results...</p>
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
        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
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
  const slides = item.slides || [];
  const total = slides.length;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Slide {idx + 1} of {total}</p>

      {total === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: C.dim, padding: 40 }}>No slides available.</div>
      ) : (
        <>
          <Slide s={slides[idx]} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              style={btnOutline()}
              disabled={idx === 0}
            >← Prev</button>
            <div style={{ display: 'flex', gap: 6 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: i === idx ? C.primary : C.border,
                  }}
                />
              ))}
            </div>
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
        </>
      )}
    </div>
  );
}

/* ================================================================
   SURVEY VIEWER
   ================================================================ */
function SurveyViewer({ item, onSubmit, isSubmitted, savedAnswers, onBack }) {
  const [answers, setAnswers] = useState(savedAnswers || {});

  const allAnswered = (item.qs || []).filter((q) => q.type !== 'header').every((q) => {
    if (q.type === 'text') return true; // optional
    return answers[q.id] !== undefined;
  });

  const handleSubmit = () => {
    onSubmit(answers);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{item.title}</h2>
      {item.desc && <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{item.desc}</p>}

      <div style={{ marginBottom: 16 }}>
        {(item.qs || []).map((q) => (
          <SurveyQuestion
            key={q.id}
            q={q}
            answers={answers}
            setAnswers={setAnswers}
            readonly={isSubmitted}
          />
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
function QuizInfo({ item, onBack }) {
  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
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
      </div>
    </div>
  );
}

/* ================================================================
   MODULE VIEW
   ================================================================ */
function ModuleView({ module: m, progress, onItemSelect, onBack }) {
  const done = Object.keys(progress).filter((k) => k.startsWith(m.id + '-')).length;
  const total = m.items.length;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}
        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
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
          return (
            <button
              key={item.id}
              onClick={() => onItemSelect(item)}
              style={{
                ...card, display: 'flex', alignItems: 'center', gap: 12,
                textAlign: 'left', cursor: 'pointer', border: 'none',
                background: isDone ? C.success + '10' : C.white,
                borderLeft: `4px solid ${isDone ? C.success : C.border}`,
                transition: 'background .15s',
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
export default function Participant({ participantId, onExit }) {
  const {
    course, participants, activeQ, broadcast,
    recordAnswer, recordSurvey, markComplete,
  } = useApp();

  // Find participant
  const participant = participants.find((p) => p.id === participantId) || { name: '', xp: 0, team: '' };

  // Local progress & survey answers (keyed by "moduleId-itemId")
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`pedrra-progress-${participantId}`) || '{}'); } catch { return {}; }
  });

  // My quiz answers for the live overlay (keyed by "itemId-qIndex")
  const [myAnswers, setMyAnswers] = useState({});

  // Navigation
  const [screen, setScreen] = useState('overview'); // overview | module | item
  const [currentModule, setCurrentModule] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem(`pedrra-progress-${participantId}`, JSON.stringify(progress)); } catch { /* noop */ }
  }, [progress, participantId]);

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

  const goBack = () => {
    if (screen === 'item') { setCurrentItem(null); setScreen('module'); }
    else if (screen === 'module') { setCurrentModule(null); setScreen('overview'); }
    else setScreen('overview');
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
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
        />
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
            return <QuizInfo item={currentItem} onBack={goBack} />;
          default:
            return null;
        }
      })()}
    </div>
  );
}
