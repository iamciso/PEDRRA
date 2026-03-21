/**
 * Firebase configuration for PEDRRA real-time sync.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (e.g., "pedrra-training")
 * 3. Go to Project Settings → General → Your apps → Add app (Web)
 * 4. Copy the firebaseConfig object and paste below
 * 5. Go to Realtime Database → Create Database → Start in test mode
 * 6. That's it! Cross-device sync will work automatically.
 *
 * Without Firebase configured, the app falls back to same-browser sync only.
 */
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, set, onValue, update, push, remove,
  onDisconnect, serverTimestamp,
} from 'firebase/database';

// ─── PASTE YOUR FIREBASE CONFIG HERE ───────────────────
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
// ────────────────────────────────────────────────────────

let app = null;
let db = null;
let _enabled = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    _enabled = true;
    console.log('[PEDRRA] Firebase connected — cross-device sync enabled');
  } else {
    console.log('[PEDRRA] Firebase not configured — using local sync only. See src/firebase.js for setup.');
  }
} catch (err) {
  console.warn('[PEDRRA] Firebase init failed:', err.message);
}

export const firebaseEnabled = () => _enabled;
export { db, ref, set, onValue, update, push, remove, onDisconnect, serverTimestamp };
