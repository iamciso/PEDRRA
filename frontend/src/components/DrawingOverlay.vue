<template>
  <div style="position:absolute;inset:0;z-index:50;pointer-events:none;">
    <!-- SVG canvas for strokes (scales with parent transform) -->
    <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" style="position:absolute;inset:0;width:100%;height:100%;">
      <polyline v-for="(s, i) in allStrokes" :key="'s-'+i"
        :points="s.points.map(p => p[0]+','+p[1]).join(' ')"
        :stroke="s.color" :stroke-width="s.width" fill="none"
        stroke-linecap="round" stroke-linejoin="round" />
      <!-- Current in-progress stroke -->
      <polyline v-if="currentStroke.length > 0"
        :points="currentStroke.map(p => p[0]+','+p[1]).join(' ')"
        :stroke="penColor" :stroke-width="penWidth" fill="none"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>

    <!-- Laser pointer indicator (received from remote) -->
    <div v-if="pointer.visible"
      :style="{position:'absolute',left:(pointer.x/W*100)+'%',top:(pointer.y/H*100)+'%',width:'16px',height:'16px',borderRadius:'50%',background:'rgba(239,68,68,0.7)',boxShadow:'0 0 12px 4px rgba(239,68,68,0.5)',transform:'translate(-50%,-50%)',pointerEvents:'none',transition:'left 0.05s,top 0.05s'}">
    </div>

    <!-- Touch capture layer (only when drawing is active) -->
    <div v-if="active" style="position:absolute;inset:0;pointer-events:auto;touch-action:none;cursor:crosshair;"
      @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp"
      @touchstart.prevent="onTouchDown" @touchmove.prevent="onTouchMove" @touchend.prevent="onUp">
    </div>

    <!-- Drawing toolbar (only when active and sendMode) -->
    <div v-if="active && sendMode" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px;background:rgba(0,0,0,0.75);padding:6px 12px;border-radius:20px;pointer-events:auto;align-items:center;z-index:60;">
      <!-- Colors -->
      <button v-for="c in colors" :key="c" @click="penColor=c"
        :style="{width:'28px',height:'28px',borderRadius:'50%',border:penColor===c?'3px solid white':'2px solid rgba(255,255,255,0.4)',background:c,cursor:'pointer',flexShrink:0,padding:0}"
        :aria-label="'Pen color '+c"></button>
      <span style="width:1px;height:20px;background:rgba(255,255,255,0.3);"></span>
      <!-- Widths -->
      <button v-for="w in widths" :key="w.v" @click="penWidth=w.v"
        :style="{width:'28px',height:'28px',borderRadius:'50%',border:penWidth===w.v?'2px solid white':'2px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.15)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}"
        :aria-label="w.label+' pen'">
        <span :style="{width:w.v*2+'px',height:w.v*2+'px',borderRadius:'50%',background:'white'}"></span>
      </button>
      <span style="width:1px;height:20px;background:rgba(255,255,255,0.3);"></span>
      <!-- Clear -->
      <button @click="$emit('clear')" style="background:rgba(239,68,68,0.8);color:white;border:none;padding:4px 12px;border-radius:12px;font-size:0.8rem;cursor:pointer;font-weight:bold;" aria-label="Clear all drawings">Clear</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DrawingOverlay',
  props: {
    active: { type: Boolean, default: false },
    sendMode: { type: Boolean, default: false }, // true = trainer draws, false = display only
    strokes: { type: Array, default: () => [] }, // received strokes from socket
    pointer: { type: Object, default: () => ({ x: 0, y: 0, visible: false }) },
  },
  emits: ['stroke', 'clear', 'pointer'],
  data() {
    return {
      W: 1024, H: 576,
      drawing: false,
      currentStroke: [], // [[x,y], ...]
      penColor: '#ef4444',
      penWidth: 3,
      localStrokes: [], // locally drawn strokes (for sender feedback)
      colors: ['#ef4444', '#254A9A', '#10b981', '#333333', '#f59e0b', '#ffffff'],
      widths: [
        { v: 2, label: 'Thin' },
        { v: 4, label: 'Medium' },
        { v: 8, label: 'Thick' },
      ],
    };
  },
  computed: {
    allStrokes() {
      return [...this.strokes, ...this.localStrokes];
    },
  },
  methods: {
    getCoords(e) {
      const svg = this.$el?.querySelector('svg');
      if (!svg) return [0, 0];
      const rect = svg.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / rect.width * this.W);
      const y = Math.round((e.clientY - rect.top) / rect.height * this.H);
      return [Math.max(0, Math.min(this.W, x)), Math.max(0, Math.min(this.H, y))];
    },
    onDown(e) {
      if (!this.sendMode) return;
      this.drawing = true;
      const pt = this.getCoords(e);
      this.currentStroke = [pt];
      this.$emit('pointer', { x: pt[0], y: pt[1], visible: true });
    },
    onMove(e) {
      if (!this.drawing) {
        if (this.sendMode && e.buttons === 0) {
          // Laser pointer mode (hover without pressing)
          const pt = this.getCoords(e);
          this.$emit('pointer', { x: pt[0], y: pt[1], visible: true });
        }
        return;
      }
      const pt = this.getCoords(e);
      this.currentStroke.push(pt);
    },
    onUp() {
      if (this.drawing && this.currentStroke.length > 1) {
        const stroke = {
          color: this.penColor,
          width: this.penWidth,
          points: this.currentStroke,
        };
        this.localStrokes.push(stroke);
        this.$emit('stroke', stroke);
      }
      this.drawing = false;
      this.currentStroke = [];
      this.$emit('pointer', { x: 0, y: 0, visible: false });
    },
    onTouchDown(e) {
      const t = e.touches[0];
      if (t) this.onDown({ clientX: t.clientX, clientY: t.clientY, buttons: 1 });
    },
    onTouchMove(e) {
      const t = e.touches[0];
      if (t) this.onMove({ clientX: t.clientX, clientY: t.clientY, buttons: 1 });
    },
    clearLocal() {
      this.localStrokes = [];
      this.currentStroke = [];
    },
  },
  watch: {
    // Clear local strokes when parent clears
    strokes(v) {
      if (v.length === 0) this.localStrokes = [];
    },
  },
};
</script>
