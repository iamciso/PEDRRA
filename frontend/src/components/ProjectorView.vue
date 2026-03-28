<template>
  <div ref="wrapper" style="position:fixed;inset:0;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;">

    <!-- WAIT SCREEN -->
    <div v-if="!currentSlide || !isSlideVisible" class="edps-presentation" :style="slideTransform">
      <div style="background:var(--edps-blue,#1b4293);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div class="edps-wait-icon"></div>
        <h2 style="color:white;margin-top:1.5rem;font-size:1.9rem;">Waiting for Presentation</h2>
        <p style="color:rgba(255,255,255,0.65);font-size:1rem;">The trainer will start the session shortly.</p>
      </div>
    </div>

    <!-- ACTIVE SLIDE -->
    <div v-else class="edps-presentation" :style="slideTransform">

      <!-- TITLE SLIDE -->
      <div v-if="currentSlide.type === 'title'" style="position:relative;width:100%;height:100%;background-image:url('/template/cover_bg.jpg');background-size:cover;overflow:hidden;">
        <div style="position:absolute;top:3%;left:2%;z-index:3;">
          <img src="/template/edps_logo.png" style="height:55px;" onerror="this.style.display='none'" alt="EDPS logo" />
        </div>
        <div style="position:absolute;top:35%;left:52%;right:0;z-index:3;text-align:center;">
          <div style="font-size:3rem;font-weight:900;color:white;letter-spacing:5px;">PEDRRA</div>
        </div>
        <div style="position:absolute;top:32%;left:16%;width:30%;z-index:2;">
          <div style="color:var(--edps-blue);font-size:1.3rem;font-weight:900;line-height:1.3;">{{ currentSlide.title }}</div>
          <div v-if="currentSlide.subtitle" style="color:#666;font-size:0.85rem;margin-top:0.6rem;">{{ currentSlide.subtitle }}</div>
        </div>
      </div>

      <!-- SECTION SLIDE -->
      <div v-else-if="currentSlide.type === 'section'" style="position:relative;width:100%;height:100%;background-image:url('/template/section_bg.png');background-size:cover;overflow:hidden;">
        <div style="position:absolute;top:35%;left:8%;width:42%;padding:1.5rem 2rem;background:var(--edps-blue,#3B5998);">
          <div style="color:white;font-weight:bold;font-size:1.6rem;line-height:1.3;">{{ currentSlide.title }}</div>
          <div v-if="currentSlide.subtitle" style="color:rgba(255,255,255,0.8);font-size:0.95rem;margin-top:0.5rem;">{{ currentSlide.subtitle }}</div>
        </div>
      </div>

      <!-- CONTENT / POLL / SURVEY / TIMER / RATING -->
      <template v-else>
        <div style="display:flex;align-items:center;padding:0.9rem 2rem 0.7rem;flex-shrink:0;">
          <img src="/template/edps_logo.png" style="height:46px;margin-right:1rem;" onerror="this.style.display='none'" alt="EDPS logo" />
          <h2 style="margin:0;font-size:1.5rem;font-weight:900;color:var(--edps-blue);">{{ currentSlide.title }}</h2>
        </div>
        <div style="padding:1rem 2rem 4rem;flex:1;overflow-y:auto;position:relative;">
          <div v-if="currentSlide.subtitle" style="color:var(--edps-blue);font-size:1.1rem;font-weight:bold;margin-bottom:1rem;">{{ currentSlide.subtitle }}</div>

          <!-- Content with canvas elements -->
          <template v-if="currentSlide.type === 'content'">
            <template v-if="currentSlide.elements && currentSlide.elements.length">
              <div style="position:relative;width:100%;padding-bottom:56.25%;overflow:hidden;">
                <div style="position:absolute;inset:0;transform-origin:top left;" :style="{transform:'scale('+(contentAreaWidth/1024)+')'}">
                  <div style="position:relative;width:1024px;height:576px;">
                    <div v-for="el in currentSlide.elements" :key="el.id" :style="{position:'absolute',left:el.x+'px',top:el.y+'px',width:el.w+'px',height:el.h+'px',overflow:'hidden',zIndex:el.zIndex||10,opacity:el.opacity??1,transform:el.rotation?`rotate(${el.rotation}deg)`:'none'}">
                      <span v-if="el.kind==='text'" :style="{fontSize:(el.fontSize||18)+'px',fontFamily:el.fontFamily||'Segoe UI',fontWeight:el.bold?'bold':'normal',fontStyle:el.italic?'italic':'normal',textDecoration:el.underline?'underline':'none',color:el.color||'#333',textAlign:el.textAlign||'left',display:'block',lineHeight:1.4,wordWrap:'break-word',whiteSpace:'pre-wrap'}" v-html="renderMd(el.content)"></span>
                      <img v-if="el.kind==='image'" :src="resolveUrl(el.src)" style="width:100%;height:100%;object-fit:contain;" alt="Slide element" />
                      <div v-if="el.kind==='shape'" :style="shapeStyle(el)"></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div v-if="currentSlide.content" style="line-height:1.8;font-size:1.05rem;" v-html="renderMd(currentSlide.content)"></div>
              <div v-if="currentSlide.image" style="text-align:center;"><img :src="resolveUrl(currentSlide.image)" style="max-width:100%;max-height:350px;border-radius:6px;" alt="Slide image" /></div>
            </template>
          </template>

          <!-- Poll results -->
          <template v-if="currentSlide.type === 'poll'">
            <div style="font-weight:bold;font-size:1.3rem;color:var(--edps-blue);margin-bottom:1rem;">{{ currentSlide.question }}</div>
            <div v-if="pollResults.length > 0">
              <div v-for="opt in currentSlide.options" :key="opt" style="margin-bottom:0.8rem;">
                <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:0.95rem;">
                  <span>{{ opt }}</span>
                  <span style="color:#64748b;">{{ pollAggregated[opt]||0 }}</span>
                </div>
                <div style="background:#e2e8f0;height:20px;border-radius:10px;overflow:hidden;margin-top:0.3rem;">
                  <div :style="{width:getPct(pollAggregated[opt])+'%',height:'100%',background:currentSlide.correctOption===opt?'#10b981':'var(--edps-gold)',borderRadius:'10px',transition:'width 0.5s'}"></div>
                </div>
              </div>
            </div>
            <div v-else style="padding:1.5rem;background:#e0f2fe;color:var(--edps-blue);font-weight:bold;border-radius:8px;text-align:center;font-size:1.2rem;">
              Voting in progress... {{ pollProgress.answered }} / {{ pollProgress.total }}
            </div>
          </template>

          <!-- Timer -->
          <template v-if="currentSlide.type === 'timer'">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:300px;">
              <div style="position:relative;width:300px;height:300px;">
                <svg viewBox="0 0 200 200" style="width:100%;height:100%;transform:rotate(-90deg);">
                  <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(200,200,200,0.3)" stroke-width="8" />
                  <circle cx="100" cy="100" r="88" fill="none" :stroke="timerSeconds<=10&&timerRunning?'#ef4444':'var(--edps-blue)'" stroke-width="8" stroke-linecap="round" :stroke-dasharray="553" :stroke-dashoffset="553-(553*timerProgress)" style="transition:stroke-dashoffset 1s linear;" />
                </svg>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
                  <div :style="{fontSize:'4rem',fontWeight:'bold',color:timerSeconds<=10&&timerRunning?'#ef4444':'var(--edps-blue)',letterSpacing:'3px'}">{{ timerDisplay }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Bottom corner -->
        <div class="edps-corner-graphics">
          <div class="edps-corner-circle">{{ currentSlideNumber }}</div>
        </div>
      </template>

      <!-- Drawing overlay (receive-only) -->
      <DrawingOverlay :strokes="drawStrokes" :pointer="drawPointer" />
    </div>

    <!-- ═══ TRAINER OVERLAY (wheel result, leaderboard) ═══ -->
    <div v-if="overlay" style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);animation:overlayFadeIn 0.3s ease-out;">
      <div v-if="overlay.type==='wheel' && overlay.data" style="text-align:center;animation:podiumRise 0.5s ease-out;">
        <div style="font-size:5rem;margin-bottom:1rem;">🎉</div>
        <div v-if="overlay.data.avatar" style="margin:0 auto 1rem;"><img :src="resolveUrl(overlay.data.avatar)" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid var(--edps-gold);" alt="Winner avatar" /></div>
        <div style="font-size:3rem;font-weight:900;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.5);">{{ overlay.data.display_name }}</div>
        <div style="font-size:1.5rem;color:var(--edps-gold);margin-top:0.5rem;font-weight:bold;">Selected!</div>
      </div>
      <div v-if="overlay.type==='leaderboard' && Array.isArray(overlay.data)" style="background:white;border-radius:24px;padding:2.5rem;width:85%;max-width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <h2 style="margin:0 0 1.5rem;text-align:center;color:var(--edps-blue);font-size:2.5rem;">🏆 Leaderboard</h2>
        <div v-if="overlay.data.length >= 1" class="podium-container">
          <div v-if="overlay.data[1]" class="podium-place silver"><div class="podium-rank">🥈</div><div class="podium-name">{{ overlay.data[1].display_name || overlay.data[1].username }}</div><div class="podium-points">{{ overlay.data[1].total_points || 0 }} pts</div></div>
          <div class="podium-place gold"><div class="podium-rank">🥇</div><div class="podium-name">{{ overlay.data[0].display_name || overlay.data[0].username }}</div><div class="podium-points">{{ overlay.data[0].total_points || 0 }} pts</div></div>
          <div v-if="overlay.data[2]" class="podium-place bronze"><div class="podium-rank">🥉</div><div class="podium-name">{{ overlay.data[2].display_name || overlay.data[2].username }}</div><div class="podium-points">{{ overlay.data[2].total_points || 0 }} pts</div></div>
        </div>
        <div v-for="(e, i) in (overlay.data || []).slice(3)" :key="i" style="display:flex;align-items:center;gap:1rem;padding:0.6rem 1rem;margin-bottom:0.4rem;background:#f8fafc;border-radius:8px;">
          <span style="width:28px;text-align:center;font-weight:bold;color:#94a3b8;font-size:1.1rem;">{{ i+4 }}</span>
          <span style="flex:1;font-weight:600;font-size:1.05rem;">{{ e.display_name || e.username }}</span>
          <span style="font-weight:bold;color:var(--edps-blue);font-size:1.1rem;">{{ e.total_points || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Clock -->
    <div style="position:fixed;top:1rem;right:1.5rem;font-size:1.4rem;font-weight:bold;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.8);z-index:100;font-variant-numeric:tabular-nums;">{{ currentTime }}</div>

    <!-- Slide counter -->
    <div style="position:fixed;bottom:0.5rem;left:1rem;color:rgba(255,255,255,0.4);font-size:0.8rem;z-index:100;">
      Slide {{ currentSlideNumber }} / {{ slides.length }} · Projector Mode
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { baseUrl } from '../config.js';
import { getUser, getToken, getTokenForRole, clearAuth } from '../auth.js';
import { renderMarkdown } from '../utils/safeMd.js';
import DrawingOverlay from './DrawingOverlay.vue';

const W = 1024, H = 576;
export default {
  components: { DrawingOverlay },
  data() {
    return {
      slides: [],
      currentSlideId: null,
      isSlideVisible: false,
      socket: null,
      scale: 1,
      currentTime: '',
      clockInterval: null,
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null,
      pollResults: [],
      pollProgress: { answered: 0, total: 0 },
      _prevSlideId: null,
      overlay: null, // { type: 'wheel'|'leaderboard', data: ... }
      drawStrokes: [],
      drawPointer: { x: 0, y: 0, visible: false },
    };
  },
  computed: {
    currentSlide() {
      return this.slides.find(s => s.id === this.currentSlideId) || null;
    },
    currentSlideNumber() {
      return this.slides.findIndex(s => s.id === this.currentSlideId) + 1;
    },
    contentAreaWidth() { return Math.round(940 * this.scale); },
    slideTransform() {
      return {
        transform: `translate(-50%, -50%) scale(${this.scale})`,
        position: 'absolute', top: '50%', left: '50%',
        width: `${W}px`, height: `${H}px`, transformOrigin: 'center center',
      };
    },
    timerDisplay() {
      const s = Math.max(0, this.timerSeconds);
      return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    },
    timerProgress() {
      const dur = this.currentSlide?.duration || 300;
      return dur > 0 ? Math.max(0, Math.min(1, this.timerSeconds / dur)) : 1;
    },
    pollAggregated() {
      const c = {};
      for (const r of this.pollResults) c[r.answer] = (c[r.answer]||0) + 1;
      return c;
    },
    totalPollAnswers() { return this.pollResults.length; },
  },
  async mounted() {
    const user = getUser();
    if (!user || user.role !== 'Trainer') { this.$router.push('/'); return; }

    try {
      const r = await fetch(`${baseUrl}/api/slides`);
      if (r.ok) this.slides = await r.json();
    } catch(e) { /* ignore */ }

    this.socket = io(baseUrl, { auth: { token: getTokenForRole('Trainer') || getToken() }, reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 50 });
    this.socket.on('connect_error', (err) => {
      if (err.message.includes('Authentication')) { clearAuth(); this.$router.push('/'); }
    });

    this.socket.on('slide:current', (id) => {
      if (this.currentSlideId !== id) {
        // Cleanup previous slide listeners
        if (this._prevSlideId) {
          this.socket.off(`poll:results:${this._prevSlideId}`);
          this.socket.off(`poll:results:trainer:${this._prevSlideId}`);
          this.socket.off(`poll:progress:trainer:${this._prevSlideId}`);
          this.socket.off(`timer:update:${this._prevSlideId}`);
        }
        this.pollResults = [];
        this.pollProgress = { answered: 0, total: 0 };
        this.drawStrokes = []; // Clear drawings on slide change
        clearInterval(this.timerInterval);
      }
      this.currentSlideId = id;
      this._prevSlideId = id;
      // Poll listeners
      this.socket.on(`poll:results:${id}`, rows => { this.pollResults = rows; });
      this.socket.on(`poll:results:trainer:${id}`, rows => { this.pollResults = rows; });
      this.socket.on(`poll:progress:trainer:${id}`, p => { this.pollProgress = p; });
      // Timer listener
      this.socket.on(`timer:update:${id}`, state => this._handleTimer(state));
      this.socket.emit('timer:get', id);
      this.socket.emit('poll:getResults', id);
    });

    this.socket.on('slide:visibility', v => { this.isSlideVisible = v; });
    this.socket.on('slides:updated', s => { if (Array.isArray(s)) this.slides = s; });

    // Drawing events
    this.socket.on('draw:stroke', s => { this.drawStrokes = [...this.drawStrokes, s]; });
    this.socket.on('draw:clear', () => { this.drawStrokes = []; });
    this.socket.on('draw:pointer', p => { this.drawPointer = p; });

    // Overlay events (wheel, leaderboard)
    this.socket.on('overlay:show', (data) => { this.overlay = data; });
    this.socket.on('overlay:hide', () => { this.overlay = null; });

    // Clock
    const tick = () => { this.currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick(); this.clockInterval = setInterval(tick, 1000);

    // Scale
    window.addEventListener('resize', this.computeScale);
    this.computeScale();
  },
  unmounted() {
    if (this.socket) this.socket.disconnect();
    clearInterval(this.clockInterval);
    clearInterval(this.timerInterval);
    window.removeEventListener('resize', this.computeScale);
  },
  methods: {
    computeScale() {
      this.scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.98;
    },
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    renderMd(text) { return text ? renderMarkdown(text) : ''; },
    shapeStyle(el) {
      const base = { width:'100%', height:'100%', background: el.fill||'#254A9A', border:`${el.strokeWidth||0}px solid ${el.stroke||'#000'}` };
      if (el.shape==='circle') base.borderRadius='50%';
      else if (el.shape==='roundrect') base.borderRadius='12px';
      else if (el.shape==='line') { base.height=`${el.strokeWidth||3}px`; base.borderRadius='2px'; base.marginTop=(el.h/2-1)+'px'; base.border='none'; }
      else if (el.shape==='arrow') { base.clipPath='polygon(0 30%,70% 30%,70% 0,100% 50%,70% 100%,70% 70%,0 70%)'; base.border='none'; }
      return base;
    },
    getPct(count) { return this.totalPollAnswers > 0 ? (count||0)/this.totalPollAnswers*100 : 0; },
    _handleTimer(state) {
      clearInterval(this.timerInterval);
      if (!state) { this.timerSeconds = 0; this.timerRunning = false; return; }
      if (state.paused) {
        this.timerSeconds = Math.max(0, state.duration - Math.floor((state.pausedAt - state.startTime)/1000));
        this.timerRunning = false;
      } else {
        this.timerSeconds = Math.max(0, state.duration - Math.floor((Date.now() - state.startTime)/1000));
        this.timerRunning = this.timerSeconds > 0;
        if (this.timerRunning) {
          this.timerInterval = setInterval(() => {
            if (this.timerSeconds > 0) { this.timerSeconds--; if (this.timerSeconds===0) { this.timerRunning=false; clearInterval(this.timerInterval); } }
            else { clearInterval(this.timerInterval); }
          }, 1000);
        }
      }
    },
  },
};
</script>
