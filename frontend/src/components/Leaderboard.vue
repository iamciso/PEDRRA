<template>
  <div v-if="visible" style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);" @click.self="$emit('close')">

    <!-- Confetti -->
    <div v-if="showConfetti" style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9001;">
      <div v-for="(c, i) in confettiPieces" :key="i" class="confetti-piece" :style="{left: c.x+'%', background: c.color, animationDelay: c.delay+'s', animationDuration: (2+c.speed)+'s', borderRadius: c.round?'50%':'2px', width: c.size+'px', height: c.size+'px'}"></div>
    </div>

    <div style="background:white;border-radius:16px;padding:2rem;width:90%;max-width:560px;box-shadow:0 20px 60px rgba(0,0,0,0.4);position:relative;z-index:9002;max-height:90vh;overflow-y:auto;">
      <h2 style="margin:0 0 0.5rem;text-align:center;color:var(--edps-blue,#1b4293);font-size:1.8rem;">🏆 Leaderboard</h2>

      <div v-if="entries.length === 0" style="text-align:center;color:#94a3b8;padding:2rem;">No scores yet. Complete quizzes to see the ranking!</div>

      <!-- Podium for top 3 -->
      <div v-if="entries.length >= 1" class="podium-container">
        <div v-if="entries[1]" class="podium-place silver" style="animation-delay:0.2s;">
          <div class="podium-rank">🥈</div>
          <img v-if="entries[1].avatar" :src="resolveUrl(entries[1].avatar)" class="podium-avatar" :alt="(entries[1].display_name || entries[1].username) + ' avatar'" />
          <div v-else class="podium-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">2</div>
          <div class="podium-name">{{ entries[1].display_name || entries[1].username }}</div>
          <div class="podium-points">{{ entries[1].total_points || 0 }} pts</div>
        </div>
        <div class="podium-place gold" style="animation-delay:0s;">
          <div class="podium-rank">🥇</div>
          <img v-if="entries[0].avatar" :src="resolveUrl(entries[0].avatar)" class="podium-avatar" :alt="(entries[0].display_name || entries[0].username) + ' avatar'" />
          <div v-else class="podium-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">1</div>
          <div class="podium-name">{{ entries[0].display_name || entries[0].username }}</div>
          <div class="podium-points">{{ entries[0].total_points || 0 }} pts</div>
        </div>
        <div v-if="entries[2]" class="podium-place bronze" style="animation-delay:0.4s;">
          <div class="podium-rank">🥉</div>
          <img v-if="entries[2].avatar" :src="resolveUrl(entries[2].avatar)" class="podium-avatar" :alt="(entries[2].display_name || entries[2].username) + ' avatar'" />
          <div v-else class="podium-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">3</div>
          <div class="podium-name">{{ entries[2].display_name || entries[2].username }}</div>
          <div class="podium-points">{{ entries[2].total_points || 0 }} pts</div>
        </div>
      </div>

      <!-- Rest of ranking -->
      <div v-for="(entry, i) in entries.slice(3)" :key="entry.username" :style="{display:'flex',alignItems:'center',gap:'1rem',padding:'0.6rem 1rem',borderRadius:'8px',marginBottom:'0.4rem',background:'#f8fafc',border:'1px solid #e2e8f0'}">
        <div style="width:28px;text-align:center;font-weight:bold;color:#94a3b8;font-size:0.9rem;">{{ i + 4 }}</div>
        <img v-if="entry.avatar" :src="resolveUrl(entry.avatar)" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" :alt="(entry.display_name || entry.username) + ' avatar'" />
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ entry.display_name || entry.username }}</div>
          <div style="font-size:0.7rem;color:#94a3b8;">{{ entry.total_correct || 0 }} correct</div>
        </div>
        <div style="font-size:1.1rem;font-weight:bold;color:var(--edps-blue,#1b4293);">{{ entry.total_points || 0 }}</div>
      </div>

      <div style="text-align:center;margin-top:1.5rem;">
        <button @click="$emit('close')" class="secondary" style="width:auto;padding:0.5rem 2rem;border-radius:20px;" aria-label="Close leaderboard">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';
export default {
  props: {
    visible: Boolean,
    entries: { type: Array, default: () => [] },
  },
  emits: ['close'],
  data() {
    return {
      showConfetti: false,
      confettiPieces: [],
    };
  },
  watch: {
    visible(val) {
      if (val && this.entries.length > 0) this.launchConfetti();
      else this.showConfetti = false;
    },
  },
  methods: {
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    launchConfetti() {
      const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];
      this.confettiPieces = Array.from({ length: 60 }, () => ({
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1.5,
        speed: Math.random() * 2,
        round: Math.random() > 0.5,
        size: 6 + Math.random() * 6,
      }));
      this.showConfetti = true;
      setTimeout(() => { this.showConfetti = false; }, 4000);
    },
  },
};
</script>
