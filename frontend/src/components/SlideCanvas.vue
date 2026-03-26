<template>
  <div style="user-select:none;">
    <!-- Toolbar -->
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px 8px 0 0;border-bottom:none;">
      <button @click="addEl('text')" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">＋ Text</button>
      <button @click="addEl('image')" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🖼 Image URL</button>
      <button @click="addEl('video')" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🎬 Video URL</button>

      <span v-if="sel" style="width:1px;height:24px;background:#cbd5e1;margin:0 0.3rem;"></span>

      <!-- Text controls -->
      <template v-if="sel && sel.kind==='text'">
        <select v-model="sel.fontFamily" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;width:120px;">
          <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
        </select>
        <input type="number" v-model.number="sel.fontSize" @change="emit" min="8" max="120" style="width:52px;padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;" />
        <input type="color" v-model="sel.color" @input="emit" style="width:32px;height:28px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <button @click="toggleBold" :style="{fontWeight:'bold',background:sel.bold?'var(--primary)':'#f1f5f9',color:sel.bold?'white':'#334155'}" class="secondary" style="width:30px;padding:0.25rem;font-size:0.85rem;">B</button>
        <button @click="toggleItalic" :style="{fontStyle:'italic',background:sel.italic?'var(--primary)':'#f1f5f9',color:sel.italic?'white':'#334155'}" class="secondary" style="width:30px;padding:0.25rem;font-size:0.85rem;">I</button>
        <select v-model="sel.textAlign" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;">
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
      </template>

      <!-- Image/video src -->
      <template v-if="sel && (sel.kind==='image'||sel.kind==='video')">
        <input v-model="sel.src" @change="emit" placeholder="Paste URL here..." style="flex:1;min-width:250px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:0;" />
      </template>

      <span style="flex:1;"></span>
      <button v-if="sel" @click="deleteSelected" class="danger" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🗑 Delete</button>
      <button v-if="selIdx>=0" @click="deselect" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">✕ Deselect</button>
    </div>

    <!-- Canvas wrapper — clip overflow, show scrollbars if needed -->
    <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;background:#888;display:flex;align-items:center;justify-content:center;min-height:380px;">
      <div :style="canvasWrapStyle">
        <div ref="canvas"
          :style="{position:'relative',width:W+'px',height:H+'px',background:'white',overflow:'hidden',transformOrigin:'top left',transform:`scale(${scale})`}"
          @mouseup="stopDrag"
          @mousemove="onMouseMove"
          @click.self="deselect"
        >
          <!-- EDPS decorative header -->
          <div style="position:absolute;top:0;left:0;right:0;height:74px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;padding:0 2rem;gap:1rem;z-index:0;pointer-events:none;">
            <img src="/logo.png" style="height:38px;" onerror="this.style.display='none'" />
            <span style="color:#1b4293;font-weight:bold;font-size:1rem;">{{ slideTitle }}</span>
          </div>
          <!-- EDPS decorative footer -->
          <div style="position:absolute;bottom:0;left:0;right:0;height:38px;background:#e6e6e6;z-index:0;pointer-events:none;"></div>
          <div style="position:absolute;bottom:0;right:0;width:100px;height:100px;overflow:hidden;z-index:0;pointer-events:none;">
            <div style="position:absolute;bottom:0;right:0;width:200%;height:200%;border-radius:50%;border:14px solid #dea133;transform:translate(50%,50%);"></div>
            <div style="position:absolute;bottom:13px;right:13px;width:26px;height:26px;background:#1b4293;border-radius:50%;"></div>
          </div>

          <!-- Elements -->
          <div
            v-for="(el, idx) in localEls"
            :key="el.id"
            :style="elStyle(el, idx)"
            @mousedown.stop="startDrag(idx, $event)"
          >
            <!-- Text: show normally, overlay textarea on double-click -->
            <div
              v-if="el.kind==='text'"
              @dblclick.stop="startEdit(idx)"
              :style="{...textStyle(el), width:'100%', height:'100%', overflow:'hidden', cursor: selIdx===idx ? 'move' : 'default', wordWrap:'break-word', whiteSpace:'pre-wrap'}"
            >{{ el.content }}</div>

            <!-- Textarea overlay for editing -->
            <textarea
              v-if="el.kind==='text' && editingIdx===idx"
              :value="el.content"
              @input="el.content=$event.target.value"
              @blur="stopEdit"
              @mousedown.stop
              ref="editTextarea"
              :style="{...textStyle(el), position:'absolute', inset:0, border:'2px solid #1b4293', resize:'none', padding:0, margin:0, background:'rgba(255,255,255,0.92)', zIndex:100, cursor:'text', boxSizing:'border-box'}"
            ></textarea>

            <!-- Image -->
            <img v-if="el.kind==='image'" :src="el.src" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" />

            <!-- Video -->
            <iframe v-if="el.kind==='video'" :src="el.src" style="width:100%;height:100%;border:none;pointer-events:none;" frameborder="0"></iframe>

            <!-- Selection handles -->
            <template v-if="selIdx===idx">
              <div style="position:absolute;inset:-2px;border:2px solid #1b4293;pointer-events:none;"></div>
              <!-- Resize handle SE -->
              <div style="position:absolute;right:-5px;bottom:-5px;width:12px;height:12px;background:#1b4293;border-radius:50%;cursor:se-resize;z-index:10;"
                @mousedown.stop="startResize(idx, $event,'se')"></div>
              <!-- Resize handle E -->
              <div style="position:absolute;top:50%;right:-5px;width:10px;height:10px;background:#4a90d9;border-radius:50%;transform:translateY(-50%);cursor:e-resize;z-index:10;"
                @mousedown.stop="startResize(idx, $event,'e')"></div>
              <!-- Resize handle S -->
              <div style="position:absolute;bottom:-5px;left:50%;width:10px;height:10px;background:#4a90d9;border-radius:50%;transform:translateX(-50%);cursor:s-resize;z-index:10;"
                @mousedown.stop="startResize(idx, $event,'s')"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:0.5rem;font-size:0.78rem;color:#94a3b8;text-align:center;">
      Click to select · Drag to move · Double-click text to edit · Drag handles to resize
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideCanvas',
  props: {
    modelValue: { type: Array, default: () => [] },
    slideTitle: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    const W = 1024, H = 576;
    return {
      W, H,
      scale: 0.6,
      localEls: [],
      selIdx: -1,
      editingIdx: -1,
      drag: null,
      fonts: ['Segoe UI','Arial','Georgia','Courier New','Verdana','Times New Roman','Calibri'],
    };
  },
  computed: {
    sel() { return this.selIdx >= 0 ? this.localEls[this.selIdx] : null; },
    canvasWrapStyle() {
      return { width: this.W * this.scale + 'px', height: this.H * this.scale + 'px', position: 'relative', flexShrink: 0 };
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) { this.localEls = JSON.parse(JSON.stringify(v || [])); },
    },
  },
  mounted() {
    window.addEventListener('mouseup', this.stopDrag);
    this.fitScale();
    window.addEventListener('resize', this.fitScale);
  },
  beforeUnmount() {
    window.removeEventListener('mouseup', this.stopDrag);
    window.removeEventListener('resize', this.fitScale);
  },
  methods: {
    fitScale() {
      const panel = this.$el.parentElement;
      if (!panel) return;
      const avail = panel.clientWidth - 32;
      this.scale = Math.max(0.4, Math.min(0.75, avail / this.W));
    },

    elStyle(el, idx) {
      return {
        position: 'absolute',
        left: el.x + 'px', top: el.y + 'px',
        width: el.w + 'px', height: el.h + 'px',
        zIndex: idx === this.selIdx ? 50 : 10,
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
        color: el.color || '#333333',
        textAlign: el.textAlign || 'left',
        lineHeight: 1.4,
      };
    },

    addEl(kind) {
      const id = 'el_' + Date.now();
      let el;
      if (kind === 'text') {
        el = { id, kind, x: 80, y: 90, w: 500, h: 80, content: 'Double-click to edit this text', fontSize: 22, fontFamily: 'Segoe UI', bold: false, italic: false, color: '#333333', textAlign: 'left' };
      } else if (kind === 'image') {
        const url = prompt('Paste image URL (or path from Media Library):');
        if (!url) return;
        el = { id, kind, x: 200, y: 100, w: 350, h: 250, src: url };
      } else {
        const url = prompt('Paste video embed URL (YouTube embed or direct mp4):');
        if (!url) return;
        el = { id, kind, x: 150, y: 100, w: 500, h: 300, src: url };
      }
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
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

    startEdit(idx) {
      this.selIdx = idx;
      this.editingIdx = idx;
      this.$nextTick(() => {
        const ta = this.$refs.editTextarea;
        const el = Array.isArray(ta) ? ta[0] : ta;
        if (el) { el.focus(); el.select(); }
      });
    },
    stopEdit() {
      this.editingIdx = -1;
      this.emit();
    },

    startDrag(idx, e) {
      this.selIdx = idx;
      const el = this.localEls[idx];
      this.drag = { type: 'move', idx, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
      e.preventDefault();
    },
    startResize(idx, e, dir) {
      const el = this.localEls[idx];
      this.drag = { type: 'resize', idx, dir, startX: e.clientX, startY: e.clientY, origW: el.w, origH: el.h, origX: el.x, origY: el.y };
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
      } else {
        const dir = this.drag.dir;
        if (dir === 'se' || dir === 'e') el.w = Math.max(40, Math.round(this.drag.origW + dx));
        if (dir === 'se' || dir === 's') el.h = Math.max(20, Math.round(this.drag.origH + dy));
      }
    },
    stopDrag() { if (this.drag) { this.drag = null; this.emit(); } },

    emit() {
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.localEls)));
    },
  },
};
</script>
