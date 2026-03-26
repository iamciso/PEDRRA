<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h3 style="margin: 0;">Survey & Poll Results</h3>
      <button class="secondary" @click="fetchAll" style="width: auto; padding: 0.5rem 1rem;">Refresh</button>
    </div>

    <div v-if="slides.length === 0" style="color: #64748b;">No slides loaded.</div>

    <div v-for="slide in interactiveSlides" :key="slide.id" style="margin-bottom: 2rem; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
      <div style="background: var(--primary); color: white; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">{{ slide.title }} <span style="opacity: 0.7; font-size: 0.85rem;">({{ slide.type.toUpperCase() }})</span></span>
        <div>
          <button @click="resetSlideVotes(slide.id)" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem; cursor: pointer;">🔄 Reset All Votes</button>
          <button v-if="slide.type === 'survey'" @click="exportCSV(slide)" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem; cursor: pointer;">⬇ CSV</button>
          <button v-if="slide.type === 'survey'" @click="exportJSON(slide)" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">⬇ JSON</button>
        </div>
      </div>

      <div style="padding: 1rem 1.5rem;">
        <!-- Poll results -->
        <template v-if="slide.type === 'poll'">
          <div v-if="getAnswers(slide.id).length === 0" style="color: #64748b; font-style: italic;">No responses yet.</div>
          <div v-else>
            <div v-for="opt in slide.options" :key="opt" style="margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: bold; margin-bottom: 0.3rem;">
                <span :style="{ color: slide.correctOption === opt ? '#10b981' : '' }">{{ opt }} <span v-if="slide.correctOption === opt" style="font-size: 0.75rem; background: #10b981; color: white; padding: 1px 5px; border-radius: 3px;">Correct</span></span>
                <span>{{ countVotes(slide.id, opt) }} / {{ getAnswers(slide.id).length }}</span>
              </div>
              <div style="background: #e2e8f0; height: 18px; border-radius: 9px; overflow: hidden;">
                <div style="height: 100%; border-radius: 9px; transition: width 0.4s;"
                  :style="{ width: getPct(slide.id, opt) + '%', background: slide.correctOption === opt ? '#10b981' : 'var(--secondary)' }"></div>
              </div>
            </div>
            <!-- Per-user reset -->
            <div style="margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
              <div style="font-size: 0.8rem; font-weight: bold; color: #64748b; margin-bottom: 0.5rem;">Individual Responses:</div>
              <div v-for="row in getAnswers(slide.id)" :key="row.username" style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;">
                <span><strong>{{ row.username }}</strong>: {{ row.answer }}</span>
                <button @click="resetUserVote(slide.id, row.username)" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Reset</button>
              </div>
            </div>
          </div>
        </template>

        <!-- Survey results -->
        <template v-if="slide.type === 'survey'">
          <div v-if="getSurveyResults(slide).length === 0" style="color: #64748b; font-style: italic;">No responses yet.</div>
          <template v-else>
            <!-- Rating summary charts -->
            <div v-for="(q, qi) in (slide.questions||[])" :key="'chart-'+qi">
              <div v-if="q.type === 'rating'" style="margin-bottom:1.5rem;padding:1rem;background:#f8fafc;border-radius:8px;">
                <div style="font-weight:bold;font-size:0.9rem;color:var(--primary);margin-bottom:0.75rem;">📊 {{ q.text }}</div>
                <div style="display:flex;align-items:flex-end;gap:6px;height:80px;">
                  <div v-for="n in 5" :key="n" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <div :style="{width:'100%',background: n<=2?'#ef4444':n===3?'#f59e0b':'#10b981',borderRadius:'4px 4px 0 0',height: getRatingPct(slide,qi,n)+'%',minHeight:'4px',transition:'height 0.4s'}"></div>
                    <span style="font-size:0.75rem;font-weight:bold;">{{ n }}</span>
                    <span style="font-size:0.65rem;color:#94a3b8;">{{ getRatingCount(slide,qi,n) }}</span>
                  </div>
                </div>
                <div style="text-align:center;margin-top:0.5rem;font-size:0.8rem;color:#64748b;">
                  Avg: <strong style="color:var(--primary);">{{ getRatingAvg(slide,qi) }}</strong> / 5
                </div>
              </div>
            </div>
            <!-- Response table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color);">
                  <th style="padding: 0.4rem; color: var(--primary); text-align: left;">User</th>
                  <th v-for="(q, i) in slide.questions" :key="i" style="padding: 0.4rem; color: var(--primary); text-align: left;">Q{{ i+1 }}: {{ q.text ? q.text.substring(0, 30) : '' }}...</th>
                  <th style="padding: 0.4rem; color: var(--primary);">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in getSurveyResults(slide)" :key="r.username" style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 0.4rem;"><strong>{{ r.username }}</strong></td>
                  <td v-for="(q, i) in slide.questions" :key="i" style="padding: 0.4rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="String(r.answers[i] || '')">{{ r.answers[i] }}</td>
                  <td style="padding: 0.4rem; text-align: center;">
                    <button @click="resetUserVote(slide.id, r.username)" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Reset</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';
import { authFetch } from '../auth.js';

export default {
  props: ['slides'],
  data() {
    return { allAnswers: [] };
  },
  computed: {
    interactiveSlides() {
      return this.slides.filter(s => s.type === 'poll' || s.type === 'survey');
    },
  },
  mounted() { this.fetchAll(); },
  methods: {
    async fetchAll() {
      try {
        const res = await authFetch(`${baseUrl}/api/surveys/results`);
        this.allAnswers = await res.json();
      } catch (e) { console.error(e); }
    },
    getAnswers(slideId) {
      return this.allAnswers.filter(a => String(a.slide_id) === String(slideId));
    },
    countVotes(slideId, opt) {
      return this.getAnswers(slideId).filter(a => a.answer === opt).length;
    },
    getPct(slideId, opt) {
      const total = this.getAnswers(slideId).length;
      if (!total) return 0;
      return (this.countVotes(slideId, opt) / total) * 100;
    },
    getSurveyResults(slide) {
      return this.getAnswers(slide.id).map(a => {
        let ans = {};
        try { ans = JSON.parse(a.answer); } catch(e) {}
        return { username: a.username, answers: ans };
      });
    },
    async resetUserVote(slideId, username) {
      if (!confirm(`Reset vote for ${username} on slide ${slideId}?`)) return;
      try {
        await authFetch(`${baseUrl}/api/answers/${slideId}/${encodeURIComponent(username)}`, { method: 'DELETE' });
        this.fetchAll();
      } catch(e) { console.error(e); }
    },
    async resetSlideVotes(slideId) {
      if (!confirm('Reset ALL votes for this slide?')) return;
      try {
        await authFetch(`${baseUrl}/api/answers/${slideId}`, { method: 'DELETE' });
        this.fetchAll();
      } catch(e) { console.error(e); }
    },
    exportCSV(slide) {
      const results = this.getSurveyResults(slide);
      if (!results.length) return alert('No responses yet to export.');
      const qs = slide.questions || [];
      const headers = ['User', ...qs.map(q => `"${(q.text || '').replace(/"/g, '""')}"`)].join(',');
      const rows = results.map(r =>
        [r.username, ...qs.map((q, i) => `"${String(r.answers[i] ?? '').replace(/"/g, '""')}"`)].join(',')
      );
      const csv = [headers, ...rows].join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      link.download = `${slide.title.replace(/[^a-z0-9]/gi, '_')}_results.csv`;
      link.click();
    },
    getRatingCount(slide, qi, n) {
      const results = this.getSurveyResults(slide);
      return results.filter(r => Number(r.answers[qi]) === n).length;
    },
    getRatingPct(slide, qi, n) {
      const total = this.getSurveyResults(slide).length;
      if (!total) return 0;
      return (this.getRatingCount(slide, qi, n) / total) * 100;
    },
    getRatingAvg(slide, qi) {
      const results = this.getSurveyResults(slide);
      if (!results.length) return '—';
      const sum = results.reduce((acc, r) => acc + (Number(r.answers[qi]) || 0), 0);
      return (sum / results.length).toFixed(1);
    },
    exportJSON(slide) {
      const link = document.createElement('a');
      link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.getSurveyResults(slide), null, 2));
      link.download = `${slide.title}_results.json`;
      link.click();
    },
  },
};
</script>
