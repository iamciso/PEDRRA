/**
 * PEDRRA Local Server
 *
 * Serves the app and provides WebSocket-based real-time sync.
 * No third-party services required — runs entirely on your local network.
 *
 * Usage:
 *   npm run build        # Build the frontend
 *   npm run serve         # Start the server
 *   # or: node server.js [port]
 *
 * Then open http://<your-ip>:3000 in the browser.
 * Participants connect to the same URL on the local network.
 */
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10);

// ─── Express static server ────────────────────────────────
const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
// SPA fallback — serve index.html for all routes
app.use((req, res, next) => {
  // If the request is for a file that doesn't exist, serve index.html (SPA fallback)
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);

// ─── In-memory session store ──────────────────────────────
const sessions = new Map(); // code → { session, presentation, activeQ, participants, responses }

function getSession(code) {
  if (!sessions.has(code)) {
    sessions.set(code, {
      session: null,
      presentation: { active: false, slideIdx: 0, slides: null, itemId: null },
      activeQ: null,
      activeSurvey: null,
      participants: {},   // id → participant
      responses: {},      // "itemId-qIndex" → { counts: [], answers: [] }
      clients: new Set(), // WebSocket connections subscribed to this session
    });
  }
  return sessions.get(code);
}

// ─── WebSocket server ─────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let subscribedCode = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg);
      subscribedCode = msg.code || subscribedCode;
    } catch (err) {
      console.warn('[WS] Bad message:', err.message);
    }
  });

  ws.on('close', () => {
    // Remove from session clients
    if (subscribedCode) {
      const s = sessions.get(subscribedCode);
      if (s) s.clients.delete(ws);
    }
  });

  ws.on('error', () => {});
});

function broadcast(code, type, payload, excludeWs) {
  const s = sessions.get(code);
  if (!s) return;
  const msg = JSON.stringify({ type, payload });
  for (const client of s.clients) {
    if (client !== excludeWs && client.readyState === 1) {
      client.send(msg);
    }
  }
}

function handleMessage(ws, msg) {
  const { type, code, payload } = msg;
  if (!code) return;

  const s = getSession(code);

  switch (type) {
    // ── Session lifecycle ──
    case 'SUBSCRIBE':
      s.clients.add(ws);
      // Send current state to newly connected client
      ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        payload: {
          session: s.session,
          presentation: s.presentation,
          activeQ: s.activeQ,
          activeSurvey: s.activeSurvey,
          participants: Object.values(s.participants),
          responses: s.responses,
        },
      }));
      break;

    case 'SESSION_CREATE':
      s.session = payload;
      broadcast(code, 'SESSION', payload);
      break;

    case 'SESSION_END':
      broadcast(code, 'SESSION_END', {});
      sessions.delete(code);
      break;

    // ── Participant management ──
    case 'JOIN':
      if (payload.participant) {
        s.participants[payload.participant.id] = payload.participant;
        broadcast(code, 'PARTICIPANT_JOINED', {
          participant: payload.participant,
          participants: Object.values(s.participants),
        });
      }
      break;

    // ── Presentation sync ──
    case 'PRESENT_START':
      s.presentation = {
        active: true,
        itemId: payload.itemId,
        slideIdx: 0,
        slides: payload.slides,
      };
      s.activeQ = null;
      broadcast(code, 'PRESENT_START', s.presentation, ws);
      break;

    case 'SLIDE_NAV':
      s.presentation.slideIdx = payload.slideIdx;
      // If moving to next slide during a presentation poll, clear activeQ
      if (s.activeQ?.fromPresentation) {
        s.activeQ = null;
        broadcast(code, 'ACTIVE_Q', null, ws);
      }
      broadcast(code, 'SLIDE_NAV', { slideIdx: payload.slideIdx }, ws);
      break;

    case 'PRESENT_END':
      s.presentation = { active: false, slideIdx: 0, slides: null, itemId: null };
      if (s.activeQ?.fromPresentation) s.activeQ = null;
      broadcast(code, 'PRESENT_END', {}, ws);
      break;

    // ── Poll / Question sync ──
    case 'PUSH_Q':
      s.activeQ = { ...payload, revealed: false, pushedAt: Date.now() };
      broadcast(code, 'PUSH_Q', s.activeQ);
      break;

    case 'REVEAL':
      if (s.activeQ) {
        s.activeQ = { ...s.activeQ, revealed: true };
        broadcast(code, 'REVEAL', s.activeQ);
      }
      break;

    case 'CLEAR_Q':
      s.activeQ = null;
      broadcast(code, 'ACTIVE_Q', null);
      break;

    // ── Survey push ──
    case 'PUSH_SURVEY':
      s.activeSurvey = { ...payload, pushedAt: Date.now() };
      broadcast(code, 'PUSH_SURVEY', s.activeSurvey);
      break;

    case 'CLEAR_SURVEY':
      s.activeSurvey = null;
      broadcast(code, 'CLEAR_SURVEY', null);
      break;

    // ── Answer submission ──
    case 'ANSWER':
      // Update responses
      const key = `${payload.itemId}-${payload.qIndex}`;
      if (!s.responses[key]) {
        s.responses[key] = { counts: [], answers: [] };
      }
      const resp = s.responses[key];
      resp.counts[payload.answerIdx] = (resp.counts[payload.answerIdx] || 0) + 1;
      resp.answers.push(payload);

      // Update participant XP
      if (payload.participantId && s.participants[payload.participantId]) {
        const p = s.participants[payload.participantId];
        p.xp = (p.xp || 0) + (payload.xp || 0);
        p.answers = (p.answers || 0) + 1;
      }

      // Broadcast to all (including sender, so admin sees updates)
      broadcast(code, 'ANSWER', {
        ...payload,
        responseCounts: resp.counts,
        totalResponses: resp.counts.reduce((a, b) => a + (b || 0), 0),
        participants: Object.values(s.participants),
      });
      break;

    default:
      // Forward unknown messages to all clients
      broadcast(code, type, payload, ws);
  }
}

// ─── Start server ──────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          PEDRRA Training Server                  ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                ║`);

  // Show all network interfaces
  const nets = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(nets)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const url = `http://${addr.address}:${PORT}`;
        console.log(`║  Network:  ${url.padEnd(37)}║`);
      }
    }
  }

  console.log('║                                                  ║');
  console.log('║  Share the Network URL with participants.        ║');
  console.log('║  Press Ctrl+C to stop.                           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
