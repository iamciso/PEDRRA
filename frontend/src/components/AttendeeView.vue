<template>
  <div ref="wrapper" style="position:fixed;inset:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;overflow:hidden;">

    <!-- Top bar -->
    <div style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:0.4rem 1.2rem;background:rgba(0,0,0,0.45);">
      <span style="color:rgba(255,255,255,0.7);font-size:0.8rem;">PEDRRA • {{ user?.username }}</span>
      <a href="#" @click.prevent="logout" style="color:var(--edps-gold,#dea133);font-weight:bold;text-decoration:none;font-size:0.8rem;">Log Out</a>
    </div>

    <!-- Clock -->
    <div v-show="isSlideVisible" style="position:fixed;top:2.6rem;right:1.4rem;z-index:99;font-size:1.35rem;font-weight:bold;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.9);letter-spacing:2px;font-variant-numeric:tabular-nums;">{{ currentTime }}</div>

    <!-- WAIT SCREEN -->
    <div v-if="!currentSlide || !isSlideVisible" class="edps-presentation" :style="slideTransform">
      <div style="background:var(--edps-blue,#1b4293);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <img src="/logo.png" style="height:75px;margin-bottom:1.5rem;opacity:0.9;" onerror="this.style.display='none'" />
        <div class="edps-wait-icon"></div>
        <h2 style="color:white;margin-top:1.5rem;font-size:1.9rem;">Please wait...</h2>
        <p style="color:rgba(255,255,255,0.65);font-size:1rem;">The instructor will start the session shortly.</p>
      </div>
    </div>

    <!-- ACTIVE SLIDE -->
    <div v-else class="edps-presentation" :style="slideTransform">

      <!-- ═══ TITLE SLIDE ═══ -->
      <div v-if="currentSlide.type === 'title'" style="position:relative;width:100%;height:100%;background:#d0cdc8;overflow:hidden;">

        <!-- Top-left white header box -->
        <div style="position:absolute;top:0;left:0;width:38%;height:42%;background:white;display:flex;flex-direction:column;padding:1.2rem 1.4rem;z-index:2;">
          <div style="display:flex;align-items:flex-start;gap:0.8rem;margin-bottom:0.6rem;">
            <img src="/logo.png" style="height:48px;" onerror="this.style.display='none'" />
            <div style="font-size:0.7rem;font-weight:900;color:var(--edps-blue,#1b4293);line-height:1.3;letter-spacing:0.5px;padding-top:2px;">EUROPEAN<br/>DATA PROTECTION<br/>SUPERVISOR</div>
          </div>
          <div style="font-size:0.65rem;color:#555;margin-top:0.3rem;font-style:italic;">The EU's independent data protection authority</div>
        </div>

        <!-- Top-right blue square + white circle decoration -->
        <div style="position:absolute;top:0;right:0;width:62%;height:42%;background:white;z-index:1;">
          <div style="position:absolute;top:0;right:0;width:70px;height:70px;background:var(--edps-blue,#1b4293);display:flex;align-items:center;justify-content:center;">
            <div style="width:42px;height:42px;background:white;border-radius:50%;"></div>
          </div>
        </div>

        <!-- Bottom-left GOLD section: training title -->
        <div style="position:absolute;bottom:0;left:0;width:35%;height:58%;background:var(--edps-gold,#dea133);padding:1.5rem;display:flex;flex-direction:column;justify-content:center;">
          <div style="color:white;font-size:1rem;font-weight:700;line-height:1.5;font-style:italic;letter-spacing:0.5px;white-space:pre-wrap;">{{ currentSlide.title }}</div>
          <div style="color:rgba(255,255,255,0.9);font-size:0.78rem;margin-top:1rem;font-style:italic;">{{ currentSlide.subtitle }}</div>
        </div>

        <!-- Bottom-right BLUE section: code + binary pattern -->
        <div style="position:absolute;bottom:0;right:0;width:65%;height:58%;background:var(--edps-blue,#1b4293);overflow:hidden;">
          <!-- Binary pattern overlay -->
          <div style="position:absolute;inset:0;font-size:9px;font-family:monospace;color:rgba(255,255,255,0.18);line-height:1.4;word-break:break-all;padding:0.5rem;overflow:hidden;user-select:none;pointer-events:none;">{{ binaryPattern }}</div>
          <!-- Training code -->
          <div style="position:absolute;bottom:2rem;right:1.5rem;left:1rem;display:flex;align-items:center;gap:0.8rem;">
            <div style="width:48px;height:48px;border:2px solid rgba(255,255,255,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;font-weight:bold;text-align:center;">🛡</div>
            <div style="font-size:2rem;font-weight:900;color:white;letter-spacing:3px;">PEDRRA</div>
          </div>
          <div v-if="currentSlide.content" style="position:absolute;top:1.2rem;left:1rem;right:1rem;color:rgba(255,255,255,0.8);font-size:0.75rem;">{{ currentSlide.content }}</div>
        </div>

        <!-- Bottom strip -->
        <div style="position:absolute;bottom:0;left:35%;right:0;height:2.2rem;background:rgba(0,0,0,0.25);display:flex;align-items:center;padding:0 1rem;">
          <span style="color:rgba(255,255,255,0.8);font-size:0.65rem;">Systems Oversight and Technology Audits Sector, and Privacy Unit</span>
        </div>

        <!-- Overlaid image if present -->
        <div v-if="currentSlide.image" style="position:absolute;top:42%;left:38%;transform:translate(-50%,-50%);max-width:150px;z-index:5;">
          <img :src="resolveUrl(currentSlide.image)" style="max-width:100%;border-radius:4px;" />
        </div>
      </div>

      <!-- ═══ SECTION TITLE SLIDE ═══ -->
      <div v-else-if="currentSlide.type === 'section'" style="position:relative;width:100%;height:100%;background:#d0cdc8;overflow:hidden;">
        <div style="position:absolute;inset:0;font-size:9px;font-family:monospace;color:rgba(100,100,100,0.2);line-height:1.4;word-break:break-all;padding:0.5rem;overflow:hidden;user-select:none;pointer-events:none;">{{ binaryPattern }}</div>
        <!-- Blue square + white circle - top left -->
        <div style="position:absolute;top:0;left:0;width:90px;height:90px;background:var(--edps-blue,#1b4293);display:flex;align-items:center;justify-content:center;">
          <div style="width:55px;height:55px;background:white;border-radius:50%;"></div>
        </div>
        <!-- Gold arc top-center -->
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:180px;height:90px;background:var(--edps-gold,#dea133);border-radius:0 0 90px 90px;"></div>
        <!-- White box with empty space top-right -->
        <div style="position:absolute;top:0;right:0;width:35%;height:40%;background:white;opacity:0.85;"></div>
        <!-- Main title box center-left -->
        <div style="position:absolute;top:35%;left:8%;width:42%;padding:1.5rem 2rem;background:var(--edps-blue,#1b4293);">
          <div style="color:white;font-weight:bold;font-size:1.6rem;line-height:1.3;">{{ currentSlide.title }}</div>
          <div v-if="currentSlide.subtitle" style="color:rgba(255,255,255,0.8);font-size:0.95rem;margin-top:0.5rem;">{{ currentSlide.subtitle }}</div>
        </div>
        <!-- Gold bottom-left rectangle -->
        <div style="position:absolute;bottom:0;left:0;width:28%;height:30%;background:var(--edps-gold,#dea133);opacity:0.85;"></div>
        <!-- Slide number -->
        <div style="position:absolute;bottom:1rem;right:1rem;color:var(--edps-blue,#1b4293);font-size:0.8rem;font-weight:bold;">{{ currentSlideNumber }}</div>
      </div>

      <!-- ═══ CONTENT / POLL / SURVEY ═══ -->
      <template v-else>
        <!-- Header: logo + title (matches EDPS reference) -->
        <div style="display:flex;align-items:center;padding:0.9rem 2rem 0.7rem;border-bottom:1px solid #e8e8e8;flex-shrink:0;">
          <img src="/logo.png" style="height:42px;margin-right:1.1rem;" onerror="this.style.display='none'" />
          <h2 style="margin:0;font-size:1.6rem;font-weight:900;color:var(--edps-blue,#1b4293);">{{ currentSlide.title }}</h2>
        </div>

        <div style="padding:1rem 2rem 4rem;flex:1;overflow-y:auto;position:relative;">
          <div v-if="currentSlide.subtitle" style="color:var(--edps-blue,#1b4293);font-size:1.1rem;font-weight:bold;margin-bottom:1rem;">{{ currentSlide.subtitle }}</div>

          <!-- Content: visual elements or legacy -->
          <template v-if="currentSlide.type === 'content'">
            <template v-if="currentSlide.elements && currentSlide.elements.length">
              <div v-for="el in currentSlide.elements" :key="el.id" :style="elStyle(el)">
                <span v-if="el.kind==='text'" :style="textStyle(el)">{{ el.content }}</span>
                <img v-if="el.kind==='image'" :src="resolveUrl(el.src)" style="width:100%;height:100%;object-fit:contain;" />
                <iframe v-if="el.kind==='video'" :src="el.src" style="width:100%;height:100%;border:none;" frameborder="0" allowfullscreen></iframe>
              </div>
            </template>
            <template v-else>
              <div style="white-space:pre-wrap;line-height:1.8;font-size:1.05rem;color:#333;">{{ currentSlide.content }}</div>
              <div v-if="currentSlide.image" style="margin-top:1rem;text-align:center;"><img :src="resolveUrl(currentSlide.image)" style="max-width:100%;max-height:270px;border-radius:6px;" /></div>
              <div v-if="currentSlide.video" style="margin-top:1rem;"><iframe :src="currentSlide.video" style="width:100%;height:260px;border-radius:6px;border:none;" frameborder="0" allowfullscreen></iframe></div>
            </template>
          </template>

          <!-- Poll -->
          <template v-if="currentSlide.type === 'poll'">
            <div style="font-weight:bold;margin-bottom:1rem;font-size:1.1rem;color:var(--edps-blue,#1b4293);">{{ currentSlide.question }}</div>
            <div v-if="publishedResults">
              <div v-for="opt in currentSlide.options" :key="opt" style="margin-bottom:0.85rem;">
                <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:0.3rem;font-size:0.95rem;">
                  <span :style="{color:currentSlide.correctOption===opt?'#10b981':'inherit'}">{{ opt }} <span v-if="currentSlide.correctOption===opt" style="background:#10b981;color:white;padding:1px 5px;border-radius:3px;font-size:0.72rem;margin-left:0.3rem;">✓</span></span>
                  <span style="color:#64748b;font-size:0.85rem;">{{ publicPollAggregated[opt]||0 }} votes</span>
                </div>
                <div style="background:#e8e8e8;height:18px;border-radius:9px;overflow:hidden;">
                  <div style="height:100%;border-radius:9px;transition:width 0.6s;" :style="{width:getPct(publicPollAggregated[opt])+'%',background:currentSlide.correctOption===opt?'#10b981':'var(--edps-gold,#dea133)'}"></div>
                </div>
              </div>
            </div>
            <div v-else-if="hasAnswered" style="padding:1.2rem;background:#e0f2fe;color:var(--edps-blue,#1b4293);font-weight:bold;border-left:4px solid var(--edps-blue,#1b4293);border-radius:0 6px 6px 0;">✅ Your answer was recorded. Waiting for all participants...</div>
            <div v-else style="display:flex;flex-direction:column;gap:0.6rem;">
              <button v-for="opt in currentSlide.options" :key="opt" @click="submitPollAnswer(opt)"
                style="background:white;color:var(--edps-blue,#1b4293);border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;"
                @mouseover="$event.target.style.cssText='background:var(--edps-blue,#1b4293);color:white;border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;'"
                @mouseout="$event.target.style.cssText='background:white;color:var(--edps-blue,#1b4293);border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;'"
              >{{ opt }}</button>
            </div>
          </template>

          <!-- Survey — DO NOT put inside a scaled container, render normally. React form inputs work perfectly here -->
          <template v-if="currentSlide.type === 'survey'">
            <div style="margin-bottom:1rem;font-size:0.92rem;color:#555;">{{ currentSlide.description }}</div>
            <div v-if="publishedResults" style="padding:1.2rem;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:7px;font-weight:bold;">✅ Survey Complete! Thank you for your responses.</div>
            <div v-else-if="hasAnswered" style="padding:1.2rem;background:#e0f2fe;color:var(--edps-blue,#1b4293);font-weight:bold;border-left:4px solid var(--edps-blue,#1b4293);">✅ Your responses were submitted. Waiting for the session to close...</div>
            <form v-else @submit.prevent="submitSurvey" style="display:flex;flex-direction:column;gap:0.7rem;">
              <div v-for="(q, qi) in currentSlide.questions" :key="qi" style="padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                <label style="display:block;font-weight:bold;margin-bottom:0.5rem;color:var(--edps-blue,#1b4293);font-size:0.9rem;">{{ q.text || q }}</label>
                <textarea v-if="q.type==='text'||!q.type" v-model="surveyForm[qi]" rows="2" required style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;resize:vertical;font-size:0.88rem;box-sizing:border-box;"></textarea>
                <div v-if="q.type==='rating'" style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:0.3rem;">
                  <label v-for="n in 5" :key="n" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;font-weight:bold;font-size:1rem;">
                    <input type="radio" :value="n" v-model="surveyForm[qi]" required style="width:18px;height:18px;margin-bottom:0.2rem;" />{{ n }}
                  </label>
                </div>
                <select v-if="q.type==='choice'" v-model="surveyForm[qi]" required style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.88rem;">
                  <option value="" disabled>Select an option...</option>
                  <option v-for="opt in q.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <button type="submit" style="background:var(--edps-blue,#1b4293);color:white;border:none;padding:0.75rem;font-size:0.95rem;border-radius:6px;cursor:pointer;font-weight:bold;">Submit Response</button>
            </form>
          </template>
        </div>

        <!-- Bottom bar with decorations -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:38px;background:#e6e6e6;flex-shrink:0;"></div>
        <div class="edps-corner-graphics">
          <div class="edps-corner-gold-arc"></div>
          <div class="edps-corner-circle">{{ currentSlideNumber }}</div>
        </div>
      </template>

    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { baseUrl } from '../config.js';

const W = 1024, H = 576;

export default {
  data() {
    return {
      slides: [],
      currentSlideId: null,
      isSlideVisible: false,
      user: null,
      socket: null,
      answeredPolls: {},
      surveyForm: {},
      publishedResults: null,
      currentTime: '',
      clockInterval: null,
      scale: 1,
      binaryPattern: '',
    };
  },
  computed: {
    // IMPORTANT: returns a COPY, never mutates the source array
    currentSlide() {
      const s = this.slides.find(s => s.id === this.currentSlideId);
      if (!s) return null;
      if (s.type === 'survey' && Array.isArray(s.questions)) {
        return {
          ...s,
          questions: s.questions.map(q =>
            typeof q === 'string' ? { text: q, type: 'text', options: [] } : q
          ),
        };
      }
      return s;
    },
    currentSlideNumber() {
      return this.slides.findIndex(s => s.id === this.currentSlideId) + 1;
    },
    hasAnswered() {
      return !!this.answeredPolls[this.currentSlideId];
    },
    publicPollAggregated() {
      const counts = {};
      if (!Array.isArray(this.publishedResults)) return counts;
      for (const r of this.publishedResults) counts[r.answer] = (counts[r.answer] || 0) + 1;
      return counts;
    },
    totalPublicAnswers() {
      return Array.isArray(this.publishedResults) ? this.publishedResults.length : 0;
    },
    slideTransform() {
      return {
        transform: `translate(-50%, -50%) scale(${this.scale})`,
        position: 'absolute', top: '50%', left: '50%',
        width: `${W}px`, height: `${H}px`,
        transformOrigin: 'center center',
      };
    },
  },
  async mounted() {
    this.user = JSON.parse(localStorage.getItem('user'));
    if (!this.user || this.user.role !== 'Attendee') { this.$router.push('/'); return; }

    // Generate binary pattern once
    let bp = '';
    for (let i = 0; i < 900; i++) bp += ((i * 7 + 3) % 11 < 5 ? '1' : '0');
    this.binaryPattern = bp;

    try {
      const r = await fetch(`${baseUrl}/api/slides`);
      this.slides = await r.json();
    } catch(e) { console.error(e); }

    this.socket = io(baseUrl);

    this.socket.on('slide:current', (id) => {
      if (this.currentSlideId !== id) {
        if (this.currentSlideId) this.socket.off(`poll:results:${this.currentSlideId}`);
        this.surveyForm = {};
        this.publishedResults = null;
      }
      this.currentSlideId = id;
      this.socket.on(`poll:results:${id}`, rows => { this.publishedResults = rows; });
    });

    this.socket.on('slide:visibility', v => { this.isSlideVisible = v; });

    this.socket.on('poll:reset', slideId => {
      const sid = String(slideId);
      // Clear answered state for any key format
      Object.keys(this.answeredPolls).forEach(k => { if (String(k) === sid) delete this.answeredPolls[k]; });
      if (String(this.currentSlideId) === sid) {
        this.publishedResults = null;
        this.surveyForm = {};
      }
    });

    window.addEventListener('resize', this.computeScale);
    this.computeScale();
    const tick = () => { this.currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick(); this.clockInterval = setInterval(tick, 1000);
  },
  unmounted() {
    if (this.socket) this.socket.disconnect();
    window.removeEventListener('resize', this.computeScale);
    clearInterval(this.clockInterval);
  },
  methods: {
    computeScale() {
      this.scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.95;
    },
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    elStyle(el) {
      return { position: 'absolute', left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', overflow: 'hidden' };
    },
    textStyle(el) {
      return { fontSize: el.fontSize + 'px', fontFamily: el.fontFamily || 'Segoe UI', fontWeight: el.bold ? 'bold' : 'normal', fontStyle: el.italic ? 'italic' : 'normal', color: el.color || '#333', textAlign: el.textAlign || 'left', whiteSpace: 'pre-wrap', display: 'block' };
    },
    submitPollAnswer(answer) {
      if (!this.socket || !this.currentSlide) return;
      this.socket.emit('poll:answer', { slideId: this.currentSlide.id, username: this.user.username, answer });
      this.answeredPolls[this.currentSlide.id] = true;
    },
    submitSurvey() {
      if (!this.socket || !this.currentSlide) return;
      this.socket.emit('poll:answer', { slideId: this.currentSlide.id, username: this.user.username, answer: JSON.stringify(this.surveyForm) });
      this.answeredPolls[this.currentSlide.id] = true;
    },
    getPct(count) {
      if (!count || !this.totalPublicAnswers) return 0;
      return (count / this.totalPublicAnswers) * 100;
    },
    logout() { localStorage.removeItem('user'); this.$router.push('/'); },
  },
};
</script>
