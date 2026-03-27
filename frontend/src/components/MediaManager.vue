<template>
  <div>
    <h3 style="margin-top: 0;">Media Library</h3>
    <p style="color: #64748b; font-size: 0.9rem;">Upload images or videos. Then paste the URL into any slide's Image or Video field.</p>

    <!-- Upload zone -->
    <div
      style="border: 2px dashed var(--border-color); border-radius: 8px; padding: 2rem; text-align: center; background: #f8fafc; margin-bottom: 1.5rem; cursor: pointer; transition: border-color 0.2s;"
      :style="{ borderColor: isDragging ? 'var(--primary)' : '' }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="$refs.fileInput.click()"
    >
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📁</div>
      <div style="font-weight: bold; color: var(--primary);">Click or drag files here</div>
      <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">Images (PNG, JPG, GIF, WebP) or Videos (MP4, WebM) — max 50MB</div>
      <input ref="fileInput" type="file" multiple accept="image/*,video/*" style="display: none;" @change="onFileSelect" />
    </div>

    <!-- Upload progress -->
    <div v-if="uploading" style="background: #e0f2fe; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; color: var(--primary); font-weight: bold;">
      ⏳ Uploading... {{ uploadProgress }}
    </div>
    <div v-if="uploadSuccess" style="background: #f0fdf4; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; color: #166534; font-weight: bold;">
      ✅ {{ uploadSuccess }}
    </div>

    <!-- File list -->
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;">
      <div v-for="file in files" :key="file.filename" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #fff;">
        <div style="height: 120px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          <img v-if="isImage(file.filename)" :src="fullUrl(file.url)" style="width: 100%; height: 100%; object-fit: cover;" :alt="file.filename.substring(file.filename.indexOf('_')+1)" />
          <div v-else style="font-size: 3rem;">🎬</div>
        </div>
        <div style="padding: 0.5rem;">
          <div style="font-size: 0.75rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="file.filename">{{ file.filename.substring(file.filename.indexOf('_')+1) }}</div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <button @click="copyUrl(file)" style="flex: 1; background: var(--primary); color: white; border: none; padding: 0.3rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">📋 Copy URL</button>
            <button @click="deleteFile(file)" style="background: #fee2e2; color: #dc2626; border: none; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">🗑</button>
          </div>
          <div v-if="copiedFile === file.filename" style="color: #10b981; font-size: 0.75rem; margin-top: 0.25rem; text-align: center; font-weight: bold;">Copied!</div>
        </div>
      </div>
      <div v-if="files.length === 0" style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No files uploaded yet.</div>
    </div>
  </div>
</template>

<script>
import { baseUrl } from '../config.js';
import { authFetch, authHeaders } from '../auth.js';

export default {
  data() {
    return {
      files: [],
      isDragging: false,
      uploading: false,
      uploadProgress: '',
      uploadSuccess: '',
      copiedFile: '',
    };
  },
  mounted() { this.fetchFiles(); },
  methods: {
    fullUrl(url) { return url.startsWith('http') ? url : `${baseUrl}${url}`; },
    isImage(filename) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(filename); },
    async fetchFiles() {
      try {
        const res = await authFetch(`${baseUrl}/api/uploads`);
        if (res.ok) this.files = await res.json();
      } catch(e) { console.error(e); }
    },
    onFileSelect(e) { this.uploadFiles(e.target.files); },
    onDrop(e) {
      this.isDragging = false;
      this.uploadFiles(e.dataTransfer.files);
    },
    async uploadFiles(fileList) {
      this.uploading = true;
      this.uploadSuccess = '';
      let count = 0;
      for (const file of fileList) {
        this.uploadProgress = `Uploading ${file.name}...`;
        const fd = new FormData();
        fd.append('file', file);
        try {
          await authFetch(`${baseUrl}/api/upload`, { method: 'POST', body: fd });
          count++;
        } catch(e) { console.error(e); }
      }
      this.uploading = false;
      this.uploadSuccess = `${count} file(s) uploaded successfully!`;
      setTimeout(() => this.uploadSuccess = '', 3000);
      this.fetchFiles();
    },
    async deleteFile(file) {
      if (!confirm(`Delete ${file.filename}?`)) return;
      try {
        await authFetch(`${baseUrl}/api/uploads/${encodeURIComponent(file.filename)}`, { method: 'DELETE' });
        this.fetchFiles();
      } catch(e) { console.error(e); }
    },
    async copyUrl(file) {
      const url = this.fullUrl(file.url);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Fallback for older browsers or denied clipboard permission
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.copiedFile = file.filename;
      setTimeout(() => this.copiedFile = '', 2000);
    },
  },
};
</script>
