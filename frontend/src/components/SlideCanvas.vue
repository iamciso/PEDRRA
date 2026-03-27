<template>
  <div style="user-select:none;" @keydown="onKeyDown" tabindex="0" ref="root">
    <!-- Toolbar Row 1 -->
    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px 8px 0 0;border-bottom:none;">
      <button @click="addEl('text')" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;" title="Add text element">＋ Text</button>

      <!-- Image dropdown -->
      <div style="position:relative;" ref="imageMenuRef">
        <button @click="showImageMenu=!showImageMenu; showVideoMenu=false; showShapeMenu=false" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🖼 Image ▾</button>
        <div v-if="showImageMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:170px;margin-top:4px;">
          <button @click="showAddUrl('image'); showImageMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">🔗 Paste URL</button>
          <button @click="triggerUpload('image'); showImageMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">📤 Upload File</button>
          <button @click="openMediaPicker('image'); showImageMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">📂 Browse Library</button>
        </div>
      </div>

      <!-- Video dropdown -->
      <div style="position:relative;" ref="videoMenuRef">
        <button @click="showVideoMenu=!showVideoMenu; showImageMenu=false; showShapeMenu=false" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🎬 Video ▾</button>
        <div v-if="showVideoMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:170px;margin-top:4px;">
          <button @click="showAddUrl('video'); showVideoMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">🔗 Paste URL</button>
          <button @click="triggerUpload('video'); showVideoMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">📤 Upload File</button>
          <button @click="openMediaPicker('video'); showVideoMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">📂 Browse Library</button>
        </div>
      </div>

      <!-- #10 — Shape dropdown -->
      <div style="position:relative;" ref="shapeMenuRef">
        <button @click="showShapeMenu=!showShapeMenu; showImageMenu=false; showVideoMenu=false" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">⬛ Shape ▾</button>
        <div v-if="showShapeMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:140px;margin-top:4px;">
          <button v-for="s in shapes" :key="s.name" @click="addShape(s); showShapeMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">{{ s.icon }} {{ s.name }}</button>
        </div>
      </div>

      <!-- Hidden file input -->
      <input type="file" ref="fileInput" :accept="uploadKind==='image' ? 'image/png,image/jpeg,image/gif,image/webp' : 'video/mp4,video/webm'" style="display:none;" @change="onFileUpload" />
      <span v-if="uploading" style="font-size:0.8rem;color:#64748b;">⏳ Uploading...</span>

      <!-- Inline URL input -->
      <template v-if="addUrlKind">
        <input v-model="addUrlValue" :placeholder="addUrlKind === 'image' ? 'Paste image URL...' : 'Paste YouTube or video URL...'" @keyup.enter="confirmAddUrl" @keyup.escape="cancelAddUrl" ref="addUrlInput" style="min-width:220px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:0;" />
        <button @click="confirmAddUrl" class="secondary" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;">Add</button>
        <button @click="cancelAddUrl" class="secondary" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;">Cancel</button>
      </template>

      <span v-if="sel" style="width:1px;height:24px;background:#cbd5e1;margin:0 0.2rem;"></span>

      <!-- Text controls -->
      <template v-if="sel && sel.kind==='text'">
        <select v-model="sel.fontFamily" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;width:110px;">
          <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
        </select>
        <input type="number" v-model.number="sel.fontSize" @change="emit" min="8" max="120" style="width:48px;padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;" />
        <input type="color" v-model="sel.color" @input="emit" style="width:28px;height:26px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <button @click="toggleBold" :style="{fontWeight:'bold',background:sel.bold?'var(--primary)':'#f1f5f9',color:sel.bold?'white':'#334155'}" class="secondary" style="width:28px;padding:0.2rem;font-size:0.85rem;">B</button>
        <button @click="toggleItalic" :style="{fontStyle:'italic',background:sel.italic?'var(--primary)':'#f1f5f9',color:sel.italic?'white':'#334155'}" class="secondary" style="width:28px;padding:0.2rem;font-size:0.85rem;">I</button>
        <button @click="toggleUnderline" :style="{textDecoration:'underline',background:sel.underline?'var(--primary)':'#f1f5f9',color:sel.underline?'white':'#334155'}" class="secondary" style="width:28px;padding:0.2rem;font-size:0.85rem;">U</button>
        <select v-model="sel.textAlign" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;width:70px;">
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
      </template>

      <!-- Shape controls -->
      <template v-if="sel && sel.kind==='shape'">
        <input type="color" v-model="sel.fill" @input="emit" title="Fill color" style="width:28px;height:26px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <input type="color" v-model="sel.stroke" @input="emit" title="Border color" style="width:28px;height:26px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <input type="number" v-model.number="sel.strokeWidth" @change="emit" min="0" max="10" title="Border width" style="width:40px;padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;" />
      </template>

      <!-- Image/video src -->
      <template v-if="sel && (sel.kind==='image'||sel.kind==='video')">
        <input v-model="sel.src" @change="emit" placeholder="Paste URL here..." style="flex:1;min-width:200px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:0;" />
      </template>

      <span style="flex:1;"></span>

      <!-- #4 — Layer controls -->
      <template v-if="sel">
        <button @click="bringForward" class="secondary" title="Bring forward" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;">↑</button>
        <button @click="sendBackward" class="secondary" title="Send backward" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;">↓</button>
        <button @click="duplicateEl" class="secondary" title="Duplicate (Ctrl+D)" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;">📋</button>
        <button @click="deleteSelected" class="danger" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;">🗑</button>
      </template>
      <button v-if="selIdx>=0" @click="deselect" class="secondary" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;">✕</button>
    </div>

    <!-- Canvas wrapper -->
    <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;background:#888;display:flex;align-items:center;justify-content:center;min-height:380px;">
      <div :style="canvasWrapStyle">
        <div ref="canvas"
          :style="{position:'relative',width:W+'px',height:H+'px',background: slideBg || 'white',backgroundSize:'cover',backgroundPosition:'center',overflow:'hidden',transformOrigin:'top left',transform:`scale(${scale})`}"
          @mouseup="stopDrag"
          @mousemove="onMouseMove"
          @click.self="deselect"
        >
          <!-- Alignment guides (#5) -->
          <div v-if="guides.vCenter" style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:#3b82f6;z-index:200;pointer-events:none;opacity:0.7;"></div>
          <div v-if="guides.hCenter" style="position:absolute;left:0;right:0;top:50%;height:1px;background:#3b82f6;z-index:200;pointer-events:none;opacity:0.7;"></div>

          <!-- EDPS header -->
          <div style="position:absolute;top:0;left:0;right:0;height:74px;display:flex;align-items:center;padding:0 2rem;gap:1rem;z-index:0;pointer-events:none;">
            <img src="/template/edps_logo.png" style="height:38px;" onerror="this.src='/logo.png'; this.onerror=null;" />
            <span style="color:var(--edps-blue,#254A9A);font-weight:bold;font-size:1rem;">{{ slideTitle }}</span>
          </div>

          <!-- Elements -->
          <div
            v-for="(el, idx) in localEls"
            :key="el.id"
            :style="elStyle(el, idx)"
            @mousedown.stop="startDrag(idx, $event)"
          >
            <!-- Text -->
            <div v-if="el.kind==='text'" @dblclick.stop="startEdit(idx)"
              :style="{...textStyle(el), width:'100%', height:'100%', overflow:'hidden', cursor: selIdx===idx ? 'move' : 'default', wordWrap:'break-word', whiteSpace:'pre-wrap'}">{{ el.content }}</div>

            <!-- Textarea overlay for editing -->
            <textarea v-if="el.kind==='text' && editingIdx===idx" :value="el.content" @input="el.content=$event.target.value" @blur="stopEdit" @mousedown.stop ref="editTextarea"
              :style="{...textStyle(el), position:'absolute', inset:0, border:'2px solid var(--edps-blue)', resize:'none', padding:0, margin:0, background:'rgba(255,255,255,0.92)', zIndex:100, cursor:'text', boxSizing:'border-box'}"></textarea>

            <!-- Image -->
            <img v-if="el.kind==='image'" :src="resolveElUrl(el.src)" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" />

            <!-- Video -->
            <video v-if="el.kind==='video' && isLocalVideo(el.src)" :src="resolveElUrl(el.src)" controls style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>
            <iframe v-else-if="el.kind==='video'" :src="toEmbedUrl(el.src)" style="width:100%;height:100%;border:none;pointer-events:none;" frameborder="0" allowfullscreen></iframe>

            <!-- #10 — Shape -->
            <div v-if="el.kind==='shape'" :style="shapeStyle(el)"></div>

            <!-- Selection handles -->
            <template v-if="selIdx===idx">
              <div style="position:absolute;inset:-2px;border:2px solid var(--edps-blue,#254A9A);pointer-events:none;"></div>
              <!-- Corner handles -->
              <div v-for="handle in ['nw','ne','sw','se']" :key="handle"
                :style="handlePos(handle)"
                @mousedown.stop="startResize(idx, $event, handle)"></div>
              <!-- Edge handles -->
              <div style="position:absolute;top:50%;right:-5px;width:8px;height:8px;background:#4a90d9;border-radius:50%;transform:translateY(-50%);cursor:e-resize;z-index:10;" @mousedown.stop="startResize(idx, $event,'e')"></div>
              <div style="position:absolute;bottom:-5px;left:50%;width:8px;height:8px;background:#4a90d9;border-radius:50%;transform:translateX(-50%);cursor:s-resize;z-index:10;" @mousedown.stop="startResize(idx, $event,'s')"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:0.4rem;font-size:0.75rem;color:#94a3b8;">
      <span>Click to select · Drag to move · Dbl-click text to edit · Del to delete · Ctrl+D duplicate · Ctrl+C/V copy/paste · Shift+drag: keep ratio</span>
      <!-- #11 — Background selector -->
      <span>
        BG: <select v-model="localBg" @change="$emit('update:background', localBg)" style="font-size:0.72rem;padding:0.1rem;border:1px solid #cbd5e1;border-radius:3px;">
          <option value="">Default (Template)</option>
          <option value="white">White</option>
          <option value="#1b4293">Blue</option>
          <option value="#f1f5f9">Light Gray</option>
          <option value="linear-gradient(135deg,#1b4293,#0f2b5e)">Blue Gradient</option>
        </select>
      </span>
    </div>

    <!-- Media Picker Modal -->
    <MediaPicker v-if="showMediaPicker" :filter="mediaPickerFilter" @select="onMediaPicked" @close="showMediaPicker=false" />
  </div>
</template>

<script>
import { toEmbedUrl, isLocalVideo } from '../utils/media.js';
import { authFetch } from '../auth.js';
import { baseUrl } from '../config.js';
import MediaPicker from './MediaPicker.vue';

export default {
  name: 'SlideCanvas',
  components: { MediaPicker },
  props: {
    modelValue: { type: Array, default: () => [] },
    slideTitle: { type: String, default: '' },
    background: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'update:background'],
  data() {
    const W = 1024, H = 576;
    return {
      W, H,
      scale: 0.6,
      localEls: [],
      localBg: '',
      selIdx: -1,
      editingIdx: -1,
      drag: null,
      addUrlKind: null,
      addUrlValue: '',
      fonts: ['Segoe UI','Arial','Georgia','Courier New','Verdana','Times New Roman','Calibri','Impact','Comic Sans MS'],
      showImageMenu: false,
      showVideoMenu: false,
      showShapeMenu: false,
      uploadKind: null,
      uploading: false,
      showMediaPicker: false,
      mediaPickerFilter: 'all',
      clipboard: null, // #6 — clipboard for copy/paste
      guides: { vCenter: false, hCenter: false }, // #5 — alignment guides
      shapes: [
        { name: 'Rectangle', icon: '⬛', shape: 'rect' },
        { name: 'Circle', icon: '⚫', shape: 'circle' },
        { name: 'Rounded Rect', icon: '🟦', shape: 'roundrect' },
        { name: 'Arrow Right', icon: '➡️', shape: 'arrow' },
        { name: 'Line', icon: '➖', shape: 'line' },
      ],
    };
  },
  computed: {
    sel() { return this.selIdx >= 0 ? this.localEls[this.selIdx] : null; },
    slideBg() { return this.localBg || ''; },
    canvasWrapStyle() {
      return { width: this.W * this.scale + 'px', height: this.H * this.scale + 'px', position: 'relative', flexShrink: 0 };
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) { this.localEls = JSON.parse(JSON.stringify(v || [])); },
    },
    background: {
      immediate: true,
      handler(v) { this.localBg = v || ''; },
    },
  },
  mounted() {
    window.addEventListener('mouseup', this.stopDrag);
    this.fitScale();
    window.addEventListener('resize', this.fitScale);
    document.addEventListener('click', this.closeMenus);
  },
  beforeUnmount() {
    window.removeEventListener('mouseup', this.stopDrag);
    window.removeEventListener('resize', this.fitScale);
    document.removeEventListener('click', this.closeMenus);
  },
  methods: {
    toEmbedUrl,
    isLocalVideo,

    resolveElUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },

    closeMenus(e) {
      if (this.$refs.imageMenuRef && !this.$refs.imageMenuRef.contains(e.target)) this.showImageMenu = false;
      if (this.$refs.videoMenuRef && !this.$refs.videoMenuRef.contains(e.target)) this.showVideoMenu = false;
      if (this.$refs.shapeMenuRef && !this.$refs.shapeMenuRef.contains(e.target)) this.showShapeMenu = false;
    },

    fitScale() {
      const panel = this.$el?.parentElement;
      if (!panel) return;
      const avail = panel.clientWidth - 32;
      this.scale = Math.max(0.4, Math.min(0.75, avail / this.W));
    },

    elStyle(el, idx) {
      return {
        position: 'absolute',
        left: el.x + 'px', top: el.y + 'px',
        width: el.w + 'px', height: el.h + 'px',
        zIndex: el.zIndex || (idx + 10),
        cursor: 'move',
        boxSizing: 'border-box',
      };
    },
    textStyle(el) {
      return {
        fontSize: el.fontSize + 'px',
        fontFamily: el.fontFamily || 'Segoe UI',
        fontWeight: el.bold ? 'bold' : 'normal',
        fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: el.underline ? 'underline' : 'none',
        color: el.color || '#333333',
        textAlign: el.textAlign || 'left',
        lineHeight: 1.4,
      };
    },
    // #10 — Shape rendering
    shapeStyle(el) {
      const base = { width: '100%', height: '100%', background: el.fill || '#254A9A', border: `${el.strokeWidth || 0}px solid ${el.stroke || '#000'}` };
      if (el.shape === 'circle') base.borderRadius = '50%';
      else if (el.shape === 'roundrect') base.borderRadius = '12px';
      else if (el.shape === 'line') { base.height = `${el.strokeWidth || 3}px`; base.background = el.fill || '#254A9A'; base.borderRadius = '2px'; base.marginTop = (el.h / 2 - 1) + 'px'; base.border = 'none'; }
      else if (el.shape === 'arrow') { base.clipPath = 'polygon(0 30%, 70% 30%, 70% 0, 100% 50%, 70% 100%, 70% 70%, 0 70%)'; base.border = 'none'; }
      return base;
    },

    // #4 — Handle positions for all corners
    handlePos(corner) {
      const base = { position: 'absolute', width: '10px', height: '10px', background: 'var(--edps-blue,#254A9A)', borderRadius: '50%', zIndex: 10 };
      if (corner === 'nw') return { ...base, top: '-5px', left: '-5px', cursor: 'nw-resize' };
      if (corner === 'ne') return { ...base, top: '-5px', right: '-5px', cursor: 'ne-resize' };
      if (corner === 'sw') return { ...base, bottom: '-5px', left: '-5px', cursor: 'sw-resize' };
      return { ...base, bottom: '-5px', right: '-5px', cursor: 'se-resize' };
    },

    addEl(kind) {
      const id = 'el_' + Date.now();
      const el = { id, kind, x: 80, y: 90, w: 500, h: 80, content: 'Double-click to edit', fontSize: 22, fontFamily: 'Segoe UI', bold: false, italic: false, underline: false, color: '#333333', textAlign: 'left', zIndex: this.localEls.length + 10 };
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.emit();
    },

    // #10 — Add shape
    addShape(shapeDef) {
      const id = 'el_' + Date.now();
      const el = { id, kind: 'shape', shape: shapeDef.shape, x: 200, y: 150, w: 200, h: shapeDef.shape === 'line' ? 6 : 150, fill: '#254A9A', stroke: '#1a3a7a', strokeWidth: 0, zIndex: this.localEls.length + 10 };
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.emit();
    },

    showAddUrl(kind) {
      this.addUrlKind = kind;
      this.addUrlValue = '';
      this.$nextTick(() => {
        const input = this.$refs.addUrlInput;
        if (input) (Array.isArray(input) ? input[0] : input).focus();
      });
    },
    confirmAddUrl() {
      const url = this.addUrlValue.trim();
      if (!url) { this.cancelAddUrl(); return; }
      const id = 'el_' + Date.now();
      let el;
      if (this.addUrlKind === 'image') {
        el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: url, zIndex: this.localEls.length + 10 };
      } else {
        el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: url, zIndex: this.localEls.length + 10 };
      }
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.addUrlKind = null;
      this.addUrlValue = '';
      this.emit();
    },
    cancelAddUrl() { this.addUrlKind = null; this.addUrlValue = ''; },

    triggerUpload(kind) {
      this.uploadKind = kind;
      this.$nextTick(() => { this.$refs.fileInput.value = ''; this.$refs.fileInput.click(); });
    },
    async onFileUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      this.uploading = true;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await authFetch(`${baseUrl}/api/upload`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const id = 'el_' + Date.now();
        let el;
        if (this.uploadKind === 'image') {
          el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: data.url, zIndex: this.localEls.length + 10 };
        } else {
          el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: data.url, zIndex: this.localEls.length + 10 };
        }
        this.localEls.push(el);
        this.selIdx = this.localEls.length - 1;
        this.emit();
      } catch (err) { alert('Upload failed: ' + err.message); } finally { this.uploading = false; }
    },

    openMediaPicker(filter) { this.mediaPickerFilter = filter; this.showMediaPicker = true; },
    onMediaPicked({ url, kind }) {
      const id = 'el_' + Date.now();
      let el;
      if (kind === 'image') el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: url, zIndex: this.localEls.length + 10 };
      else el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: url, zIndex: this.localEls.length + 10 };
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.showMediaPicker = false;
      this.emit();
    },

    deleteSelected() {
      if (this.selIdx < 0) return;
      this.localEls.splice(this.selIdx, 1);
      this.selIdx = -1;
      this.editingIdx = -1;
      this.emit();
    },

    deselect() { this.selIdx = -1; this.editingIdx = -1; },

    toggleBold() { if (this.sel) { this.sel.bold = !this.sel.bold; this.emit(); } },
    toggleItalic() { if (this.sel) { this.sel.italic = !this.sel.italic; this.emit(); } },
    toggleUnderline() { if (this.sel) { this.sel.underline = !this.sel.underline; this.emit(); } },

    // #4 — Layer management
    bringForward() {
      if (this.selIdx < 0 || this.selIdx >= this.localEls.length - 1) return;
      const el = this.localEls.splice(this.selIdx, 1)[0];
      this.localEls.splice(this.selIdx + 1, 0, el);
      this.selIdx++;
      this.emit();
    },
    sendBackward() {
      if (this.selIdx <= 0) return;
      const el = this.localEls.splice(this.selIdx, 1)[0];
      this.localEls.splice(this.selIdx - 1, 0, el);
      this.selIdx--;
      this.emit();
    },

    // #6 — Copy/paste/duplicate
    duplicateEl() {
      if (this.selIdx < 0) return;
      const copy = JSON.parse(JSON.stringify(this.localEls[this.selIdx]));
      copy.id = 'el_' + Date.now();
      copy.x += 20;
      copy.y += 20;
      this.localEls.push(copy);
      this.selIdx = this.localEls.length - 1;
      this.emit();
    },
    copyEl() {
      if (this.selIdx < 0) return;
      this.clipboard = JSON.parse(JSON.stringify(this.localEls[this.selIdx]));
    },
    pasteEl() {
      if (!this.clipboard) return;
      const el = JSON.parse(JSON.stringify(this.clipboard));
      el.id = 'el_' + Date.now();
      el.x += 20;
      el.y += 20;
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.emit();
    },

    startEdit(idx) {
      this.selIdx = idx;
      this.editingIdx = idx;
      this.$nextTick(() => {
        const ta = this.$refs.editTextarea;
        const el = Array.isArray(ta) ? ta[0] : ta;
        if (el) { el.focus(); el.select(); }
      });
    },
    stopEdit() { this.editingIdx = -1; this.emit(); },

    startDrag(idx, e) {
      this.selIdx = idx;
      const el = this.localEls[idx];
      this.drag = { type: 'move', idx, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, shift: e.shiftKey };
      e.preventDefault();
    },
    startResize(idx, e, dir) {
      const el = this.localEls[idx];
      this.drag = { type: 'resize', idx, dir, startX: e.clientX, startY: e.clientY, origW: el.w, origH: el.h, origX: el.x, origY: el.y, aspect: el.w / el.h, shift: false };
      e.preventDefault();
    },
    onMouseMove(e) {
      if (!this.drag) return;
      const dx = (e.clientX - this.drag.startX) / this.scale;
      const dy = (e.clientY - this.drag.startY) / this.scale;
      const el = this.localEls[this.drag.idx];
      if (this.drag.type === 'move') {
        el.x = Math.max(0, Math.min(this.W - el.w, Math.round(this.drag.origX + dx)));
        el.y = Math.max(0, Math.min(this.H - el.h, Math.round(this.drag.origY + dy)));
        // #5 — Snap to center guides
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        this.guides.vCenter = Math.abs(cx - this.W / 2) < 8;
        this.guides.hCenter = Math.abs(cy - this.H / 2) < 8;
        if (this.guides.vCenter) el.x = Math.round(this.W / 2 - el.w / 2);
        if (this.guides.hCenter) el.y = Math.round(this.H / 2 - el.h / 2);
      } else {
        const dir = this.drag.dir;
        // #8 — Shift for aspect ratio lock
        const lockRatio = e.shiftKey && (dir === 'se' || dir === 'nw' || dir === 'ne' || dir === 'sw');
        let newW = this.drag.origW, newH = this.drag.origH;
        if (dir.includes('e')) newW = Math.max(40, Math.round(this.drag.origW + dx));
        if (dir.includes('s')) newH = Math.max(20, Math.round(this.drag.origH + dy));
        if (dir.includes('w')) { newW = Math.max(40, Math.round(this.drag.origW - dx)); el.x = Math.round(this.drag.origX + dx); }
        if (dir.includes('n')) { newH = Math.max(20, Math.round(this.drag.origH - dy)); el.y = Math.round(this.drag.origY + dy); }
        if (lockRatio) {
          const a = this.drag.aspect;
          if (Math.abs(dx) > Math.abs(dy)) { newH = Math.round(newW / a); }
          else { newW = Math.round(newH * a); }
        }
        el.w = newW;
        el.h = newH;
      }
    },
    stopDrag() {
      if (this.drag) {
        this.drag = null;
        this.guides = { vCenter: false, hCenter: false };
        this.emit();
      }
    },

    // #9 — Keyboard shortcuts
    onKeyDown(e) {
      if (this.editingIdx >= 0) return; // don't intercept while editing text
      if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); e.preventDefault(); }
      else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) { this.duplicateEl(); e.preventDefault(); }
      else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { this.copyEl(); e.preventDefault(); }
      else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) { this.pasteEl(); e.preventDefault(); }
      else if (e.key === 'ArrowUp' && this.selIdx >= 0) { this.localEls[this.selIdx].y = Math.max(0, this.localEls[this.selIdx].y - (e.shiftKey ? 10 : 1)); this.emit(); e.preventDefault(); }
      else if (e.key === 'ArrowDown' && this.selIdx >= 0) { this.localEls[this.selIdx].y = Math.min(this.H - this.localEls[this.selIdx].h, this.localEls[this.selIdx].y + (e.shiftKey ? 10 : 1)); this.emit(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && this.selIdx >= 0) { this.localEls[this.selIdx].x = Math.max(0, this.localEls[this.selIdx].x - (e.shiftKey ? 10 : 1)); this.emit(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' && this.selIdx >= 0) { this.localEls[this.selIdx].x = Math.min(this.W - this.localEls[this.selIdx].w, this.localEls[this.selIdx].x + (e.shiftKey ? 10 : 1)); this.emit(); e.preventDefault(); }
      else if (e.key === 'Escape') { this.deselect(); }
    },

    emit() {
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.localEls)));
    },
  },
};
</script>
