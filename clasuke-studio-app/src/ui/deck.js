// The deck (transport, source, visual, primary action), the tune strip and the top strip.
import { on } from '../core/bus.js';
import { settings } from '../core/settings.js';
import { t, L, getLang, setLang } from '../core/i18n.js';
import { A } from '../audio/analysis.js';
import { audio, togglePlay, setSource, skip, seekTo, addFiles, media, nowTitle } from '../audio/engine.js';
import { studio } from '../visual/studio.js';
import { stage } from '../visual/stage.js';
import { recorder } from '../record/recorder.js';
import { S3_NAMES, STYLES, FAM_NAMES, envById } from '../visual/catalog.js';
import { setAspect, setAuto, setTag, setStream, toggleFull } from './actions.js';
import { $, $$, fmtTime, fillRange } from './dom.js';

let seeking = false, lastSeek = -1, lastCur = '', lastDur = '', lastRec = '';
let meterEls, playBtn, seek, tCur, tDur;

function syncAudio() {
  const playing = audio.playing, src = audio.source;
  $('#play-use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  playBtn.classList.toggle('on', playing);
  const lb = t(playing ? 'pause' : 'play'); playBtn.setAttribute('aria-label', lb); playBtn.title = lb + ' (Space)';
  for (const b of $$('[data-src]')) b.setAttribute('aria-pressed', b.dataset.src === src ? 'true' : 'false');
  const songs = src === 'songs' && audio.playlist.length > 0;
  $('#btn-prev').disabled = $('#btn-next').disabled = !(songs && audio.playlist.length > 1);
  seek.disabled = !songs;
  // track line + top strip
  const name = $('#track-name'), now = $('#now-text');
  let title = '';
  if (src === 'mic') title = playing ? t('mic') : t('srcMicL');
  else if (src === 'pc') title = playing ? t('pc') : t('srcPcL');
  else if (src === 'songs') title = audio.playlist[audio.track] ? audio.playlist[audio.track].name : t('srcSongsL');
  else title = t('demoName');
  name.textContent = title; name.classList.toggle('idle', !playing);
  now.textContent = '';
  if (!playing) now.textContent = t('idle');
  else { now.append(t('playing') + ' · '); const b = document.createElement('b'); b.textContent = title; now.append(b); }
  stage.refreshHud();
}

function syncVisual() {
  const V = studio.cur; if (!V) return;
  const i = L();
  $('#vname').textContent = V.name;
  const code = $('#vcode'); if (document.activeElement !== code) code.value = V.code;
  const parts = [];
  if (stage.has3D) {
    const e = envById(V.env); if (e) parts.push(e.n[i]);
    if (V.s3 !== 'none') parts.push(S3_NAMES[V.s3][i]);
    parts.push(STYLES[V.style].n[i]);
  }
  for (const k of V.keys) parts.push(FAM_NAMES[k][i]);
  parts.push(V.P.n);
  const line = parts.join(' · ');
  $('#vlayers').textContent = line; $('#vlayers').title = line;
  $('#v-fav').setAttribute('aria-pressed', studio.isFav(V.code) ? 'true' : 'false');
  $('#v-prev').disabled = !studio.canGoBack;
}

function syncSettings() {
  for (const b of $$('[data-ar]')) b.setAttribute('aria-pressed', b.dataset.ar === settings.aspect ? 'true' : 'false');
  $('#btn-auto').setAttribute('aria-pressed', settings.auto ? 'true' : 'false');
  $('#btn-tag').setAttribute('aria-pressed', settings.showTag ? 'true' : 'false');
}
function syncLang() {
  for (const b of $$('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === getLang() ? 'true' : 'false');
  $('#rec-label').textContent = recorder.active ? fmtTime(recorder.elapsed) : t('record');
  $('#btn-rec').title = t(recorder.active ? 'stop' : 'record') + ' (R)';
  $('#btn-gen').title = t('generate') + ' (G)';
}

export function initDeck() {
  playBtn = $('#btn-play'); seek = $('#seek'); tCur = $('#t-cur'); tDur = $('#t-dur');
  meterEls = $$('#meter i');

  playBtn.addEventListener('click', togglePlay);
  $('#btn-prev').addEventListener('click', () => skip(-1));
  $('#btn-next').addEventListener('click', () => skip(1));
  for (const b of $$('[data-src]')) b.addEventListener('click', () => setSource(b.dataset.src));
  const file = $('#file');
  file.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  $('.src-open').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); file.click(); } });
  on('need-files', () => file.click());

  seek.addEventListener('input', () => { seeking = true; fillRange(seek); });
  seek.addEventListener('change', () => { seekTo(seek.value / 1000); seeking = false; });

  const gen = $('#btn-gen');
  gen.addEventListener('click', () => studio.generate());
  $('#v-next').addEventListener('click', () => studio.next());
  $('#v-prev').addEventListener('click', () => studio.prev());
  const fav = $('#v-fav');
  fav.addEventListener('click', () => studio.toggleFav());
  on('favs', () => { const onNow = studio.cur && studio.isFav(studio.cur.code); if (onNow && fav.getAttribute('aria-pressed') !== 'true') { fav.classList.remove('pop'); void fav.offsetWidth; fav.classList.add('pop'); } fav.setAttribute('aria-pressed', onNow ? 'true' : 'false'); });

  const code = $('#vcode');
  code.addEventListener('focus', () => code.select());
  code.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { if (studio.loadCode(code.value)) code.blur(); else code.select(); }
    if (e.key === 'Escape') code.blur();
  });
  code.addEventListener('blur', () => { if (studio.cur) code.value = studio.cur.code; });

  $('#btn-rec').addEventListener('click', () => recorder.toggle());
  for (const b of $$('[data-ar]')) b.addEventListener('click', () => setAspect(b.dataset.ar));
  $('#btn-auto').addEventListener('click', () => setAuto(!settings.auto));
  $('#btn-tag').addEventListener('click', () => setTag(!settings.showTag));
  const knob = (id, out, key) => {
    const k = $(id), o = $(out);
    const apply = () => { settings[key] = k.value / 100; o.textContent = k.value; fillRange(k); };
    k.addEventListener('input', apply); k.addEventListener('dblclick', () => { k.value = 100; apply(); }); apply();
  };
  knob('#k-int', '#o-int', 'intensity'); knob('#k-spd', '#o-spd', 'speed');
  fillRange(seek);

  $('#btn-stream').addEventListener('click', () => setStream(true));
  $('#btn-full').addEventListener('click', toggleFull);
  for (const b of $$('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

  on('audio', syncAudio);
  on('visual', (V, why) => {
    syncVisual();
    if (why === 'new') { gen.classList.remove('fire'); void gen.offsetWidth; gen.classList.add('fire'); }
  });
  on('favs', syncVisual);
  on('settings', syncSettings);
  on('3d', syncVisual);
  on('lang', () => { syncLang(); syncAudio(); syncVisual(); });
  on('rec', active => { $('#app').classList.toggle('is-rec', active); lastRec = ''; syncLang(); });
  syncAudio(); syncVisual(); syncSettings(); syncLang();
}

/** Cheap per-frame UI: meter, play pulse, seek position, record clock. Writes only when a value changed. */
export function tickDeck() {
  const m = meterEls;
  m[0].style.transform = 'scaleY(' + (.12 + Math.min(1, A.bass) * .88).toFixed(2) + ')';
  m[1].style.transform = 'scaleY(' + (.12 + Math.min(1, A.mid) * .88).toFixed(2) + ')';
  m[2].style.transform = 'scaleY(' + (.12 + Math.min(1, A.high) * .88).toFixed(2) + ')';
  playBtn.style.setProperty('--pulse', audio.playing ? A.beatPulse.toFixed(2) : '0');

  let cur = '0:00', dur = '0:00', pos = 0;
  if (audio.source === 'songs') {
    const el = media();
    if (el) { const d = el.duration; cur = fmtTime(el.currentTime); dur = fmtTime(d); pos = isFinite(d) && d > 0 ? Math.round(el.currentTime / d * 1000) : 0; }
  } else dur = audio.source === 'demo' ? '∞' : t('live');
  if (cur !== lastCur) tCur.textContent = lastCur = cur;
  if (dur !== lastDur) tDur.textContent = lastDur = dur;
  if (!seeking && pos !== lastSeek && (Math.abs(pos - lastSeek) >= 2 || pos === 0)) { seek.value = lastSeek = pos; fillRange(seek); }

  if (recorder.active) {
    const s = fmtTime(recorder.elapsed);
    if (s !== lastRec) { lastRec = s; $('#rec-label').textContent = s; $('#rec-time').textContent = s; }
  }
}
export { nowTitle };
