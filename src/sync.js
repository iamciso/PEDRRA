/**
 * PEDRRA Sync Module
 *
 * Provides real-time cross-device synchronization using Firebase Realtime Database.
 * Falls back to BroadcastChannel + localStorage for same-browser sync.
 *
 * Architecture:
 *   Trainer (Admin) ─── writes ──→ Firebase ──→ listeners on all devices
 *   Participant ─── writes ──→ Firebase ──→ trainer sees votes/joins in real-time
 */
import {
  firebaseEnabled, db, ref, set, onValue, update, push, remove,
  onDisconnect, serverTimestamp,
} from './firebase.js';

const CH_NAME = 'pedrra-sync';

// ─── BroadcastChannel (same-browser fallback) ──────────────
export const broadcastLocal = (type, payload) => {
  try {
    const ch = new BroadcastChannel(CH_NAME);
    ch.postMessage({ type, payload });
    ch.close();
  } catch { /* noop */ }
};

// ─── Firebase paths ────────────────────────────────────────
const sessionRef = (code) => ref(db, `sessions/${code}`);
const stateRef = (code) => ref(db, `sessions/${code}/state`);
const participantsRef = (code) => ref(db, `sessions/${code}/participants`);
const responsesRef = (code) => ref(db, `sessions/${code}/responses`);
const activeQRef = (code) => ref(db, `sessions/${code}/activeQ`);
const presentationRef = (code) => ref(db, `sessions/${code}/presentation`);

// ─── SESSION MANAGEMENT ────────────────────────────────────

/** Create a new session in Firebase */
export async function createSession(sessionData) {
  broadcastLocal('SESSION', sessionData);
  if (!firebaseEnabled()) return;
  try {
    await set(sessionRef(sessionData.code), {
      ...sessionData,
      createdAt: Date.now(),
      presentation: { active: false, slideIdx: 0, slides: null, itemId: null },
      activeQ: null,
    });
  } catch (err) {
    console.warn('[Sync] createSession failed:', err.message);
  }
}

/** End a session */
export async function endSession(code) {
  if (!firebaseEnabled() || !code) return;
  try {
    await remove(sessionRef(code));
  } catch (err) {
    console.warn('[Sync] endSession failed:', err.message);
  }
}

// ─── PARTICIPANT MANAGEMENT ────────────────────────────────

/** Join a session as participant */
export async function joinSession(code, participant) {
  broadcastLocal('JOIN', { code, participant });
  if (!firebaseEnabled()) return;
  try {
    await set(ref(db, `sessions/${code}/participants/${participant.id}`), {
      ...participant,
      online: true,
      lastSeen: Date.now(),
    });
    // Auto-remove on disconnect
    const pRef = ref(db, `sessions/${code}/participants/${participant.id}/online`);
    onDisconnect(pRef).set(false);
  } catch (err) {
    console.warn('[Sync] joinSession failed:', err.message);
  }
}

/** Update participant XP/answers */
export async function updateParticipant(code, participantId, updates) {
  if (!firebaseEnabled() || !code) return;
  try {
    await update(ref(db, `sessions/${code}/participants/${participantId}`), updates);
  } catch (err) {
    console.warn('[Sync] updateParticipant failed:', err.message);
  }
}

// ─── PRESENTATION SYNC ────────────────────────────────────

/** Start presenting — syncs slides to all devices */
export async function startPresentation(code, itemId, slides) {
  broadcastLocal('PRESENT_START', { itemId, slides });
  if (!firebaseEnabled() || !code) return;
  try {
    // Don't store full slide content (too big for Firebase), store reference
    // Store only minimal slide data needed for display
    const minSlides = slides.map(s => ({
      t: s.t || '', c: s.c || '', l: s.l || 'content',
      img: s.img || '', notes: '', // don't sync notes to participants
      opts: s.opts || undefined, text: s.text || undefined,
      ok: s.ok, xp: s.xp || 0, timer: s.timer || 30,
      autoReveal: s.autoReveal || false,
      bg: s.bg || undefined, color: s.color || undefined,
      videoUrl: s.videoUrl || undefined, audioUrl: s.audioUrl || undefined,
    }));
    await set(presentationRef(code), {
      active: true, itemId, slideIdx: 0,
      slides: minSlides,
      startedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[Sync] startPresentation failed:', err.message);
  }
}

/** Navigate to slide */
export async function navigateSlide(code, slideIdx) {
  broadcastLocal('SLIDE_NAV', { slideIdx });
  if (!firebaseEnabled() || !code) return;
  try {
    await update(presentationRef(code), { slideIdx });
  } catch (err) {
    console.warn('[Sync] navigateSlide failed:', err.message);
  }
}

/** End presentation */
export async function endPresentation(code) {
  broadcastLocal('PRESENT_END', {});
  if (!firebaseEnabled() || !code) return;
  try {
    await set(presentationRef(code), { active: false, slideIdx: 0, slides: null, itemId: null });
  } catch (err) {
    console.warn('[Sync] endPresentation failed:', err.message);
  }
}

// ─── POLL / QUESTION SYNC ─────────────────────────────────

/** Push a question (poll) to all participants */
export async function pushQuestion(code, questionData) {
  broadcastLocal('PUSH_Q', questionData);
  if (!firebaseEnabled() || !code) return;
  try {
    await set(activeQRef(code), { ...questionData, pushedAt: Date.now() });
  } catch (err) {
    console.warn('[Sync] pushQuestion failed:', err.message);
  }
}

/** Reveal answer */
export async function revealAnswer(code) {
  broadcastLocal('REVEAL', {});
  if (!firebaseEnabled() || !code) return;
  try {
    await update(activeQRef(code), { revealed: true });
  } catch (err) {
    console.warn('[Sync] revealAnswer failed:', err.message);
  }
}

/** Clear active question */
export async function clearQuestion(code) {
  if (!firebaseEnabled() || !code) return;
  try {
    await set(activeQRef(code), null);
  } catch (err) {
    console.warn('[Sync] clearQuestion failed:', err.message);
  }
}

/** Submit an answer */
export async function submitAnswer(code, answerData) {
  broadcastLocal('ANSWER', answerData);
  if (!firebaseEnabled() || !code) return;
  try {
    const key = `${answerData.itemId}-${answerData.qIndex}`;
    await push(ref(db, `sessions/${code}/responses/${key}`), {
      ...answerData,
      answeredAt: Date.now(),
    });
  } catch (err) {
    console.warn('[Sync] submitAnswer failed:', err.message);
  }
}

// ─── LISTENERS (for receiving updates) ─────────────────────

/**
 * Subscribe to all session changes. Returns unsubscribe function.
 * @param {string} code - Session code
 * @param {object} handlers - { onPresentation, onActiveQ, onParticipants, onResponses }
 */
export function subscribeToSession(code, handlers) {
  if (!firebaseEnabled() || !code) return () => {};

  const unsubs = [];

  // Presentation state
  if (handlers.onPresentation) {
    const unsub = onValue(presentationRef(code), (snap) => {
      const data = snap.val();
      if (data) handlers.onPresentation(data);
    });
    unsubs.push(unsub);
  }

  // Active question
  if (handlers.onActiveQ) {
    const unsub = onValue(activeQRef(code), (snap) => {
      handlers.onActiveQ(snap.val());
    });
    unsubs.push(unsub);
  }

  // Participants
  if (handlers.onParticipants) {
    const unsub = onValue(participantsRef(code), (snap) => {
      const data = snap.val();
      if (data) {
        handlers.onParticipants(Object.values(data));
      }
    });
    unsubs.push(unsub);
  }

  // Responses
  if (handlers.onResponses) {
    const unsub = onValue(responsesRef(code), (snap) => {
      const data = snap.val();
      if (data) {
        // Convert Firebase format to app format: { "itemId-qIndex": { counts: [...], answers: [...] } }
        const responses = {};
        for (const [key, entries] of Object.entries(data)) {
          const answers = Object.values(entries);
          const counts = [];
          answers.forEach(a => {
            counts[a.answerIdx] = (counts[a.answerIdx] || 0) + 1;
          });
          responses[key] = { counts, answers };
        }
        handlers.onResponses(responses);
      }
    });
    unsubs.push(unsub);
  }

  return () => unsubs.forEach(fn => { try { fn(); } catch {} });
}

/**
 * Check if a session exists in Firebase. Returns session data or null.
 */
export async function findSession(code) {
  if (!firebaseEnabled()) return null;
  return new Promise((resolve) => {
    const unsub = onValue(sessionRef(code), (snap) => {
      unsub();
      resolve(snap.val());
    }, { onlyOnce: true });
  });
}
