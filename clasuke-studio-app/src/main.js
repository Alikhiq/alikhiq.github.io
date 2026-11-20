// Clasuke Studio: boot and the frame loop.
import '@fontsource-variable/syne/wght.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import '@fontsource-variable/martian-mono/wght.css';
import './styles/app.css';

import { emit, on } from './core/bus.js';
import { store } from './core/storage.js';
import { seedOf, newSeed } from './core/rng.js';
import { applyStatic, t } from './core/i18n.js';
import { settings } from './core/settings.js';
import { A, analyse } from './audio/analysis.js';
import { audio, liveAnalyser, sampleRate } from './audio/engine.js';
import { stage } from './visual/stage.js';
import { studio } from './visual/studio.js';
import { recorder } from './record/recorder.js';
import { toast } from './ui/toast.js';
import { initBrowser } from './ui/browser.js';
import { initDeck, tickDeck } from './ui/deck.js';
import { initOverlays } from './ui/overlays.js';
import { initPalette } from './ui/palette.js';
import { initShortcuts } from './ui/shortcuts.js';
import { registerPWA } from './pwa/register.js';

applyStatic();
stage.init();

// first visual: #CODE in the address, else the last one, else a fresh seed
const hash = location.hash.slice(1);
const startCode = hash && seedOf(hash) != null ? hash : store.get('cs-last', null);
initOverlays();
studio.setVisual(startCode && seedOf(startCode) != null ? seedOf(startCode) : newSeed(), true, 'boot');
initBrowser(); initDeck(); initPalette(); initShortcuts();

// 3D arrives a moment later; until then (and on machines without WebGL) the 2D renderer draws
const state = { gl: 'loading' };
stage.init3D(key => toast(t(key))).then(ok => {
  state.gl = ok ? 'on' : 'off';
  if (ok) studio.refresh('boot'); else toast(t('no3d'), 3500);
  emit('3d', ok);
});

// the tag is drawn on canvas: redraw it once the display font is in
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load('800 40px "Syne Variable"'), document.fonts.load('600 20px "Hanken Grotesk Variable"')]).then(() => stage.refreshHud()).catch(() => {});
}
on('settings', () => stage.refreshHud());
on('lang', () => stage.refreshHud());
on('stream', () => requestAnimationFrame(() => stage.layout()));
document.addEventListener('fullscreenchange', () => requestAnimationFrame(() => stage.layout()));

// ---- frame loop: stops completely while the tab is hidden (unless a take is being recorded) ----
let last = performance.now(), raf = 0, frames = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const raw = (now - last) / 1000, dt = raw > .05 ? .05 : raw < 0 ? 0 : raw; last = now;
  analyse(dt, now / 1000, liveAnalyser(), sampleRate());
  stage.render(dt);
  tickDeck();
  stage.perf(raw);
  frames++;
}
function setRunning(run) {
  if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  stage.setPaused(!run);
}
document.addEventListener('visibilitychange', () => setRunning(!document.hidden || recorder.active));
setRunning(true);

registerPWA();

// Small read-only handle for the console, the thumbnail script and the smoke test.
window.__studio = {
  get gl() { return state.gl; },
  get visual() { const V = studio.cur; return V && { code: V.code, name: V.name, env: V.env, s3: V.s3, style: V.style, layers: V.keys.slice(), palette: V.P.n }; },
  get audio() { return { source: audio.source, playing: audio.playing, live: A.live, bass: A.bass, mid: A.mid, high: A.high, level: A.level, beats: A.beats, tracks: audio.playlist.length, track: audio.track }; },
  get lock() { return { ...studio.lock }; },
  get size() { return stage.size; },
  get frames() { return frames; },
  get settings() { return { ...settings }; },
  load: code => studio.loadCode(code),
  setLock: (kind, id) => studio.setLock(kind, id),
  snapshot: (w, h, type) => stage.snapshot(w, h, type),
};
