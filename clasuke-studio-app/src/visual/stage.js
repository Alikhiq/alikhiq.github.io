// The stage: owns the canvases, fits them to the chosen format, caps the internal resolution and
// renders one frame of the current visual through WebGL (or the 2D fallback).
import { settings } from '../core/settings.js';
import { emit } from '../core/bus.js';
import { ASPECT, EXPORT } from './catalog.js';
import { createRenderer2D } from './renderer2d.js';
import { nowTitle } from '../audio/engine.js';

const MAX_SIDE = /Mobi|Android/i.test(navigator.userAgent) ? 1280 : 1600;
let cv, glc, frameEl, wrap, r2d, world = null, cur = null;
let boxW = 0, boxH = 0, tAcc = 0, quality = 1, slow = 0, warm = 0;
// ?hq in the address keeps the full resolution no matter how slow the frames are (useful for capture rigs)
const FIXED_QUALITY = new URLSearchParams(location.search).has('hq');
const F = { g: null, W: 2, H: 2, M: 2, cx: 1, cy: 1, t: 0, dt: 0, I: 1, S: 1 };
const shots = [];

export const stage = {
  get has3D() { return !!world; },
  get canvas() { return world ? glc : cv; },
  get size() { return [cv.width, cv.height]; },
  get quality() { return quality; },

  init() {
    cv = document.getElementById('stage'); glc = document.getElementById('gl');
    frameEl = document.getElementById('frame'); wrap = document.getElementById('stage-fit');
    r2d = createRenderer2D(cv); F.g = r2d.g;
    new ResizeObserver(es => { const r = es[0].contentRect; boxW = r.width; boxH = r.height; stage.layout(); }).observe(wrap);
    const r = wrap.getBoundingClientRect(); boxW = r.width; boxH = r.height; stage.layout();
  },

  /** Loads three.js and builds the world. Resolves true when 3D is running. */
  async init3D(onError) {
    try {
      const { createWorld } = await import('./gl/world.js');
      const w = createWorld({ canvas: glc, overlay: r2d.layer, getTitle: nowTitle, showTag: () => settings.showTag, onError });
      if (!w) return false;
      world = w; cv.hidden = true; glc.hidden = false;
      w.resize(cv.width, cv.height);
      return true;
    } catch (err) { console.warn('3D unavailable', err); return false; }
  },

  setSize(w, h) {
    w = Math.max(2, w & ~1); h = Math.max(2, h & ~1);
    if (cv.width === w && cv.height === h) return;
    cv.width = w; cv.height = h; r2d.resize(w, h); r2d.clear(cur, !!world);
    F.W = w; F.H = h; F.M = Math.min(w, h); F.cx = w / 2; F.cy = h / 2;
    if (world) world.resize(w, h);
  },

  /** Fits the frame to the available box and picks the internal resolution. */
  layout() {
    if (!frameEl || boxW < 2 || boxH < 2) return;
    const ar = ASPECT[settings.aspect];
    let cw = boxW, ch = boxH;
    if (ar) { if (cw / ch > ar) cw = ch * ar; else ch = cw / ar; }
    frameEl.style.width = Math.floor(cw) + 'px'; frameEl.style.height = Math.floor(ch) + 'px';
    if (settings.recording) return; // the export size is locked while recording
    const d = Math.min(2, window.devicePixelRatio || 1) * quality;
    let iw = Math.round(cw * d), ih = Math.round(ch * d);
    const cap = MAX_SIDE * Math.min(1, quality * 1.25) / Math.max(iw, ih);
    if (cap < 1) { iw = Math.round(iw * cap); ih = Math.round(ih * cap); }
    stage.setSize(iw, ih);
  },

  /** Switches to the 1080p export size for the current format (free keeps the on-screen size). */
  enterRecording() {
    const e = EXPORT[settings.aspect];
    if (e) stage.setSize(e[0], e[1]);
    settings.recording = true;
    return [cv.width, cv.height];
  },
  leaveRecording() { settings.recording = false; stage.layout(); },

  show(V) {
    cur = V; r2d.clear(V, !!world);
    if (world) world.apply(V);
  },

  render(dt) {
    if (!cur) return;
    tAcc += dt * settings.speed;
    F.t = tAcc; F.dt = dt; F.I = settings.intensity; F.S = settings.speed;
    r2d.drawLayers(cur, F, !!world);
    if (world) world.frame(dt, F, cur.layers.length > 0);
    else r2d.present(cur, F, settings.showTag, settings.showTag ? nowTitle() : '');
    // snapshots must be taken in the same task as the WebGL draw, before the buffer is cleared
    while (shots.length) { const s = shots.pop(); s.resolve(grab(s.w, s.h, s.type)); }
  },

  /** Watches frame times and lowers the internal resolution on slow machines (never while recording). */
  perf(rawDt) {
    if (FIXED_QUALITY || settings.recording || document.hidden) { slow = 0; return; }
    if (warm < 60) { warm++; return; }
    slow = rawDt > 1 / 38 ? slow + 1 : Math.max(0, slow - 2);
    if (slow > 90 && quality > .5) { quality = Math.max(.5, quality * .8); slow = 0; warm = 0; stage.layout(); emit('quality', quality); }
  },

  /** Small JPEG of the current picture (cover-cropped). */
  snapshot(w = 320, h = 180, type = 'image/jpeg') { return new Promise(resolve => shots.push({ w, h, type, resolve })); },
  refreshHud() { if (world) world.refreshHud(); },
  setPaused(p) { if (world) world.setPaused(p); },
};

let shotCv = null;
function grab(w, h, type) {
  try {
    shotCv = shotCv || document.createElement('canvas'); shotCv.width = w; shotCv.height = h;
    const src = stage.canvas, sw = src.width, sh = src.height, k = Math.max(w / sw, h / sh), cw = w / k, ch = h / k;
    shotCv.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    return shotCv.toDataURL(type, .72);
  } catch (e) { return ''; }
}
