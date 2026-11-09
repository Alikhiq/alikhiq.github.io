// Shared timeline helpers for the Susu ads. Everything is a pure function of t (seconds).
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inCubic: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  smooth: (t) => t * t * (3 - 2 * t),
};
// in/out envelope: 0 before a, eases to 1 over [a,b], holds, eases to 0 over [c,d]
const env = (t, a, b, c, d, ein = E.outCubic, eout = E.inOutSine) => {
  if (t <= a || t >= d) return 0;
  if (t < b) return ein(seg(t, a, b));
  if (t <= c) return 1;
  return 1 - eout(seg(t, c, d));
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// split an element's text into word spans (keeps <em>/<br> structure)
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  return $$('.w', el);
}
// rise-in / drift-out for word spans
function animWords(words, t, t0, stagger, dur, out = null, o = {}) {
  const dy = o.dy ?? 34, bl = o.blur ?? 10;
  words.forEach((w, i) => {
    const p = E.outQuart(seg(t, t0 + i * stagger, t0 + i * stagger + dur));
    let op = p, y = (1 - p) * dy, b = (1 - p) * bl, sc = 1;
    if (out) { // [start, dur]
      const q = E.inOutSine(seg(t, out[0] + i * (out[2] ?? 0.02), out[0] + i * (out[2] ?? 0.02) + out[1]));
      op *= 1 - q; y -= q * (o.outDy ?? 18); b += q * (o.outBlur ?? 8);
    }
    w.style.opacity = op.toFixed(3);
    w.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
    w.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  });
}
function setEl(el, { op, x = 0, y = 0, s = 1, blur = 0, rot = 0, extra = '' } = {}) {
  if (op !== undefined) el.style.opacity = clamp(op).toFixed(3);
  el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(5)}) rotate(${rot.toFixed(3)}deg) ${extra}`;
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
}

// deterministic PRNG
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// gold dust: soft points + a few bokeh discs, drifting upward, twinkling
class Dust {
  constructor(canvas, { n = 120, seed = 7, size = [1, 3.2], bokeh = 0.06, speed = 18, color = [255, 222, 176], depth = 1 } = {}) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.W = canvas.width = canvas.clientWidth || 1080; this.H = canvas.height = canvas.clientHeight || 1920;
    const r = rng(seed);
    this.p = Array.from({ length: n }, () => {
      const big = r() < bokeh;
      return { x: r() * this.W, y: r() * this.H, s: big ? 6 + r() * 16 : size[0] + r() * (size[1] - size[0]), big,
        v: speed * (0.4 + r()) * (big ? 0.6 : 1), ph: r() * 6.28, f: 0.6 + r() * 2.2, sw: 6 + r() * 18, a: 0.35 + r() * 0.65 };
    });
    this.col = color; this.depth = depth;
    // sprite
    const sp = document.createElement('canvas'); sp.width = sp.height = 64; const g = sp.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.18, `rgba(${color},.75)`); gr.addColorStop(0.5, `rgba(${color},.14)`); gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this.sp = sp;
    const sb = document.createElement('canvas'); sb.width = sb.height = 64; const h = sb.getContext('2d');
    const hb = h.createRadialGradient(32, 32, 0, 32, 32, 32);
    hb.addColorStop(0, `rgba(${color},.32)`); hb.addColorStop(0.7, `rgba(${color},.22)`); hb.addColorStop(0.9, `rgba(${color},.08)`); hb.addColorStop(1, `rgba(${color},0)`);
    h.fillStyle = hb; h.fillRect(0, 0, 64, 64); this.sb = sb;
  }
  draw(t, alpha = 1, { dx = 0, dy = 0 } = {}) {
    const { x, W, H } = this; x.clearRect(0, 0, W, H);
    if (alpha <= 0.003) return;
    x.globalCompositeOperation = 'lighter';
    for (const p of this.p) {
      const yy = ((p.y - t * p.v + dy * this.depth) % (H + 80) + H + 80) % (H + 80) - 40;
      const xx = p.x + Math.sin(t * 0.35 + p.ph) * p.sw + dx * this.depth;
      const tw = p.big ? 0.8 + 0.2 * Math.sin(t * p.f + p.ph) : 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * p.f * 1.6 + p.ph * 7), 3);
      x.globalAlpha = clamp(alpha * p.a * tw);
      const s = p.s * (p.big ? 2 : 5);
      x.drawImage(p.big ? this.sb : this.sp, xx - s / 2, yy - s / 2, s, s);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
}

// image sequence on an <img>: swaps src and waits for decode
const _decodes = [];
function seqFrame(img, url) {
  if (img.dataset.src === url) return;
  img.dataset.src = url; img.src = url;
  _decodes.push(img.decode().catch(() => {}));
}
async function flushDecodes() { while (_decodes.length) await _decodes.shift(); }
const pad = (n, k = 5) => String(n).padStart(k, '0');
// 3D logo render (logo-local seconds) -> frame url
const logoFrame = (tl) => `/frames/logo/${pad(clamp(Math.round(tl * 30), 0, 479), 5)}.png`;

function grainJitter(el, t) {
  const r = rng(Math.round(t * 30) + 11);
  el.style.transform = `translate(${(r() * 60 - 30).toFixed(0)}px,${(r() * 60 - 30).toFixed(0)}px)`;
}
async function preload(urls) { await Promise.all(urls.map((u) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = u; }))); }
