<template>
  <div v-if="visible" style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);" @click.self="$emit('close')">
    <div style="background:white;border-radius:16px;padding:2rem;width:90%;max-width:500px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <h2 style="margin:0 0 1.5rem;color:var(--edps-blue,#1b4293);">🎡 Spinning Wheel</h2>

      <!-- Wheel -->
      <div style="position:relative;width:300px;height:300px;margin:0 auto;">
        <div :style="{width:'100%',height:'100%',borderRadius:'50%',border:'4px solid var(--edps-blue,#1b4293)',overflow:'hidden',transition:spinning?'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)':'none',transform:'rotate('+rotation+'deg)'}">
          <div v-for="(att, i) in attendees" :key="att.username" :style="wedgeStyle(i)" class="wheel-wedge">
            <span :style="{transform:'rotate('+(90+360/attendees.length/2)+'deg)',display:'block',fontSize:attendees.length>10?'0.6rem':'0.75rem',fontWeight:'bold',color:'white',textShadow:'1px 1px 2px rgba(0,0,0,0.5)',maxWidth:'60px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}">{{ att.display_name || att.username }}</span>
          </div>
        </div>
        <!-- Pointer -->
        <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:24px solid #e11d48;z-index:10;"></div>
      </div>

      <!-- Winner display -->
      <div v-if="winner" style="margin-top:1.5rem;padding:1rem;background:#f0fdf4;border:2px solid #10b981;border-radius:12px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:1rem;">
          <img v-if="winner.avatar" :src="resolveUrl(winner.avatar)" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--edps-gold,#dea133);" :alt="(winner.display_name || winner.username) + ' avatar'" />
          <div style="font-size:1.5rem;">🎉</div>
          <div>
            <div style="font-size:1.3rem;font-weight:bold;color:#166534;">{{ winner.display_name || winner.username }}</div>
          </div>
          <div style="font-size:1.5rem;">🎉</div>
        </div>
      </div>

      <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:center;">
        <button @click="spin" :disabled="spinning || attendees.length < 2" style="padding:0.75rem 2rem;font-size:1rem;" aria-label="Spin the wheel">🎡 Spin!</button>
        <button @click="$emit('close')" class="secondary" style="width:auto;padding:0.75rem 1.5rem;" aria-label="Close spinning wheel">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';

const COLORS = ['#1b4293', '#dea133', '#e11d48', '#059669', '#7c3aed', '#d97706', '#0891b2', '#be185d', '#4f46e5', '#ca8a04', '#0d9488', '#dc2626'];

export default {
  props: {
    visible: Boolean,
    attendees: { type: Array, default: () => [] },
  },
  emits: ['close', 'result'],
  data() {
    return { rotation: 0, spinning: false, winner: null };
  },
  methods: {
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    wedgeStyle(i) {
      const n = this.attendees.length;
      const angle = 360 / n;
      const color = COLORS[i % COLORS.length];
      return {
        position: 'absolute',
        width: '50%', height: '50%',
        top: '0', right: '0',
        transformOrigin: '0% 100%',
        transform: `rotate(${angle * i - 90}deg) skewY(${-(90 - angle)}deg)`,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      };
    },
    spin() {
      if (this.spinning || this.attendees.length < 2) return;
      this.winner = null;
      this.spinning = true;
      const extraSpins = 5 + Math.floor(Math.random() * 5);
      const winnerIdx = Math.floor(Math.random() * this.attendees.length);
      const angle = 360 / this.attendees.length;
      const targetAngle = 360 * extraSpins + (360 - angle * winnerIdx - angle / 2);
      this.rotation = targetAngle;
      setTimeout(() => {
        this.spinning = false;
        this.winner = this.attendees[winnerIdx];
        this.$emit('result', this.winner);
      }, 4200);
    },
  },
};
</script>
