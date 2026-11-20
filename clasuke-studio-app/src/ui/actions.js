// Every command in one place. The keyboard, the command palette and the buttons all run these.
import { emit } from '../core/bus.js';
import { store } from '../core/storage.js';
import { settings } from '../core/settings.js';
import { t, getLang, setLang } from '../core/i18n.js';
import { toast } from './toast.js';
import { studio } from '../visual/studio.js';
import { stage } from '../visual/stage.js';
import { recorder } from '../record/recorder.js';
import { togglePlay, setSource, skip } from '../audio/engine.js';
import { $ } from './dom.js';

export function setAspect(ar) {
  if (settings.recording) return;
  settings.aspect = ar; store.set('cs-ar', ar); stage.layout(); emit('settings');
}
export function setAuto(on) { settings.auto = on; emit('settings'); toast(t(on ? 'autoOn' : 'autoOff')); }
export function setTag(on) { settings.showTag = on; store.set('cs-tag', on); emit('settings'); }
export function setStream(on) {
  const app = $('#app'); if (app.classList.contains('stream') === on) return;
  app.classList.toggle('stream', on);
  const h = $('#stream-hint');
  if (on) { h.textContent = t('streamHint'); h.hidden = false; h.style.opacity = 1; setTimeout(() => { h.style.opacity = 0; }, 2200); setTimeout(() => { h.hidden = true; }, 2700); }
  else h.hidden = true;
  emit('stream', on);
}
export const isStream = () => $('#app').classList.contains('stream');
export function toggleFull() {
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  const root = document.documentElement;
  if (!root.requestFullscreen) { toast(t('fullNo')); return; }
  root.requestFullscreen().catch(() => toast(t('fullNo')));
}

/** id, i18n label key, icon, key hint, run. `key` is matched against event.key (lower case). */
export const ACTIONS = [
  { id: 'play', label: () => t('play') + ' / ' + t('pause'), icon: 'play', key: ' ', hint: 'Space', run: togglePlay },
  { id: 'new', label: () => t('generate'), icon: 'bolt', key: 'g', hint: 'G', run: () => studio.generate() },
  { id: 'next', label: () => t('nextVis'), icon: 'right', key: 'arrowright', hint: '→', run: () => studio.next() },
  { id: 'prev', label: () => t('prevVis'), icon: 'left', key: 'arrowleft', hint: '←', run: () => studio.prev() },
  { id: 'fav', label: () => t('fav'), icon: 'star', key: 's', hint: 'S', run: () => studio.toggleFav() },
  { id: 'rec', label: () => t(recorder.active ? 'stop' : 'record'), icon: 'rec', key: 'r', hint: 'R', run: () => recorder.toggle() },
  { id: 'stream', label: () => t('stream'), icon: 'cast', key: 'h', hint: 'H', run: () => setStream(!isStream()) },
  { id: 'full', label: () => t('full'), icon: 'full', key: 'f', hint: 'F', run: toggleFull },
  { id: 'auto', label: () => t('auto') + ' · ' + t('autoL'), icon: 'dice', key: 'a', hint: 'A', run: () => setAuto(!settings.auto) },
  { id: 'tag', label: () => '@clasuke · ' + t('tagL'), icon: 'image', key: 't', hint: 'T', run: () => setTag(!settings.showTag) },
  { id: 'open', label: () => t('open'), icon: 'open', key: 'o', hint: 'O', run: () => $('#file').click() },
  { id: 'src-demo', label: () => t('srcDemoL'), icon: 'wave', run: () => setSource('demo') },
  { id: 'src-songs', label: () => t('srcSongsL'), icon: 'music', run: () => setSource('songs') },
  { id: 'src-mic', label: () => t('srcMicL'), icon: 'mic', run: () => setSource('mic') },
  { id: 'src-pc', label: () => t('srcPcL'), icon: 'pc', run: () => setSource('pc') },
  { id: 'next-song', label: () => t('nextSong'), icon: 'skip-f', key: 'n', hint: 'N', run: () => skip(1) },
  { id: 'prev-song', label: () => t('prevSong'), icon: 'skip-b', key: 'b', hint: 'B', run: () => skip(-1) },
  { id: 'ar-free', label: () => t('format') + ' · ' + t('arFree'), icon: 'full', key: '1', hint: '1', run: () => setAspect('free') },
  { id: 'ar-916', label: () => t('format') + ' · 9:16', icon: 'full', key: '2', hint: '2', run: () => setAspect('9:16') },
  { id: 'ar-169', label: () => t('format') + ' · 16:9', icon: 'full', key: '3', hint: '3', run: () => setAspect('16:9') },
  { id: 'ar-11', label: () => t('format') + ' · 1:1', icon: 'full', key: '4', hint: '4', run: () => setAspect('1:1') },
  { id: 'unlock', label: () => t('unlockAll'), icon: 'dice', key: 'u', hint: 'U', run: () => studio.unlockAll() },
  { id: 'lang', label: () => t('langSwitch'), icon: 'cmd', key: 'l', hint: 'L', run: () => setLang(getLang() === 'es' ? 'en' : 'es') },
];
const byKey = new Map(ACTIONS.filter(a => a.key).map(a => [a.key, a]));
export const actionForKey = k => byKey.get(k);
export const run = id => { const a = ACTIONS.find(x => x.id === id); if (a) a.run(); };
