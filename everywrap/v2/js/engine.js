// EveryWrap stage engine.
// Draws image sets (full-frame plates or transparent cutouts) on a canvas and
// runs the "seam": a straight glowing line that wipes between a BEFORE set and
// an AFTER set, starting from the car's nose. Any number of angle frames per
// set is supported; with more than one, dragging rotates the car.

const cache = new Map();

export function loadImage(src) {
  if (cache.has(src)) return cache.get(src);
  const p = new Promise((resolve) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
  cache.set(src, p);
  return p;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);

export class Stage {
  constructor(canvas, { base = "assets/", reduceMotion = false } = {}) {
    this.c = canvas;
    this.x = canvas.getContext("2d");
    this.base = base;
    this.reduce = reduceMotion;
    this.vehicle = null;        // manifest entry
    this.before = null;         // { frames: [Image] }
    this.after = null;
    this.prevAfter = null;      // for crossfade when the after set changes
    this.fade = 1;              // 0..1 crossfade prevAfter -> after
    this.afterAlpha = 1;        // tint strength etc.
    this.seam = 0.5;            // 0..1 across the car box, measured from the nose
    this.seamOn = true;
    this.mask = null;           // optional coverage mask image (white on transparent)
    this.maskT = 0;
    this.angle = 0;             // frame position, float
    this.region = { x0: 0, y0: 0, x1: 1, y1: 1 }; // where the car should sit, in canvas fractions
    this.bg = "#000";
    this.accent = "255,236,205";
    this.par = { x: 0, y: 0 };
    this.fit = 0.94;            // how much of the region width the car may take
    this.tweens = new Set();
    this.dirty = true;
    this.raf = 0;
    this.scratch = document.createElement("canvas");
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.invalidate();
  }

  invalidate() {
    this.dirty = true;
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  tween(obj, key, to, ms = 700, done) {
    for (const tw of this.tweens) if (tw.obj === obj && tw.key === key) this.tweens.delete(tw);
    if (this.reduce || ms <= 0) { obj[key] = to; this.invalidate(); if (done) done(); return; }
    this.tweens.add({ obj, key, from: obj[key], to, ms, t0: performance.now(), done });
    this.invalidate();
  }

  tick(now) {
    this.raf = 0;
    for (const tw of this.tweens) {
      const k = clamp((now - tw.t0) / tw.ms, 0, 1);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * ease(k);
      if (k >= 1) { this.tweens.delete(tw); if (tw.done) tw.done(); }
      this.dirty = true;
    }
    if (this.mask) { this.maskT = (now / 3600) % 1; this.dirty = true; }
    if (this.dirty) { this.dirty = false; this.draw(); }
    if (this.tweens.size || (this.mask && !this.reduce)) this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  async loadSet(vehicle, setId) {
    const set = vehicle.sets[setId];
    if (!set) return null;
    const frames = await Promise.all(set.frames.map((f) => loadImage(this.base + f)));
    return { id: setId, kind: set.kind || "plate", frames: frames.filter(Boolean) };
  }

  // Show a vehicle with a before/after pair. Resolves when the images are on screen.
  async show(vehicle, beforeId, afterId, { sweep = true, afterAlpha = 1, seam = true, maskSrc = null } = {}) {
    const token = (this.token = (this.token || 0) + 1);
    const [b, a, m] = await Promise.all([
      this.loadSet(vehicle, beforeId),
      afterId ? this.loadSet(vehicle, afterId) : null,
      maskSrc ? loadImage(this.base + maskSrc) : null,
    ]);
    if (token !== this.token) return;
    const sameVehicle = this.vehicle === vehicle;
    this.vehicle = vehicle;
    const beforeChanged = !this.before || !b || this.before.id !== b.id || !sameVehicle;
    if (this.after && a && sameVehicle && !beforeChanged) { this.prevAfter = this.after; this.fade = 0; }
    else { this.prevAfter = null; this.fade = 1; }
    this.before = b; this.after = a; this.mask = m; this.seamOn = seam;
    this.tween(this, "afterAlpha", afterAlpha, 500);
    if (this.prevAfter) this.tween(this, "fade", 1, 650, () => { this.prevAfter = null; });
    if (sweep && seam && a) { const rest = this.seam; this.seam = 0; this.tween(this, "seam", rest, 1100); }
    this.angle = clamp(this.angle, 0, Math.max(0, (b ? b.frames.length : 1) - 1));
    this.invalidate();
  }

  setSeam(v, animate = false) { animate ? this.tween(this, "seam", clamp(v, 0, 1), 800) : ((this.seam = clamp(v, 0, 1)), this.invalidate()); }
  setRegion(r) { this.region = r; this.invalidate(); }
  setParallax(x, y) { this.par.x = x; this.par.y = y; this.invalidate(); }
  frameCount() { return this.before ? this.before.frames.length : 0; }
  rotate(delta) { const n = this.frameCount(); if (n < 2) return; this.angle = (((this.angle + delta) % n) + n) % n; this.invalidate(); }

  // Where the image lands on the canvas: scale so the car box fits the region.
  layout(im) {
    const W = this.c.width, H = this.c.height, v = this.vehicle, box = this.carBox(), R = this.region;
    const rw = (R.x1 - R.x0) * W, rh = (R.y1 - R.y0) * H;
    const bw = (box[2] - box[0]) * im.width, bh = (box[3] - box[1]) * im.height;
    const cover = Math.max(W / im.width, H / im.height);
    let s = Math.min((rw * this.fit) / bw, (rh * 0.94) / bh);
    const cx = R.x0 * W + rw / 2, cy = R.y0 * H + rh * (v.anchorY ?? 0.56);
    const bx = ((box[0] + box[2]) / 2) * im.width, by = ((box[1] + box[3]) / 2) * im.height;
    const dx = cx - bx * s + this.par.x * W * 0.008, dy = cy - by * s + this.par.y * H * 0.006;
    return { s, dx, dy, w: im.width * s, h: im.height * s, box: { x0: dx + box[0] * im.width * s, y0: dy + box[1] * im.height * s, x1: dx + box[2] * im.width * s, y1: dy + box[3] * im.height * s } };
  }

  fi() { const n = this.frameCount(); return n ? Math.round(this.angle) % n : 0; }
  noseLeft() { const v = this.vehicle; if (!v) return true; const n = Array.isArray(v.nose) ? v.nose[this.fi()] ?? v.nose[0] : v.nose; return n !== "right"; }
  carBox() { const b = this.vehicle.carBox; return Array.isArray(b[0]) ? b[this.fi()] ?? b[0] : b; }

  frame(set) {
    if (!set || !set.frames.length) return null;
    const n = set.frames.length;
    return set.frames[Math.round(this.angle) % n];
  }

  draw() {
    const c = this.c, x = this.x, W = c.width, H = c.height;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    x.fillStyle = this.bg; x.fillRect(0, 0, W, H);
    const bIm = this.frame(this.before);
    if (!bIm || !this.vehicle) return;
    const L = this.layout(bIm), noseLeft = this.noseLeft();
    const cut = this.before.kind === "cutout";
    if (cut) this.drawStudio(L);
    x.drawImage(bIm, L.dx, L.dy, L.w, L.h);
    // seam position in canvas px, measured from the nose
    const sx = noseLeft ? L.box.x0 + (L.box.x1 - L.box.x0) * this.seam : L.box.x1 - (L.box.x1 - L.box.x0) * this.seam;
    const clipAfter = () => { x.beginPath(); if (!this.seamOn) x.rect(0, 0, W, H); else if (noseLeft) x.rect(0, 0, sx, H); else x.rect(sx, 0, W - sx, H); x.clip(); };
    const aIm = this.frame(this.after), pIm = this.frame(this.prevAfter);
    if (aIm || pIm) {
      x.save(); clipAfter();
      if (pIm && this.fade < 1) { x.globalAlpha = this.afterAlpha; x.drawImage(pIm, L.dx, L.dy, L.w, L.h); }
      if (aIm) { x.globalAlpha = this.afterAlpha * (pIm ? this.fade : 1); x.drawImage(aIm, L.dx, L.dy, L.w, L.h); }
      x.restore();
    }
    if (this.mask) this.drawMask(L, clipAfter);
    if (!cut) this.feather(L);
    if (this.seamOn && aIm) this.drawSeam(sx, L);
    this.box = { x0: L.box.x0 / W, x1: L.box.x1 / W, y0: L.box.y0 / H, y1: L.box.y1 / H };
    if (this.onDraw) this.onDraw();
  }

  // Coverage sheen (PPF): a moving band of light, clipped to the mask.
  drawMask(L, clipAfter) {
    const s = this.scratch, W = this.c.width, H = this.c.height;
    if (s.width !== W || s.height !== H) { s.width = W; s.height = H; }
    const g = s.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H);
    g.drawImage(this.mask, L.dx, L.dy, L.w, L.h);
    g.globalCompositeOperation = "source-in";
    const t = this.reduce ? 0.5 : this.maskT, span = L.w * 1.6, gx = L.dx - L.w * 0.3 + (1 - t) * span - span * 0.25;
    const gr = g.createLinearGradient(gx, 0, gx + L.w * 0.45, L.h * 0.25);
    gr.addColorStop(0, "rgba(255,255,255,.20)"); gr.addColorStop(0.5, "rgba(230,250,255,.85)"); gr.addColorStop(1, "rgba(255,255,255,.20)");
    g.fillStyle = "rgba(255,255,255,.20)"; g.fillRect(0, 0, W, H);
    g.fillStyle = gr; g.fillRect(gx, 0, L.w * 0.45, H);
    const x = this.x; x.save(); clipAfter(); x.globalCompositeOperation = "screen"; x.drawImage(s, 0, 0); x.restore();
  }

  // Soft edges so a plate that does not cover the canvas melts into the stage colour.
  feather(L) {
    const x = this.x, W = this.c.width, H = this.c.height, f = Math.max(40, Math.min(W, H) * 0.22);
    const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, this.bg); g.addColorStop(1, this.rgba0()); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
    x.fillStyle = this.bg;
    if (L.dx > 0) { x.fillRect(0, 0, L.dx + 1, H); edge(L.dx, 0, L.dx + f, 0, L.dx, 0, f, H); }
    if (L.dx + L.w < W) { x.fillRect(L.dx + L.w - 1, 0, W, H); edge(L.dx + L.w, 0, L.dx + L.w - f, 0, L.dx + L.w - f, 0, f, H); }
    if (L.dy > 0) { x.fillRect(0, 0, W, L.dy + 1); edge(0, L.dy, 0, L.dy + f, 0, L.dy, W, f); }
    if (L.dy + L.h < H) { x.fillRect(0, L.dy + L.h - 1, W, H); edge(0, L.dy + L.h, 0, L.dy + L.h - f, 0, L.dy + L.h - f, W, f); }
  }
  rgba0() { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(this.bg); return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},0)` : "rgba(0,0,0,0)"; }

  // For transparent cutouts the studio is drawn in code: one long light and a floor reflection.
  drawStudio(L) {
    const x = this.x, W = this.c.width, H = this.c.height, b = L.box, bw = b.x1 - b.x0;
    x.save();
    const ly = Math.max(H * 0.04, b.y0 - (b.y1 - b.y0) * 0.75), lh = Math.max(6, H * 0.022);
    const lg = x.createLinearGradient(b.x0 - bw * 0.1, 0, b.x1 + bw * 0.1, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.12, "rgba(255,252,244,.95)"); lg.addColorStop(0.88, "rgba(255,252,244,.95)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    x.shadowColor = "rgba(255,244,224,.55)"; x.shadowBlur = H * 0.12; x.fillStyle = lg;
    x.transform(1, 0, -0.35, 1, 0, 0); x.fillRect(b.x0 + ly * 0.35, ly, bw * 1.05, lh);
    x.restore();
    const im = this.frame(this.after) || this.frame(this.before);
    if (!im) return;
    x.save();
    const floorY = b.y1 - (b.y1 - b.y0) * 0.04;
    x.beginPath(); x.rect(0, floorY, W, H - floorY); x.clip();
    x.translate(0, floorY * 2); x.scale(1, -1); x.globalAlpha = 0.22; x.filter = "blur(" + Math.round(H * 0.006) + "px)";
    x.drawImage(im, L.dx, L.dy, L.w, L.h);
    x.restore();
    const fg = x.createLinearGradient(0, floorY, 0, floorY + (b.y1 - b.y0) * 0.45);
    fg.addColorStop(0, this.rgba0()); fg.addColorStop(1, this.bg);
    x.fillStyle = fg; x.fillRect(0, floorY, W, H - floorY);
  }

  drawSeam(sx, L) {
    const x = this.x, b = L.box, pad = (b.y1 - b.y0) * 0.1, y0 = b.y0 - pad, y1 = b.y1 + pad * 0.5, g = Math.max(5, this.c.width * 0.0035);
    x.save();
    x.globalCompositeOperation = "screen";
    const s = this.scratch, W = this.c.width, H = this.c.height;
    if (s.width !== W || s.height !== H) { s.width = W; s.height = H; }
    const q = s.getContext("2d"); q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "source-over"; q.clearRect(0, 0, W, H);
    const glow = q.createLinearGradient(sx - g, 0, sx + g, 0);
    glow.addColorStop(0, `rgba(${this.accent},0)`); glow.addColorStop(0.5, `rgba(${this.accent},.28)`); glow.addColorStop(1, `rgba(${this.accent},0)`);
    q.fillStyle = glow; q.fillRect(sx - g, y0, g * 2, y1 - y0);
    q.globalCompositeOperation = "destination-in";
    const v = q.createLinearGradient(0, y0, 0, y1);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.25, "rgba(0,0,0,1)"); v.addColorStop(0.75, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)");
    q.fillStyle = v; q.fillRect(0, 0, W, H);
    x.drawImage(s, 0, 0);
    const line = x.createLinearGradient(0, y0, 0, y1);
    line.addColorStop(0, `rgba(${this.accent},0)`); line.addColorStop(0.2, `rgba(${this.accent},.85)`); line.addColorStop(0.8, `rgba(${this.accent},.85)`); line.addColorStop(1, `rgba(${this.accent},0)`);
    x.fillStyle = line; x.fillRect(sx - 1, y0, 2, y1 - y0);
    x.restore();
    this.seamX = sx / this.c.width; this.seamBox = { y0: y0 / this.c.height, y1: y1 / this.c.height, x0: b.x0 / this.c.width, x1: b.x1 / this.c.width };
  }
}
