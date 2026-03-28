// Sound effects system for PEDRRA
// Uses Web Audio API — no external files needed

let _ctx = null;
function getCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  return _ctx;
}

function tone(freq, start, dur, vol = 0.3, type = 'sine') {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur);
}

// ── SOUND EFFECTS ──

export function playCorrect() {
  tone(523, 0, 0.1, 0.25);
  tone(659, 0.1, 0.1, 0.25);
  tone(784, 0.2, 0.3, 0.3);
}

export function playWrong() {
  tone(300, 0, 0.15, 0.2, 'sawtooth');
  tone(250, 0.15, 0.3, 0.15, 'sawtooth');
}

export function playTick() {
  tone(800, 0, 0.05, 0.15);
}

export function playWheelSpin() {
  for (let i = 0; i < 8; i++) {
    tone(400 + i * 50, i * 0.08, 0.05, 0.1);
  }
}

export function playWheelWinner() {
  tone(523, 0, 0.15, 0.3);
  tone(659, 0.15, 0.15, 0.3);
  tone(784, 0.3, 0.15, 0.3);
  tone(1047, 0.45, 0.4, 0.35);
}

export function playLevelUp() {
  tone(440, 0, 0.1, 0.2);
  tone(554, 0.1, 0.1, 0.2);
  tone(659, 0.2, 0.1, 0.25);
  tone(880, 0.3, 0.4, 0.3);
}

export function playBadge() {
  tone(880, 0, 0.1, 0.2);
  tone(1100, 0.1, 0.1, 0.25);
  tone(1320, 0.2, 0.3, 0.3);
}

export function playCountdown() {
  tone(440, 0, 0.1, 0.2);
}

export function playTimerEnd() {
  tone(523, 0, 0.2, 0.3);
  tone(659, 0.25, 0.2, 0.3);
  tone(784, 0.5, 0.4, 0.35);
}

export function playPollSubmit() {
  tone(600, 0, 0.08, 0.15);
  tone(900, 0.08, 0.12, 0.2);
}

export function playReaction() {
  tone(1200, 0, 0.05, 0.1);
}

// ── CELEBRATION ANIMATIONS ──

export function launchConfetti(container) {
  if (!container) container = document.body;
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#254A9A', '#F1C064'];
  const count = 80;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 8;
    const x = Math.random() * 100;
    const delay = Math.random() * 1;
    const dur = 2 + Math.random() * 2;
    piece.style.cssText = `position:absolute;top:-10px;left:${x}%;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random()>0.5?'50%':'2px'};animation:confettiFall ${dur}s ${delay}s ease-out forwards;`;
    wrapper.appendChild(piece);
  }

  container.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), 5000);
}

export function launchFireworks(container) {
  if (!container) container = document.body;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';

  for (let burst = 0; burst < 3; burst++) {
    const cx = 20 + Math.random() * 60;
    const cy = 20 + Math.random() * 40;
    const delay = burst * 0.5;
    const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'];

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const particle = document.createElement('div');
      particle.style.cssText = `position:absolute;left:${cx}%;top:${cy}%;width:4px;height:4px;border-radius:50%;background:${colors[i%colors.length]};opacity:0;animation:fireworkBurst 1s ${delay}s ease-out forwards;--dx:${dx}px;--dy:${dy}px;`;
      wrapper.appendChild(particle);
    }
  }

  // Add CSS animation if not exists
  if (!document.getElementById('firework-css')) {
    const style = document.createElement('style');
    style.id = 'firework-css';
    style.textContent = `
      @keyframes fireworkBurst {
        0% { transform:translate(0,0) scale(0); opacity:1; }
        50% { opacity:1; }
        100% { transform:translate(var(--dx),var(--dy)) scale(1); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), 4000);
}
