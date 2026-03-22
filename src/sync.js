/**
 * PEDRRA Sync Module — WebSocket-based real-time sync
 *
 * Connects to the local PEDRRA server via WebSocket for cross-device
 * communication. Falls back to BroadcastChannel for same-browser tabs.
 *
 * No third-party services required.
 */

const CH_NAME = 'pedrra-sync';
let ws = null;
let wsReady = false;
let reconnectTimer = null;
let messageQueue = [];
let currentCode = null;
let handlers = {};

// ─── BroadcastChannel (always works for same-browser) ──────
export const broadcastLocal = (type, payload) => {
  try {
    const ch = new BroadcastChannel(CH_NAME);
    ch.postMessage({ type, payload });
    ch.close();
  } catch { /* noop */ }
};

// ─── WebSocket connection ──────────────────────────────────

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

function send(type, code, payload) {
  const msg = JSON.stringify({ type, code: code || currentCode, payload });
  if (ws && wsReady) {
    ws.send(msg);
  } else {
    messageQueue.push(msg);
  }
}

function flushQueue() {
  while (messageQueue.length > 0 && ws && wsReady) {
    ws.send(messageQueue.shift());
  }
}

function handleWsMessage(event) {
  try {
    const { type, payload } = JSON.parse(event.data);

    switch (type) {
      case 'SYNC_STATE':
        // Full state sync when first connecting
        if (payload.presentation?.active && handlers.onPresentation) {
          handlers.onPresentation(payload.presentation);
        }
        if (payload.activeQ !== undefined && handlers.onActiveQ) {
          handlers.onActiveQ(payload.activeQ);
        }
        if (payload.activeSurvey && handlers.onSurveyPush) {
          handlers.onSurveyPush(payload.activeSurvey);
        }
        if (payload.participants && handlers.onParticipants) {
          handlers.onParticipants(payload.participants);
        }
        if (payload.responses && handlers.onResponses) {
          handlers.onResponses(payload.responses);
        }
        break;

      case 'PRESENT_START':
        if (handlers.onPresentation) handlers.onPresentation(payload);
        break;

      case 'SLIDE_NAV':
        if (handlers.onSlideNav) handlers.onSlideNav(payload.slideIdx);
        break;

      case 'PRESENT_END':
        if (handlers.onPresentationEnd) handlers.onPresentationEnd();
        break;

      case 'PUSH_Q':
        if (handlers.onActiveQ) handlers.onActiveQ(payload);
        break;

      case 'REVEAL':
        if (handlers.onActiveQ) handlers.onActiveQ(payload);
        break;

      case 'ACTIVE_Q':
        if (handlers.onActiveQ) handlers.onActiveQ(payload);
        break;

      case 'ANSWER':
        if (handlers.onAnswer) handlers.onAnswer(payload);
        break;

      case 'PUSH_SURVEY':
        if (handlers.onSurveyPush) handlers.onSurveyPush(payload);
        break;

      case 'CLEAR_SURVEY':
        if (handlers.onSurveyPush) handlers.onSurveyPush(null);
        break;

      case 'PARTICIPANT_JOINED':
        if (handlers.onParticipants) handlers.onParticipants(payload.participants);
        break;

      case 'SESSION_END':
        if (handlers.onSessionEnd) handlers.onSessionEnd();
        break;

      case 'DISCOVERED':
        if (handlers.onDiscovered) handlers.onDiscovered(payload);
        break;

      case 'SYNC_USERS':
        if (handlers.onSyncUsers) handlers.onSyncUsers(payload);
        break;

      case 'SYNC_COURSES':
        if (handlers.onSyncCourses) handlers.onSyncCourses(payload);
        break;

      default:
        break;
    }
  } catch (err) {
    console.warn('[Sync] Failed to handle message:', err.message);
  }
}

/**
 * Connect to the WebSocket server and subscribe to a session.
 * Returns true if WebSocket connection was established.
 */
export function connect(code, messageHandlers = {}) {
  currentCode = code;
  handlers = messageHandlers;

  // Don't connect if we're on the Vite dev server without the backend
  // (the /ws endpoint won't exist)
  if (ws) {
    // Already connected, just resubscribe
    send('SUBSCRIBE', code, {});
    return true;
  }

  try {
    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      wsReady = true;
      console.log('[Sync] WebSocket connected — cross-device sync active');
      send('SUBSCRIBE', code, {});
      flushQueue();
    };

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
      wsReady = false;
      ws = null;
      // Reconnect after 2 seconds
      if (currentCode) {
        reconnectTimer = setTimeout(() => connect(currentCode, handlers), 2000);
      }
    };

    ws.onerror = () => {
      // Will trigger onclose
      console.log('[Sync] WebSocket not available — using local sync only');
    };

    return true;
  } catch {
    console.log('[Sync] WebSocket not available — using local sync only');
    return false;
  }
}

/** Disconnect from WebSocket */
export function disconnect() {
  currentCode = null;
  handlers = {};
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    try { ws.close(); } catch {}
    ws = null;
    wsReady = false;
  }
}

/** Check if WebSocket is connected */
export function isConnected() {
  return wsReady;
}

// ─── API functions (called by App.jsx) ─────────────────────

/**
 * Discover active session (no code needed).
 * The server will respond with DISCOVERED message handled by onDiscovered callback.
 */
export function discoverSession() {
  const msg = JSON.stringify({ type: 'DISCOVER' });
  if (ws && wsReady) {
    ws.send(msg);
  } else {
    messageQueue.push(msg);
  }
}

/**
 * Connect without a session code to discover active sessions.
 * Used by regular users who don't know the session code yet.
 */
export function connectAndDiscover(messageHandlers = {}) {
  handlers = messageHandlers;

  if (ws) {
    discoverSession();
    return true;
  }

  try {
    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      wsReady = true;
      console.log('[Sync] WebSocket connected — discovering session...');
      flushQueue();
      discoverSession();
    };

    ws.onmessage = handleWsMessage;

    ws.onclose = () => {
      wsReady = false;
      ws = null;
      if (currentCode || handlers.onDiscovered) {
        reconnectTimer = setTimeout(() => {
          if (currentCode) connect(currentCode, handlers);
          else connectAndDiscover(handlers);
        }, 2000);
      }
    };

    ws.onerror = () => {};
    return true;
  } catch {
    return false;
  }
}

export function createSession(sessionData) {
  broadcastLocal('SESSION', sessionData);
  send('SESSION_CREATE', sessionData.code, sessionData);
}

export function endSession(code) {
  send('SESSION_END', code, {});
}

export function joinSession(code, participant) {
  broadcastLocal('JOIN', { code, participant });
  send('JOIN', code, { participant });
}

export function startPresentation(code, itemId, slides) {
  broadcastLocal('PRESENT_START', { itemId, slides });
  // Send minimal slide data (strip notes for participants)
  const minSlides = slides.map(s => ({
    t: s.t || '', c: s.c || '', l: s.l || 'content',
    img: s.img || '', opts: s.opts || undefined,
    text: s.text || undefined, ok: s.ok, xp: s.xp || 0,
    timer: s.timer || 30, autoReveal: s.autoReveal || false,
    bg: s.bg || undefined, color: s.color || undefined,
    videoUrl: s.videoUrl || undefined, audioUrl: s.audioUrl || undefined,
  }));
  send('PRESENT_START', code, { itemId, slides: minSlides });
}

export function navigateSlide(code, slideIdx) {
  broadcastLocal('SLIDE_NAV', { slideIdx });
  send('SLIDE_NAV', code, { slideIdx });
}

export function endPresentation(code) {
  broadcastLocal('PRESENT_END', {});
  send('PRESENT_END', code, {});
}

export function pushQuestion(code, questionData) {
  broadcastLocal('PUSH_Q', questionData);
  send('PUSH_Q', code, questionData);
}

export function revealAnswer(code) {
  broadcastLocal('REVEAL', {});
  send('REVEAL', code, {});
}

export function submitAnswer(code, answerData) {
  broadcastLocal('ANSWER', answerData);
  send('ANSWER', code, answerData);
}

export function pushSurvey(code, surveyData) {
  broadcastLocal('PUSH_SURVEY', surveyData);
  send('PUSH_SURVEY', code, surveyData);
}

export function clearSurvey(code) {
  broadcastLocal('CLEAR_SURVEY', {});
  send('CLEAR_SURVEY', code, {});
}

/** Push user list to server so all clients get it */
export function syncUsers(users) {
  const msg = JSON.stringify({ type: 'SYNC_USERS', payload: users });
  if (ws && wsReady) ws.send(msg);
}

/** Push course data to server so all clients get it */
export function syncCourses(courses) {
  const msg = JSON.stringify({ type: 'SYNC_COURSES', payload: courses });
  if (ws && wsReady) ws.send(msg);
}
