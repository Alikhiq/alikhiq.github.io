// The nine Canvas2D overlay families. Each factory reads its shape from the seeded rng `r` once and returns
// { draw(F) }, where F is the shared frame object { g, W, H, M, cx, cy, t, dt, I, S }.
// Draw loops reuse their buffers: nothing but canvas color strings is created per frame.
import { A } from '../audio/analysis.js';
import { TAU } from '../core/rng.js';

const rgbCache = {};
export function rgba(hex, a) {
  let c = rgbCache[hex];
  if (!c) c = rgbCache[hex] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
}

export const FAM = {
  rings(r, P) {
    const n = 3 + (r() * 6 | 0), base = .06 + r() * .12, gap = .035 + r() * .05, wob = .3 + r() * .9, strokes = 2 + (r() * 3 | 0), lobes = 2 + (r() * 7 | 0);
    const band = ['bass', 'mid', 'level'][r() * 3 | 0], spin = (r() - .5) * .8;
    return { draw(F) {
      const { g, M, cx, cy, t } = F; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const k = 1 - i / n, rad = (base + i * gap) * M * (1 + A[band] * .6 * k * F.I), c = P.c[i % 3];
        for (let s = 0; s < strokes; s++) {
          const st = t * spin * (1 + i * .2) + s * 1.3, ph = s * 1.7 + i;
          g.beginPath();
          for (let j = 0; j <= 72; j++) {
            const a = j / 72 * TAU, rr = rad * (1 + Math.sin(a * lobes + st * 2 + ph) * .02 * wob * (1 + A.high * 3 * F.I));
            const x = cx + Math.cos(a + st) * rr, y = cy + Math.sin(a + st) * rr; j ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.strokeStyle = rgba(c, .25 + .5 * k); g.lineWidth = M * (.002 + .004 * k * (1 + A.bass)); g.stroke();
        }
      }
    } };
  },
  bolts(r, P) {
    const from = ['center', 'edge', 'top'][r() * 3 | 0], rough = .25 + r() * .25, branch = .3 + r() * .4, many = 1 + (r() * 3 | 0);
    const list = []; let acc = 0;
    function path(x1, y1, x2, y2, d, disp, out) {
      if (d === 0) { out.push(x2, y2); return; }
      const mx = (x1 + x2) / 2 + (Math.random() - .5) * disp, my = (y1 + y2) / 2 + (Math.random() - .5) * disp;
      path(x1, y1, mx, my, d - 1, disp / 2, out); path(mx, my, x2, y2, d - 1, disp / 2, out);
    }
    function spawn(F, scale) {
      if (list.length >= 40) return;
      const { M, cx, cy, W, H } = F; let x1, y1, x2, y2;
      if (from === 'center') { x1 = cx; y1 = cy; const a = Math.random() * TAU, len = M * (.25 + Math.random() * .3) * scale; x2 = cx + Math.cos(a) * len; y2 = cy + Math.sin(a) * len; }
      else if (from === 'top') { x1 = cx + (Math.random() - .5) * W * .7; y1 = 0; x2 = x1 + (Math.random() - .5) * M * .5; y2 = H * (.45 + Math.random() * .5) * (scale < 1 ? .6 : 1); }
      else { const a = Math.random() * TAU; x1 = cx + Math.cos(a) * M * .75; y1 = cy + Math.sin(a) * M * .75; x2 = cx + (Math.random() - .5) * M * .12; y2 = cy + (Math.random() - .5) * M * .12; }
      const pts = [x1, y1]; path(x1, y1, x2, y2, 6, Math.hypot(x2 - x1, y2 - y1) * rough, pts); list.push({ pts, life: 1, w: scale });
      if (Math.random() < branch) {
        const i = (pts.length / 4 | 0) * 2, bx = pts[i], by = pts[i + 1], ba = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - .5) * 1.6, bl = Math.hypot(x2 - x1, y2 - y1) * .4;
        const b = [bx, by]; path(bx, by, bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl, 5, bl * rough, b); list.push({ pts: b, life: .8, w: scale * .6 });
      }
    }
    return { draw(F) {
      const { g, M, dt } = F;
      if (A.beat) for (let k = 0; k < many; k++) spawn(F, 1);
      acc += A.high * dt * 5 * F.I; if (acc > 1) { acc = 0; spawn(F, .5); }
      g.lineJoin = 'round'; g.lineCap = 'round';
      let keep = 0;
      for (let n = 0; n < list.length; n++) {
        const b = list[n], p = b.pts;
        g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
        g.strokeStyle = rgba(P.c[0], .16 * b.life); g.lineWidth = M * .02 * b.w; g.stroke();
        g.strokeStyle = rgba(P.c[1], .5 * b.life); g.lineWidth = M * .006 * b.w; g.stroke();
        g.strokeStyle = rgba('#ffffff', .9 * b.life); g.lineWidth = M * .0018 * b.w; g.stroke();
        b.life -= dt * (2 + F.S);
        if (b.life > 0) list[keep++] = b;
      }
      list.length = keep;
    } };
  },
  embers(r, P) {
    const N = 250 + (r() * 450 | 0), arms = 1 + (r() * 5 | 0), twist = (r() - .5) * 6, sp = .3 + r() * 1.2, sz = .6 + r() * 1.6, ps = [];
    for (let i = 0; i < N; i++) ps.push({ a: Math.random() * TAU, d: Math.random(), v: .5 + Math.random(), c: i % 3 });
    // three alpha steps per color keep the fillStyle strings to a handful instead of one per particle
    const shade = [0, 1, 2].map(ci => [.85, .6, .38].map(al => rgba(P.c[ci], al)));
    return { draw(F) {
      const { g, M, cx, cy, dt } = F, speed = sp * F.S * (.3 + A.level * 1.8 * F.I) + A.beatPulse * .8; g.lineCap = 'round';
      g.lineWidth = M * .0022 * sz * (1 + A.high);
      for (let i = 0; i < N; i++) {
        const p = ps[i], r0 = p.d * M * .5, a0 = p.a + p.d * twist, x0 = cx + Math.cos(a0) * r0, y0 = cy + Math.sin(a0) * r0;
        p.a += dt * speed * p.v * (1.2 - p.d); p.d += dt * (.02 + A.bass * .25 * F.I) * p.v * F.S;
        if (p.d > 1) { p.d = Math.random() * .1; p.a = Math.floor(Math.random() * arms) / arms * TAU + (Math.random() - .5) * .3; }
        const r1 = p.d * M * .5, a1 = p.a + p.d * twist;
        g.strokeStyle = shade[p.c][p.d < .33 ? 0 : p.d < .66 ? 1 : 2];
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1); g.stroke();
      }
    } };
  },
  blades(r, P) {
    const k = 3 + (r() * 10 | 0), bins = 16 + (r() * 40 | 0), inner = .05 + r() * .12, spread = .6 + r() * .4, rot = (r() - .5) * .5, w = .3 + r() * .6, out = .25 + r() * .25;
    return { draw(F) {
      const { g, M, cx, cy, t } = F, sector = TAU / k, ri = M * inner;
      for (let b = 0; b < bins; b++) {
        const idx = Math.floor(Math.pow(b / bins, 1.8) * 400) + 2, v = Math.min(1, Math.pow(A.spec[idx] / 255, 1.4) * F.I);
        const len = M * (inner + out * v), c = P.c[b % 2 ? 1 : 0], aw = sector / bins * spread * w;
        g.fillStyle = rgba(c, .35 + .6 * v); g.beginPath();
        for (let s = 0; s < k; s++) {
          const a = s * sector + b / bins * sector * spread + rot * t;
          g.moveTo(cx + Math.cos(a - aw) * ri, cy + Math.sin(a - aw) * ri); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          g.lineTo(cx + Math.cos(a + aw) * ri, cy + Math.sin(a + aw) * ri); g.closePath();
        }
        g.fill();
      }
    } };
  },
  ripple(r, P) {
    const pts = 96 + (r() * 64 | 0), every = 1 + (r() * 3 | 0), grow = .15 + r() * .35, amp = .04 + r() * .1;
    const rings = [], pool = []; let f = 0;
    return { draw(F) {
      const { g, M, cx, cy, dt } = F;
      if (++f % every === 0 && rings.length < 30) {
        const ring = pool.pop() || { w: new Float32Array(pts), rad: 0, c: 0 };
        for (let i = 0; i < pts; i++) ring.w[i] = A.wave[Math.floor(i / pts * A.wave.length)];
        ring.rad = .04; ring.c = f % 3; rings.push(ring);
      }
      g.lineWidth = M * .0025;
      for (let n = 0; n < rings.length; n++) {
        const ring = rings[n];
        ring.rad += dt * grow * F.S * (1 + A.bass * 2); const R = ring.rad * M, al = Math.max(0, 1 - ring.rad / .7);
        g.beginPath();
        for (let i = 0; i <= pts; i++) { const ii = i % pts, a = ii / pts * TAU, rr = R * (1 + ring.w[ii] * amp * 8 * F.I); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = rgba(P.c[ring.c], al * .8); g.stroke();
      }
      while (rings.length && rings[0].rad > .75) pool.push(rings.shift());
    } };
  },
  rain(r, P) {
    const cols = 24 + (r() * 60 | 0), len = .05 + r() * .2, sp = .3 + r(), glitch = r() < .7, ys = [];
    for (let i = 0; i < cols; i++) ys.push({ y: Math.random(), v: .5 + Math.random(), c: P.c[i % 3] });
    return { draw(F) {
      const { g, W, H, M, dt } = F, cw = W / cols; g.lineCap = 'butt';
      for (let i = 0; i < cols; i++) {
        const s = ys[i], e = A.spec[Math.floor(Math.pow(i / cols, 1.7) * 350) + 2] / 255;
        s.y += dt * sp * F.S * s.v * (.4 + e * 2 * F.I); if (s.y > 1 + len) s.y = -len * Math.random();
        const x = i * cw + cw / 2; g.strokeStyle = rgba(s.c, .25 + e * .7); g.lineWidth = Math.max(1, cw * .18 * (1 + e));
        g.beginPath(); g.moveTo(x, (s.y - len * (1 + e)) * H); g.lineTo(x, s.y * H); g.stroke();
      }
      if (glitch && (A.beat || A.high > .65)) {
        const n = 2 + (Math.random() * 5 | 0);
        for (let k = 0; k < n; k++) { g.fillStyle = rgba(P.c[k % 3], .25 + Math.random() * .4); g.fillRect(Math.random() * W * .8, Math.random() * H, W * (.05 + Math.random() * .4), M * (.002 + Math.random() * .012)); }
      }
    } };
  },
  eclipse(r, P) {
    const size = .12 + r() * .12, rays = 60 + (r() * 120 | 0), rayLen = .15 + r() * .25, off = .1 + r() * .35, ang = r() * TAU;
    return { draw(F) {
      const { g, M, cx, cy, t } = F, R = M * size * (1 + A.bass * .25 * F.I);
      g.lineWidth = M * .0025;
      for (let i = 0; i < rays; i++) {
        const a = i / rays * TAU + t * .05, v = A.spec[Math.floor(((i * 7) % rays) / rays * 300) + 3] / 255, L = R * 1.05 + M * rayLen * Math.pow(v, 1.6) * F.I;
        g.strokeStyle = rgba(P.c[i % 2], .2 + .6 * v); g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 1.04, cy + Math.sin(a) * R * 1.04); g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke();
      }
      const prev = g.globalCompositeOperation; g.globalCompositeOperation = 'source-over';
      g.fillStyle = P.c[0]; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      g.fillStyle = P.bg; g.beginPath(); g.arc(cx + Math.cos(ang + t * .1) * R * off, cy + Math.sin(ang + t * .1) * R * off, R * .97, 0, TAU); g.fill();
      g.globalCompositeOperation = prev;
      g.strokeStyle = rgba(P.c[2], .35 + A.beatPulse * .5); g.lineWidth = M * .003; g.beginPath(); g.arc(cx, cy, R * 1.02, 0, TAU); g.stroke();
    } };
  },
  scope(r, P) {
    const delay = 8 + (r() * 80 | 0), k = 1 + (r() * 5 | 0), sc = .3 + r() * .25, rotS = (r() - .5) * .6, step = 2 + (r() * 3 | 0);
    const cols = [0, 1, 2].map(i => rgba(P.c[i], .55));
    return { draw(F) {
      const { g, M, cx, cy, t } = F, w = A.wave, n = w.length, s1 = M * sc * 1.8 * F.I;
      g.lineWidth = M * .0018;
      for (let s = 0; s < k; s++) {
        const a = s / k * TAU + t * rotS, ca = Math.cos(a), sa = Math.sin(a); g.beginPath();
        for (let i = 0; i < n - delay; i += step) { const x0 = w[i] * s1, y0 = w[i + delay] * s1, x = cx + x0 * ca - y0 * sa, y = cy + x0 * sa + y0 * ca; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = cols[s % 3]; g.stroke();
      }
    } };
  },
  terrain(r, P) {
    const rows = 18 + (r() * 22 | 0), pts = 64 + (r() * 64 | 0), amp = .12 + r() * .2, hor = .3 + r() * .2, hist = [];
    return { draw(F) {
      const { g, W, H, M } = F;
      const row = hist.length >= rows ? hist.pop() : new Float32Array(pts); // recycle the oldest row
      for (let i = 0; i < pts; i++) row[i] = A.spec[Math.floor(Math.pow(i / pts, 1.6) * 380) + 2] / 255;
      hist.unshift(row);
      g.lineWidth = M * .002;
      for (let j = hist.length - 1; j >= 0; j--) {
        const z = j / rows, y = H * (hor + (1 - hor) * (1 - z) * .92), sx = W * (.08 + .32 * z), wd = W - 2 * sx, rw = hist[j];
        g.beginPath(); g.moveTo(sx, y);
        for (let i = 0; i < pts; i++) { const env = Math.sin(i / (pts - 1) * Math.PI); g.lineTo(sx + i / (pts - 1) * wd, y - rw[i] * env * M * amp * (1 - z * .6) * F.I * 1.5); }
        g.lineTo(sx + wd, y);
        const prev = g.globalCompositeOperation; g.globalCompositeOperation = 'source-over'; g.fillStyle = P.bg; g.fill(); g.globalCompositeOperation = prev;
        g.strokeStyle = rgba(P.c[j % 3 === 0 ? 0 : 1], 1 - z * .8); g.stroke();
      }
    } };
  },
};
export const FAM_KEYS = Object.keys(FAM);
