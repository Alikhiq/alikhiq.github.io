// Things that live on the stage: the cut + title card on a new visual, the first-run moment,
// the drop target, the REC readout, and the install button.
import { on } from '../core/bus.js';
import { store } from '../core/storage.js';
import { t } from '../core/i18n.js';
import { togglePlay, addFiles, audio } from '../audio/engine.js';
import { toast } from './toast.js';
import { $ } from './dom.js';

function replay(node, cls = 'run') { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

export function initOverlays() {
  // new visual: blade of light + the name called out
  const cut = $('#cut'), card = $('#titlecard');
  on('visual', (V, why) => {
    if (why === 'lock' || why === 'boot') return; // only when the visual itself changes
    $('#tc-name').textContent = V.name; $('#tc-code').textContent = V.code;
    replay(cut); replay(card);
  });

  // first run: shown until the first real action, then never again
  const fr = $('#firstrun');
  if (!store.get('cs-seen', false)) {
    fr.hidden = false;
    const bye = () => {
      if (fr.hidden || fr.classList.contains('bye')) return;
      store.set('cs-seen', true); fr.classList.add('bye'); setTimeout(() => { fr.hidden = true; }, 380);
    };
    $('#fr-play').addEventListener('click', () => { if (!audio.playing) togglePlay(); bye(); });
    fr.addEventListener('click', e => { if (e.target === fr) bye(); });
    on('audio', () => { if (audio.playing) bye(); });
    on('visual', (V, why) => { if (why === 'new') bye(); });
  }

  // drag and drop songs anywhere
  const veil = $('#drop-veil'); let depth = 0;
  const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; veil.hidden = false; } });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) veil.hidden = true; });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); depth = 0; veil.hidden = true; if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

  // recording readout
  on('rec', (active, info) => {
    $('#rec-hud').hidden = !active;
    if (active) { $('#rec-time').textContent = '0:00'; $('#rec-meta').textContent = info.w + '×' + info.h + ' · ' + info.ext.toUpperCase(); }
  });

  // install (Chrome / Edge fire beforeinstallprompt when the app is installable)
  let installEvt = null; const btn = $('#btn-install');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; btn.hidden = false; });
  window.addEventListener('appinstalled', () => { btn.hidden = true; installEvt = null; });
  btn.addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* dismissed */ }
    installEvt = null; btn.hidden = true;
  });

  on('sw-update', () => toast(t('updateReady'), 6000));
}
