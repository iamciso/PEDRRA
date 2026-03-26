<template>
  <div v-if="visible" style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);" @click.self="$emit('close')">
    <div style="background:white;border-radius:16px;padding:2rem;width:90%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <h2 style="margin:0 0 1.5rem;text-align:center;color:var(--edps-blue,#1b4293);">🏆 Leaderboard</h2>

      <div v-if="entries.length === 0" style="text-align:center;color:#94a3b8;padding:2rem;">No scores yet. Complete quizzes to see the ranking!</div>

      <div v-for="(entry, i) in entries" :key="entry.username" :style="{display:'flex',alignItems:'center',gap:'1rem',padding:'0.75rem 1rem',borderRadius:'10px',marginBottom:'0.5rem',background:i===0?'linear-gradient(135deg,#fef3c7,#fde68a)':i===1?'linear-gradient(135deg,#f1f5f9,#e2e8f0)':i===2?'linear-gradient(135deg,#fed7aa,#fdba74)':'#f8fafc',border:i<3?'2px solid '+(i===0?'#f59e0b':i===1?'#94a3b8':'#f97316'):'1px solid #e2e8f0'}">
        <div :style="{width:'36px',height:'36px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:i<3?'1.3rem':'0.9rem',flexShrink:0}">
          {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) }}
        </div>
        <img v-if="entry.avatar" :src="resolveUrl(entry.avatar)" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ entry.display_name || entry.username }}</div>
          <div style="font-size:0.75rem;color:#64748b;">{{ entry.total_correct || 0 }} correct</div>
        </div>
        <div style="font-size:1.3rem;font-weight:bold;color:var(--edps-blue,#1b4293);">{{ entry.total_points || 0 }}</div>
      </div>

      <div style="text-align:center;margin-top:1.5rem;">
        <button @click="$emit('close')" class="secondary" style="width:auto;padding:0.5rem 1.5rem;">Close</button>
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
  methods: {
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
  },
};
</script>
