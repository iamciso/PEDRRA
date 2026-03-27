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

      <!-- Shape dropdown -->
      <div style="position:relative;" ref="shapeMenuRef">
        <button @click="showShapeMenu=!showShapeMenu; showImageMenu=false; showVideoMenu=false" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">⬛ Shape ▾</button>
        <div v-if="showShapeMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:140px;margin-top:4px;">
          <button v-for="s in shapeList" :key="s.name" @click="addShape(s); showShapeMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">{{ s.icon }} {{ s.name }}</button>
        </div>
      </div>

      <!-- #6 — Background selector (promoted to toolbar) -->
      <div style="position:relative;" ref="bgMenuRef">
        <button @click="showBgMenu=!showBgMenu" class="secondary" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;">🎨 BG ▾</button>
        <div v-if="showBgMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:160px;margin-top:4px;">
          <button v-for="bg in bgOptions" :key="bg.value" @click="localBg=bg.value; $emit('update:background',bg.value); showBgMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">
            <span :style="{display:'inline-block',width:'14px',height:'14px',borderRadius:'3px',border:'1px solid #ccc',verticalAlign:'middle',marginRight:'6px',background:bg.preview}"></span>
            {{ bg.label }}
          </button>
        </div>
      </div>

      <!-- #10 — Grid toggle -->
      <button @click="showGrid=!showGrid" :class="showGrid?'':'secondary'" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;" :title="showGrid?'Hide grid':'Show grid'">⊞</button>
      <!-- #14 — Preview toggle -->
      <button @click="previewMode=!previewMode" :class="previewMode?'':'secondary'" style="width:auto;padding:0.3rem 0.7rem;font-size:0.82rem;" :title="previewMode?'Exit preview':'Preview slide'">👁</button>

      <span style="width:1px;height:24px;background:#cbd5e1;margin:0 0.2rem;"></span>

      <!-- Undo/Redo -->
      <button @click="undo" class="secondary" :disabled="undoStack.length===0" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;" title="Undo (Ctrl+Z)">↩</button>
      <button @click="redo" class="secondary" :disabled="redoStack.length===0" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;" title="Redo (Ctrl+Y)">↪</button>

      <!-- Zoom -->
      <span style="width:1px;height:24px;background:#cbd5e1;margin:0 0.2rem;"></span>
      <button @click="zoomOut" class="secondary" style="width:auto;padding:0.3rem 0.4rem;font-size:0.82rem;" title="Zoom out (Ctrl+-)">−</button>
      <span style="font-size:0.72rem;color:#64748b;min-width:36px;text-align:center;">{{ Math.round(scale * 100) }}%</span>
      <button @click="zoomIn" class="secondary" style="width:auto;padding:0.3rem 0.4rem;font-size:0.82rem;" title="Zoom in (Ctrl++)">+</button>

      <!-- Hidden file input -->
      <input type="file" ref="fileInput" :accept="uploadKind==='image' ? 'image/png,image/jpeg,image/gif,image/webp' : 'video/mp4,video/webm'" style="display:none;" @change="onFileUpload" />
      <span v-if="uploading" style="font-size:0.8rem;color:#64748b;">⏳ Uploading...</span>

      <!-- Inline URL input -->
      <template v-if="addUrlKind">
        <input v-model="addUrlValue" :placeholder="addUrlKind === 'image' ? 'Paste image URL...' : 'Paste YouTube or video URL...'" @keyup.enter="confirmAddUrl" @keyup.escape="cancelAddUrl" ref="addUrlInput" style="min-width:200px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:0;" />
        <button @click="confirmAddUrl" class="secondary" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;">Add</button>
        <button @click="cancelAddUrl" class="secondary" style="width:auto;padding:0.3rem 0.5rem;font-size:0.82rem;">✕</button>
      </template>

      <span v-if="sel" style="width:1px;height:24px;background:#cbd5e1;margin:0 0.2rem;"></span>

      <!-- Text controls -->
      <template v-if="sel && sel.kind==='text'">
        <select v-model="sel.fontFamily" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;width:100px;">
          <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
        </select>
        <input type="number" v-model.number="sel.fontSize" @change="emit" min="8" max="120" style="width:46px;padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;" />
        <input type="color" v-model="sel.color" @input="emit" style="width:26px;height:24px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <!-- EDPS color palette -->
        <span v-for="c in edpsColors" :key="c" @click="sel.color=c; emit()" :style="{display:'inline-block',width:'16px',height:'16px',borderRadius:'3px',background:c,border:'1px solid #aaa',cursor:'pointer',verticalAlign:'middle'}" :title="c"></span>
        <button @click="toggleBold" :style="{fontWeight:'bold',background:sel.bold?'var(--primary)':'#f1f5f9',color:sel.bold?'white':'#334155'}" class="secondary" style="width:26px;padding:0.2rem;font-size:0.85rem;">B</button>
        <button @click="toggleItalic" :style="{fontStyle:'italic',background:sel.italic?'var(--primary)':'#f1f5f9',color:sel.italic?'white':'#334155'}" class="secondary" style="width:26px;padding:0.2rem;font-size:0.85rem;">I</button>
        <button @click="toggleUnderline" :style="{textDecoration:'underline',background:sel.underline?'var(--primary)':'#f1f5f9',color:sel.underline?'white':'#334155'}" class="secondary" style="width:26px;padding:0.2rem;font-size:0.85rem;">U</button>
        <select v-model="sel.textAlign" @change="emit" style="padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;width:60px;">
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
      </template>

      <!-- Shape controls -->
      <template v-if="sel && sel.kind==='shape'">
        <input type="color" v-model="sel.fill" @input="emit" title="Fill" style="width:26px;height:24px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <input type="color" v-model="sel.stroke" @input="emit" title="Border" style="width:26px;height:24px;padding:1px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;" />
        <input type="number" v-model.number="sel.strokeWidth" @change="emit" min="0" max="10" title="Border width" style="width:38px;padding:0.25rem;font-size:0.8rem;border:1px solid #cbd5e1;border-radius:4px;" />
      </template>

      <!-- Image/video src + replace button -->
      <template v-if="sel && (sel.kind==='image'||sel.kind==='video')">
        <input v-model="sel.src" @change="emit" placeholder="URL..." style="flex:1;min-width:140px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1px solid #cbd5e1;border-radius:4px;margin-bottom:0;" />
        <button @click="triggerUpload(sel.kind); replaceTarget=selIdx" class="secondary" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;" title="Replace from file">📤</button>
        <button @click="openMediaPicker(sel.kind); replaceTarget=selIdx" class="secondary" style="width:auto;padding:0.2rem 0.5rem;font-size:0.78rem;" title="Replace from library">📂</button>
      </template>

      <span style="flex:1;"></span>

      <!-- Position/size + opacity inputs -->
      <template v-if="sel">
        <span style="font-size:0.7rem;color:#64748b;">x</span>
        <input type="number" v-model.number="sel.x" @change="emit" style="width:42px;padding:0.15rem;font-size:0.72rem;border:1px solid #cbd5e1;border-radius:3px;text-align:center;" />
        <span style="font-size:0.7rem;color:#64748b;">y</span>
        <input type="number" v-model.number="sel.y" @change="emit" style="width:42px;padding:0.15rem;font-size:0.72rem;border:1px solid #cbd5e1;border-radius:3px;text-align:center;" />
        <span style="font-size:0.7rem;color:#64748b;">w</span>
        <input type="number" v-model.number="sel.w" @change="emit" min="20" style="width:42px;padding:0.15rem;font-size:0.72rem;border:1px solid #cbd5e1;border-radius:3px;text-align:center;" />
        <span style="font-size:0.7rem;color:#64748b;">h</span>
        <input type="number" v-model.number="sel.h" @change="emit" min="10" style="width:42px;padding:0.15rem;font-size:0.72rem;border:1px solid #cbd5e1;border-radius:3px;text-align:center;" />
        <span style="font-size:0.7rem;color:#64748b;margin-left:4px;" title="Opacity">⊘</span>
        <input type="range" v-model.number="sel.opacity" @input="emit" min="0" max="1" step="0.05" style="width:50px;height:14px;cursor:pointer;" title="Opacity" />
        <span style="font-size:0.68rem;color:#94a3b8;">{{ Math.round((sel.opacity ?? 1) * 100) }}%</span>
      </template>

      <!-- Layer & action controls -->
      <template v-if="sel">
        <button @click="bringForward" class="secondary" title="Bring forward" style="width:auto;padding:0.2rem 0.4rem;font-size:0.78rem;">↑</button>
        <button @click="sendBackward" class="secondary" title="Send backward" style="width:auto;padding:0.2rem 0.4rem;font-size:0.78rem;">↓</button>
        <button @click="duplicateEl" class="secondary" title="Duplicate (Ctrl+D)" style="width:auto;padding:0.2rem 0.4rem;font-size:0.78rem;">📋</button>
        <button @click="deleteSelected" class="danger" style="width:auto;padding:0.2rem 0.4rem;font-size:0.78rem;">🗑</button>
      </template>
      <button v-if="selIdx>=0" @click="deselect" class="secondary" style="width:auto;padding:0.2rem 0.4rem;font-size:0.78rem;">✕</button>
    </div>

    <!-- Canvas wrapper -->
    <div @wheel="onWheel" style="overflow:auto;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;background:#888;display:flex;align-items:center;justify-content:center;min-height:380px;">
      <div :style="canvasWrapStyle">
        <div ref="canvas"
          :style="{position:'relative',width:W+'px',height:H+'px',background: slideBg || 'white',backgroundSize:'cover',backgroundPosition:'center',overflow:'hidden',transformOrigin:'top left',transform:`scale(${scale})`}"
          @mouseup="stopDrag"
          @mousemove="onMouseMove"
          @click.self="deselect"
        >
          <!-- #10 — Grid overlay -->
          <svg v-if="showGrid && !previewMode" :width="W" :height="H" style="position:absolute;inset:0;pointer-events:none;z-index:1;opacity:0.15;">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" stroke-width="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <line :x1="W/2" y1="0" :x2="W/2" :y2="H" stroke="#f00" stroke-width="0.5" stroke-dasharray="4"/>
            <line x1="0" :y1="H/2" :x2="W" :y2="H/2" stroke="#f00" stroke-width="0.5" stroke-dasharray="4"/>
          </svg>

          <!-- Alignment guides -->
          <div v-if="guides.vCenter" style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:#3b82f6;z-index:200;pointer-events:none;opacity:0.8;"></div>
          <div v-if="guides.hCenter" style="position:absolute;left:0;right:0;top:50%;height:1px;background:#3b82f6;z-index:200;pointer-events:none;opacity:0.8;"></div>

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
            @mousedown.stop="onElMouseDown(idx, $event)"
          >
            <!-- Text (show markdown preview when not editing) -->
            <div v-if="el.kind==='text' && editingIdx!==idx" @dblclick.stop="startEdit(idx)"
              :style="{...textStyle(el), width:'100%', height:'100%', overflow:'hidden', cursor: selIdx===idx ? 'move' : 'default', wordWrap:'break-word', whiteSpace:'pre-wrap', opacity: el.content ? 1 : 0.4}"
              v-html="renderMdPreview(el.content) || '<em style=&quot;color:#94a3b8&quot;>Double-click to edit...</em>'"></div>

            <!-- Textarea overlay for editing -->
            <textarea v-if="el.kind==='text' && editingIdx===idx" :value="el.content" @input="el.content=$event.target.value" @blur="stopEdit" @mousedown.stop ref="editTextarea"
              :style="{...textStyle(el), position:'absolute', inset:0, border:'2px solid var(--edps-blue)', resize:'none', padding:'2px', margin:0, background:'rgba(255,255,255,0.95)', zIndex:100, cursor:'text', boxSizing:'border-box'}"
              placeholder="Type here... (supports **Markdown**)"></textarea>

            <!-- Image -->
            <img v-if="el.kind==='image'" :src="resolveElUrl(el.src)" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" @error="$event.target.style.opacity='0.3'" />

            <!-- Video -->
            <video v-if="el.kind==='video' && isLocalVideo(el.src)" :src="resolveElUrl(el.src)" controls style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>
            <iframe v-else-if="el.kind==='video'" :src="toEmbedUrl(el.src)" style="width:100%;height:100%;border:none;pointer-events:none;" frameborder="0" allowfullscreen></iframe>

            <!-- Shape -->
            <div v-if="el.kind==='shape'" :style="shapeStyle(el)"></div>

            <!-- Selection handles (hidden in preview mode) -->
            <template v-if="!previewMode && selectedIndices.includes(idx)">
              <div :style="{position:'absolute',inset:'-2px',border: selIdx===idx ? '2px solid var(--edps-blue,#254A9A)' : '2px dashed #60a5fa',pointerEvents:'none'}"></div>
              <template v-if="selIdx===idx">
                <div v-for="handle in ['nw','ne','sw','se']" :key="handle" :style="handlePos(handle)" @mousedown.stop="startResize(idx, $event, handle)"></div>
                <div style="position:absolute;top:50%;right:-6px;width:12px;height:12px;background:#4a90d9;border-radius:50%;transform:translateY(-50%);cursor:e-resize;z-index:10;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);" @mousedown.stop="startResize(idx, $event,'e')"></div>
                <div style="position:absolute;bottom:-6px;left:50%;width:12px;height:12px;background:#4a90d9;border-radius:50%;transform:translateX(-50%);cursor:s-resize;z-index:10;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);" @mousedown.stop="startResize(idx, $event,'s')"></div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:0.3rem;font-size:0.72rem;color:#94a3b8;">
      <span>Dbl-click text to edit · Del delete · Ctrl+D duplicate · Ctrl+C/V copy · Shift+click multi-select · Alt disables snap · Arrows move (Shift=10px)</span>
    </div>

    <!-- Media Picker Modal -->
    <MediaPicker v-if="showMediaPicker" :filter="mediaPickerFilter" @select="onMediaPicked" @close="showMediaPicker=false" />
  </div>
</template>

<script>
import { toEmbedUrl, isLocalVideo } from '../utils/media.js';
import { authFetch } from '../auth.js';
import { baseUrl } from '../config.js';
import { marked } from 'marked';
import MediaPicker from './MediaPicker.vue';

let _nextZIndex = 100;

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
      multiSelIndices: [], // #9 — multi-select
      editingIdx: -1,
      drag: null,
      addUrlKind: null,
      addUrlValue: '',
      fonts: ['Segoe UI','Arial','Georgia','Courier New','Verdana','Times New Roman','Calibri','Impact'],
      edpsColors: ['#254A9A','#F1C064','#DCDACE','#333333','#ffffff','#ef4444','#10b981'], // #13 — EDPS palette
      showImageMenu: false,
      showVideoMenu: false,
      showShapeMenu: false,
      showBgMenu: false,
      showGrid: false,
      previewMode: false,
      uploadKind: null,
      uploading: false,
      showMediaPicker: false,
      mediaPickerFilter: 'all',
      clipboard: null,
      replaceTarget: -1,
      undoStack: [],
      redoStack: [],
      maxUndo: 30,
      guides: { vCenter: false, hCenter: false },
      bgOptions: [
        { label: 'Template Default', value: '', preview: 'linear-gradient(135deg,#ddd,#eee)' },
        { label: 'White', value: 'white', preview: 'white' },
        { label: 'EDPS Blue', value: '#254A9A', preview: '#254A9A' },
        { label: 'Light Gray', value: '#f1f5f9', preview: '#f1f5f9' },
        { label: 'EDPS Beige', value: '#DCDACE', preview: '#DCDACE' },
        { label: 'Blue Gradient', value: 'linear-gradient(135deg,#254A9A,#0f2b5e)', preview: 'linear-gradient(135deg,#254A9A,#0f2b5e)' },
      ],
      shapeList: [
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
    // #9 — combined selected indices
    selectedIndices() {
      const s = new Set(this.multiSelIndices);
      if (this.selIdx >= 0) s.add(this.selIdx);
      return Array.from(s);
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        this.localEls = JSON.parse(JSON.stringify(v || []));
        // Track max zIndex
        const maxZ = this.localEls.reduce((m, e) => Math.max(m, e.zIndex || 0), 0);
        if (maxZ >= _nextZIndex) _nextZIndex = maxZ + 1;
      },
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

    // #5 — Markdown preview in canvas
    renderMdPreview(text) {
      if (!text) return '';
      try { return marked.parse(text, { breaks: true }); } catch { return text; }
    },

    resolveElUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },

    closeMenus(e) {
      if (this.$refs.imageMenuRef && !this.$refs.imageMenuRef.contains(e.target)) this.showImageMenu = false;
      if (this.$refs.videoMenuRef && !this.$refs.videoMenuRef.contains(e.target)) this.showVideoMenu = false;
      if (this.$refs.shapeMenuRef && !this.$refs.shapeMenuRef.contains(e.target)) this.showShapeMenu = false;
      if (this.$refs.bgMenuRef && !this.$refs.bgMenuRef.contains(e.target)) this.showBgMenu = false;
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
        opacity: el.opacity ?? 1,
        cursor: 'move',
        boxSizing: 'border-box',
      };
    },
    textStyle(el) {
      return {
        fontSize: (el.fontSize || 18) + 'px',
        fontFamily: el.fontFamily || 'Segoe UI',
        fontWeight: el.bold ? 'bold' : 'normal',
        fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: el.underline ? 'underline' : 'none',
        color: el.color || '#333333',
        textAlign: el.textAlign || 'left',
        lineHeight: 1.4,
      };
    },
    shapeStyle(el) {
      const base = { width: '100%', height: '100%', background: el.fill || '#254A9A', border: `${el.strokeWidth || 0}px solid ${el.stroke || '#000'}` };
      if (el.shape === 'circle') base.borderRadius = '50%';
      else if (el.shape === 'roundrect') base.borderRadius = '12px';
      else if (el.shape === 'line') { base.height = `${el.strokeWidth || 3}px`; base.background = el.fill || '#254A9A'; base.borderRadius = '2px'; base.marginTop = (el.h / 2 - 1) + 'px'; base.border = 'none'; }
      else if (el.shape === 'arrow') { base.clipPath = 'polygon(0 30%, 70% 30%, 70% 0, 100% 50%, 70% 100%, 70% 70%, 0 70%)'; base.border = 'none'; }
      return base;
    },

    handlePos(corner) {
      const base = { position: 'absolute', width: '14px', height: '14px', background: 'var(--edps-blue,#254A9A)', borderRadius: '50%', zIndex: 10, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' };
      if (corner === 'nw') return { ...base, top: '-7px', left: '-7px', cursor: 'nw-resize' };
      if (corner === 'ne') return { ...base, top: '-7px', right: '-7px', cursor: 'ne-resize' };
      if (corner === 'sw') return { ...base, bottom: '-7px', left: '-7px', cursor: 'sw-resize' };
      return { ...base, bottom: '-7px', right: '-7px', cursor: 'se-resize' };
    },

    _newZIndex() { return _nextZIndex++; },

    addEl(kind) {
      const id = 'el_' + Date.now();
      const el = { id, kind, x: 80, y: 100, w: 500, h: 80, content: '', fontSize: 18, fontFamily: 'Segoe UI', bold: false, italic: false, underline: false, color: '#333333', textAlign: 'left', zIndex: this._newZIndex() };
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.multiSelIndices = [];
      this.emit();
    },

    addShape(shapeDef) {
      const id = 'el_' + Date.now();
      const el = { id, kind: 'shape', shape: shapeDef.shape, x: 200, y: 150, w: 200, h: shapeDef.shape === 'line' ? 6 : 150, fill: '#254A9A', stroke: '#1a3a7a', strokeWidth: 0, zIndex: this._newZIndex() };
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.multiSelIndices = [];
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
      if (this.addUrlKind === 'image') el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: url, zIndex: this._newZIndex() };
      else el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: url, zIndex: this._newZIndex() };
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
        // Replace existing element or add new
        if (this.replaceTarget >= 0 && this.localEls[this.replaceTarget]) {
          this.localEls[this.replaceTarget].src = data.url;
          this.replaceTarget = -1;
        } else {
          const id = 'el_' + Date.now();
          let el;
          if (this.uploadKind === 'image') el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: data.url, zIndex: this._newZIndex() };
          else el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: data.url, zIndex: this._newZIndex() };
          this.localEls.push(el);
          this.selIdx = this.localEls.length - 1;
        }
        this.emit();
      } catch (err) { alert('Upload failed: ' + err.message); } finally { this.uploading = false; }
    },

    openMediaPicker(filter) { this.mediaPickerFilter = filter; this.showMediaPicker = true; },
    onMediaPicked({ url, kind }) {
      // Replace existing element or add new
      if (this.replaceTarget >= 0 && this.localEls[this.replaceTarget]) {
        this.localEls[this.replaceTarget].src = url;
        this.replaceTarget = -1;
      } else {
        const id = 'el_' + Date.now();
        let el;
        if (kind === 'image') el = { id, kind: 'image', x: 200, y: 100, w: 350, h: 250, src: url, zIndex: this._newZIndex() };
        else el = { id, kind: 'video', x: 150, y: 100, w: 500, h: 300, src: url, zIndex: this._newZIndex() };
        this.localEls.push(el);
        this.selIdx = this.localEls.length - 1;
      }
      this.showMediaPicker = false;
      this.emit();
    },

    deleteSelected() {
      if (this.selectedIndices.length === 0) return;
      // Delete all selected (in reverse to preserve indices)
      const toDelete = [...this.selectedIndices].sort((a, b) => b - a);
      toDelete.forEach(i => this.localEls.splice(i, 1));
      this.selIdx = -1;
      this.multiSelIndices = [];
      this.editingIdx = -1;
      this.emit();
    },

    deselect() { this.selIdx = -1; this.multiSelIndices = []; this.editingIdx = -1; },

    toggleBold() { if (this.sel) { this.sel.bold = !this.sel.bold; this.emit(); } },
    toggleItalic() { if (this.sel) { this.sel.italic = !this.sel.italic; this.emit(); } },
    toggleUnderline() { if (this.sel) { this.sel.underline = !this.sel.underline; this.emit(); } },

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

    duplicateEl() {
      if (this.selIdx < 0) return;
      const copy = JSON.parse(JSON.stringify(this.localEls[this.selIdx]));
      copy.id = 'el_' + Date.now();
      copy.x = Math.min(this.W - copy.w, copy.x + 30);
      copy.y = Math.min(this.H - copy.h, copy.y + 30);
      copy.zIndex = this._newZIndex();
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
      el.x = Math.min(this.W - el.w, el.x + 30);
      el.y = Math.min(this.H - el.h, el.y + 30);
      el.zIndex = this._newZIndex();
      this.localEls.push(el);
      this.selIdx = this.localEls.length - 1;
      this.emit();
    },

    startEdit(idx) {
      this.selIdx = idx;
      this.multiSelIndices = [];
      this.editingIdx = idx;
      this.$nextTick(() => {
        const ta = this.$refs.editTextarea;
        const el = Array.isArray(ta) ? ta[0] : ta;
        if (el) { el.focus(); el.select(); }
      });
    },
    stopEdit() { this.editingIdx = -1; this.emit(); },

    // #9 — Multi-select with Shift+click
    onElMouseDown(idx, e) {
      if (e.shiftKey) {
        // Add/remove from multi-selection
        const i = this.multiSelIndices.indexOf(idx);
        if (i >= 0) this.multiSelIndices.splice(i, 1);
        else this.multiSelIndices.push(idx);
        if (this.selIdx < 0) this.selIdx = idx;
        e.preventDefault();
        return;
      }
      this.multiSelIndices = [];
      this.startDrag(idx, e);
    },

    startDrag(idx, e) {
      this.selIdx = idx;
      const el = this.localEls[idx];
      this.drag = { type: 'move', idx, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, altKey: e.altKey };
      e.preventDefault();
    },
    startResize(idx, e, dir) {
      const el = this.localEls[idx];
      this.drag = { type: 'resize', idx, dir, startX: e.clientX, startY: e.clientY, origW: el.w, origH: el.h, origX: el.x, origY: el.y, aspect: el.w / (el.h || 1) };
      e.preventDefault();
    },
    onMouseMove(e) {
      if (!this.drag) return;
      const dx = (e.clientX - this.drag.startX) / this.scale;
      const dy = (e.clientY - this.drag.startY) / this.scale;
      const el = this.localEls[this.drag.idx];
      if (this.drag.type === 'move') {
        let newX = Math.max(0, Math.min(this.W - el.w, Math.round(this.drag.origX + dx)));
        let newY = Math.max(0, Math.min(this.H - el.h, Math.round(this.drag.origY + dy)));

        // #8 — Alt key disables snap
        if (!e.altKey) {
          // #10 — Snap to grid (40px)
          if (this.showGrid) {
            newX = Math.round(newX / 40) * 40;
            newY = Math.round(newY / 40) * 40;
          }
          // Snap to center
          const cx = newX + el.w / 2;
          const cy = newY + el.h / 2;
          this.guides.vCenter = Math.abs(cx - this.W / 2) < 10;
          this.guides.hCenter = Math.abs(cy - this.H / 2) < 10;
          if (this.guides.vCenter) newX = Math.round(this.W / 2 - el.w / 2);
          if (this.guides.hCenter) newY = Math.round(this.H / 2 - el.h / 2);
        } else {
          this.guides.vCenter = false;
          this.guides.hCenter = false;
        }

        // Move multi-selected elements together (#9)
        const deltaX = newX - el.x;
        const deltaY = newY - el.y;
        if (this.multiSelIndices.length > 0) {
          for (const i of this.multiSelIndices) {
            if (i !== this.drag.idx) {
              this.localEls[i].x = Math.max(0, Math.min(this.W - this.localEls[i].w, this.localEls[i].x + deltaX));
              this.localEls[i].y = Math.max(0, Math.min(this.H - this.localEls[i].h, this.localEls[i].y + deltaY));
            }
          }
        }
        el.x = newX;
        el.y = newY;
      } else {
        // Resize — #2 fix: handle all directions correctly
        const dir = this.drag.dir;
        let newW = this.drag.origW, newH = this.drag.origH;
        let newX = this.drag.origX, newY = this.drag.origY;

        if (dir.includes('e')) newW = Math.max(40, Math.round(this.drag.origW + dx));
        if (dir.includes('w')) { newW = Math.max(40, Math.round(this.drag.origW - dx)); newX = Math.round(this.drag.origX + dx); }
        if (dir.includes('s')) newH = Math.max(20, Math.round(this.drag.origH + dy));
        if (dir.includes('n')) { newH = Math.max(20, Math.round(this.drag.origH - dy)); newY = Math.round(this.drag.origY + dy); }

        // #8 — Shift for aspect ratio lock (fixed for all corners)
        if (e.shiftKey && (dir === 'se' || dir === 'nw' || dir === 'ne' || dir === 'sw')) {
          const a = this.drag.aspect;
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = Math.max(20, Math.round(newW / a));
            if (dir.includes('n')) newY = this.drag.origY + this.drag.origH - newH;
          } else {
            newW = Math.max(40, Math.round(newH * a));
            if (dir.includes('w')) newX = this.drag.origX + this.drag.origW - newW;
          }
        }

        el.w = newW;
        el.h = newH;
        el.x = Math.max(0, newX);
        el.y = Math.max(0, newY);
      }
    },
    stopDrag() {
      if (this.drag) {
        this.drag = null;
        this.guides = { vCenter: false, hCenter: false };
        this.emit();
      }
    },

    // Undo/Redo
    _saveUndoSnapshot() {
      this.undoStack.push(JSON.stringify(this.localEls));
      if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
      this.redoStack = [];
    },
    undo() {
      if (this.undoStack.length === 0) return;
      this.redoStack.push(JSON.stringify(this.localEls));
      this.localEls = JSON.parse(this.undoStack.pop());
      this.selIdx = -1;
      this.multiSelIndices = [];
      this.editingIdx = -1;
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.localEls)));
    },
    redo() {
      if (this.redoStack.length === 0) return;
      this.undoStack.push(JSON.stringify(this.localEls));
      this.localEls = JSON.parse(this.redoStack.pop());
      this.selIdx = -1;
      this.multiSelIndices = [];
      this.editingIdx = -1;
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.localEls)));
    },

    // Zoom
    zoomIn() { this.scale = Math.min(1.5, this.scale + 0.1); },
    zoomOut() { this.scale = Math.max(0.25, this.scale - 0.1); },
    onWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) this.zoomIn();
        else this.zoomOut();
      }
    },

    onKeyDown(e) {
      if (this.editingIdx >= 0) return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { this.undo(); e.preventDefault(); }
      else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { this.redo(); e.preventDefault(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); e.preventDefault(); }
      else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) { this.duplicateEl(); e.preventDefault(); }
      else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { this.copyEl(); e.preventDefault(); }
      else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) { this.pasteEl(); e.preventDefault(); }
      else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        this.multiSelIndices = this.localEls.map((_, i) => i);
        if (this.localEls.length > 0) this.selIdx = 0;
        e.preventDefault();
      }
      else if (e.key === '=' && (e.ctrlKey || e.metaKey)) { this.zoomIn(); e.preventDefault(); }
      else if (e.key === '-' && (e.ctrlKey || e.metaKey)) { this.zoomOut(); e.preventDefault(); }
      else if (e.key === 'Escape') { this.deselect(); }
      else if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && this.selIdx >= 0) {
        const step = e.shiftKey ? 10 : 1;
        const el = this.localEls[this.selIdx];
        if (e.key === 'ArrowUp') el.y = Math.max(0, el.y - step);
        else if (e.key === 'ArrowDown') el.y = Math.min(this.H - el.h, el.y + step);
        else if (e.key === 'ArrowLeft') el.x = Math.max(0, el.x - step);
        else if (e.key === 'ArrowRight') el.x = Math.min(this.W - el.w, el.x + step);
        this.emit();
        e.preventDefault();
      }
    },

    emit() {
      this._saveUndoSnapshot();
      this.$emit('update:modelValue', JSON.parse(JSON.stringify(this.localEls)));
    },
  },
};
</script>
