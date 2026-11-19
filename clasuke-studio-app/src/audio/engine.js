// Audio graph and sources: demo beat, song playlist, microphone, PC audio.
//   demo / songs -> playBus -> speakers + tap + recorder
//   mic / pc     -> tap + recorder (never to the speakers: that would feed back)
//   tap -> two analysers: `an` feeds the visuals' spectrum, `anBand` has extra headroom for bands and beats
import { emit } from '../core/bus.js';
import { store } from '../core/storage.js';
import { t } from '../core/i18n.js';
import { createDemo } from './demo.js';
import { toast } from '../ui/toast.js';

let ac = null, an = null, anBand = null, tap, playBus, recDest, mediaEl, demo, liveSrc = null, liveStream = null;
export const audio = {
  /** @type {'demo'|'songs'|'mic'|'pc'} */ source: 'demo',
  playing: false,
  /** @type {{name:string,url:string}[]} */ playlist: [],
  track: -1,
};
const changed = () => emit('audio');

export function ensureAudio() {
  if (ac) return ac;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  an = ac.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .78;
  // loud bass clips the default -30 dB ceiling of an analyser; this one keeps its dynamics
  anBand = ac.createAnalyser(); anBand.fftSize = 2048; anBand.smoothingTimeConstant = .55; anBand.minDecibels = -95; anBand.maxDecibels = -8;
  playBus = ac.createGain(); recDest = ac.createMediaStreamDestination(); tap = ac.createGain();
  const silent = ac.createGain(); silent.gain.value = 0;
  playBus.connect(tap); playBus.connect(ac.destination); playBus.connect(recDest);
  tap.connect(an); tap.connect(anBand);
  an.connect(silent); anBand.connect(silent); silent.connect(ac.destination); // keeps the analysers pulled for live inputs
  mediaEl = new Audio(); mediaEl.preload = 'auto';
  ac.createMediaElementSource(mediaEl).connect(playBus);
  mediaEl.addEventListener('ended', () => {
    if (audio.playlist.length > 1) playTrack((audio.track + 1) % audio.playlist.length);
    else { audio.playing = false; changed(); }
  });
  mediaEl.addEventListener('error', () => { if (audio.source === 'songs' && audio.playlist.length && mediaEl.src) toast(t('badFile')); });
  demo = createDemo(ac, playBus);
  return ac;
}
const taps = { an: null, band: null };
/** Analysers to read this frame, or null when nothing is playing (the idle signal takes over). */
export const liveAnalyser = () => { if (!ac || !audio.playing) return null; taps.an = an; taps.band = anBand; return taps; };
export const sampleRate = () => (ac ? ac.sampleRate : 48000);
export const recordStream = () => { ensureAudio(); ac.resume(); return recDest.stream; };
export const media = () => mediaEl;

export function nowTitle() {
  if (audio.source === 'songs' && audio.playlist[audio.track]) return audio.playlist[audio.track].name;
  if (audio.source === 'demo') return audio.playing ? t('demoName') : '';
  return '';
}

// ---- songs ----
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|opus|webm|mp4)$/i;
export function addFiles(files) {
  const list = Array.from(files || []).filter(f => /^(audio|video)\//.test(f.type) || AUDIO_EXT.test(f.name));
  if (!list.length) { toast(t('badFile')); return; }
  ensureAudio();
  const first = audio.playlist.length;
  for (const f of list) audio.playlist.push({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
  setSource('songs', first);
  if (list.length > 1) toast(list.length + ' ' + t('added'));
}
export function playTrack(i) {
  ensureAudio(); if (!audio.playlist[i]) return;
  audio.track = i; mediaEl.src = audio.playlist[i].url; mediaEl.currentTime = 0;
  ac.resume();
  mediaEl.play().then(() => { audio.playing = true; changed(); }).catch(() => { audio.playing = false; changed(); });
  changed();
}
export function removeTrack(i) {
  const p = audio.playlist[i]; if (!p) return;
  URL.revokeObjectURL(p.url); audio.playlist.splice(i, 1);
  if (i === audio.track) { mediaEl.pause(); mediaEl.removeAttribute('src'); audio.playing = false; audio.track = -1; }
  else if (i < audio.track) audio.track--;
  changed();
}
export function skip(dir) {
  const n = audio.playlist.length;
  if (audio.source === 'songs' && n) playTrack((audio.track + dir + n) % n);
}
export function seekTo(frac) {
  if (audio.source === 'songs' && mediaEl && isFinite(mediaEl.duration)) mediaEl.currentTime = frac * mediaEl.duration;
}

// ---- live inputs ----
function stopLive() {
  if (liveSrc) { try { liveSrc.disconnect(); } catch (e) { /* already gone */ } liveSrc = null; }
  if (liveStream) { liveStream.getTracks().forEach(tr => tr.stop()); liveStream = null; }
}
async function startLive(kind) {
  ensureAudio(); await ac.resume();
  const raw = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  try {
    let stream;
    if (kind === 'mic') stream = await navigator.mediaDevices.getUserMedia({ audio: raw });
    else {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: raw, systemAudio: 'include' });
      stream.getVideoTracks().forEach(tr => tr.stop());
      if (!stream.getAudioTracks().length) { toast(t('pcNoAudio'), 4500); throw new Error('noaudio'); }
    }
    liveStream = stream; liveSrc = ac.createMediaStreamSource(stream);
    liveSrc.connect(tap); liveSrc.connect(recDest);
    stream.getAudioTracks()[0].addEventListener('ended', () => { if (audio.source === kind) { stopLive(); audio.playing = false; changed(); } });
    audio.playing = true; changed();
    return true;
  } catch (e) {
    if (!e || e.message !== 'noaudio') toast(t(kind === 'mic' ? 'micNo' : 'pcNo'), 4500);
    return false;
  }
}

// ---- switching ----
export async function setSource(kind, trackIndex) {
  ensureAudio(); ac.resume();
  demo.stop(); stopLive(); mediaEl.pause(); audio.playing = false;
  audio.source = kind; store.set('cs-src', kind === 'songs' ? 'songs' : 'demo');
  if (kind === 'demo') { demo.start(); audio.playing = true; }
  else if (kind === 'songs') {
    if (!audio.playlist.length) emit('need-files');
    else playTrack(trackIndex != null ? trackIndex : Math.max(0, audio.track));
  } else {
    changed();
    if (!(await startLive(kind))) audio.source = 'demo';
  }
  changed();
}
export function togglePlay() {
  ensureAudio(); ac.resume();
  const s = audio.source;
  if (s === 'demo') { if (audio.playing) { demo.stop(); audio.playing = false; } else { demo.start(); audio.playing = true; } }
  else if (s === 'songs') {
    if (!audio.playlist.length) { emit('need-files'); return; }
    if (audio.track < 0) { playTrack(0); return; }
    if (audio.playing) { mediaEl.pause(); audio.playing = false; }
    else { audio.playing = true; mediaEl.play().then(changed).catch(() => { audio.playing = false; changed(); }); }
  } else if (audio.playing) { stopLive(); audio.playing = false; }
  else { setSource(s); return; }
  changed();
}
