<template>
  <div style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);" @click.self="$emit('close')">
    <div style="background:white;border-radius:12px;width:90%;max-width:700px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;">
        <h3 style="margin:0;color:var(--edps-blue, #1b4293);">📂 Media Library — Select a file</h3>
        <button @click="$emit('close')" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;padding:0;">✕</button>
      </div>

      <!-- Filter tabs -->
      <div style="display:flex;gap:0.5rem;padding:0.75rem 1.5rem;border-bottom:1px solid #f1f5f9;">
        <button @click="activeFilter='all'" :style="{padding:'0.3rem 0.8rem',borderRadius:'4px',border:'1px solid',fontSize:'0.85rem',cursor:'pointer',background:activeFilter==='all'?'var(--edps-blue,#1b4293)':'white',color:activeFilter==='all'?'white':'#334155',borderColor:activeFilter==='all'?'var(--edps-blue,#1b4293)':'#cbd5e1'}">All</button>
        <button @click="activeFilter='image'" :style="{padding:'0.3rem 0.8rem',borderRadius:'4px',border:'1px solid',fontSize:'0.85rem',cursor:'pointer',background:activeFilter==='image'?'var(--edps-blue,#1b4293)':'white',color:activeFilter==='image'?'white':'#334155',borderColor:activeFilter==='image'?'var(--edps-blue,#1b4293)':'#cbd5e1'}">🖼 Images</button>
        <button @click="activeFilter='video'" :style="{padding:'0.3rem 0.8rem',borderRadius:'4px',border:'1px solid',fontSize:'0.85rem',cursor:'pointer',background:activeFilter==='video'?'var(--edps-blue,#1b4293)':'white',color:activeFilter==='video'?'white':'#334155',borderColor:activeFilter==='video'?'var(--edps-blue,#1b4293)':'#cbd5e1'}">🎬 Videos</button>
      </div>

      <!-- File grid -->
      <div style="padding:1rem 1.5rem;overflow-y:auto;flex:1;">
        <div v-if="loading" style="text-align:center;color:#64748b;padding:2rem;">Loading files...</div>
        <div v-else-if="filteredFiles.length === 0" style="text-align:center;color:#94a3b8;padding:2rem;">No {{ activeFilter === 'all' ? '' : activeFilter }} files uploaded yet.</div>
        <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.75rem;">
          <div
            v-for="file in filteredFiles"
            :key="file.filename"
            @click="selectFile(file)"
            style="cursor:pointer;border:2px solid #e2e8f0;border-radius:8px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;"
            @mouseenter="$event.currentTarget.style.borderColor='var(--edps-blue,#1b4293)';$event.currentTarget.style.boxShadow='0 2px 8px rgba(27,66,147,0.2)'"
            @mouseleave="$event.currentTarget.style.borderColor='#e2e8f0';$event.currentTarget.style.boxShadow='none'"
          >
            <div style="width:100%;height:90px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <img v-if="isImage(file.filename)" :src="resolveUrl(file.url)" style="width:100%;height:100%;object-fit:cover;" />
              <span v-else style="font-size:2.5rem;">🎬</span>
            </div>
            <div style="padding:0.4rem 0.5rem;font-size:0.72rem;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" :title="file.filename">{{ cleanFilename(file.filename) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authFetch } from '../auth.js';
import { baseUrl } from '../config.js';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const VIDEO_EXTS = ['.mp4', '.webm'];

export default {
  name: 'MediaPicker',
  props: {
    filter: { type: String, default: 'all' }, // 'all', 'image', 'video'
  },
  emits: ['select', 'close'],
  data() {
    return {
      files: [],
      loading: true,
      activeFilter: this.filter,
    };
  },
  computed: {
    filteredFiles() {
      if (this.activeFilter === 'all') return this.files;
      return this.files.filter(f => {
        if (this.activeFilter === 'image') return this.isImage(f.filename);
        if (this.activeFilter === 'video') return this.isVideo(f.filename);
        return true;
      });
    },
  },
  async mounted() {
    try {
      const res = await authFetch(`${baseUrl}/api/uploads`);
      if (res.ok) this.files = await res.json();
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    isImage(filename) {
      const lower = filename.toLowerCase();
      return IMAGE_EXTS.some(ext => lower.endsWith(ext));
    },
    isVideo(filename) {
      const lower = filename.toLowerCase();
      return VIDEO_EXTS.some(ext => lower.endsWith(ext));
    },
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    cleanFilename(filename) {
      // Remove timestamp prefix (e.g. "1774522144796_")
      return filename.replace(/^\d+_/, '');
    },
    selectFile(file) {
      const kind = this.isVideo(file.filename) ? 'video' : 'image';
      this.$emit('select', { url: file.url, filename: file.filename, kind });
    },
  },
};
</script>
