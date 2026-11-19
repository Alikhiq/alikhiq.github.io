// Which visual is on: history, codes, locks and favorites.
import { emit, on } from '../core/bus.js';
import { store } from '../core/storage.js';
import { newSeed, seedOf } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { t } from '../core/i18n.js';
import { toast } from '../ui/toast.js';
import { ENVS } from './catalog.js';
import { makeVisual, lock, saveLock } from './recipe.js';
import { stage } from './stage.js';

const hist = []; let hIdx = -1, userBg = 0;
let favs = store.get('cs-favs', []); if (!Array.isArray(favs)) favs = [];

export const studio = {
  /** @type {ReturnType<typeof makeVisual>|null} */ cur: null,
  lock,
  get favs() { return favs; },
  get canGoBack() { return hIdx > 0; },
  isFav: code => favs.some(f => f.code === code),

  /** @param {number} seed @param {boolean} [push] add to history @param {'new'|'nav'|'lock'} [why] */
  setVisual(seed, push = true, why = 'new') {
    const V = makeVisual(seed >>> 0, stage.has3D);
    studio.cur = V;
    if (push) { hist.splice(hIdx + 1); hist.push(V.seed); if (hist.length > 200) hist.shift(); hIdx = hist.length - 1; }
    stage.show(V);
    store.set('cs-last', V.code);
    emit('visual', V, why);
  },
  generate() { studio.setVisual(newSeed()); },
  next() { if (hIdx < hist.length - 1) { hIdx++; studio.setVisual(hist[hIdx], false, 'nav'); } else studio.generate(); },
  prev() { if (hIdx > 0) { hIdx--; studio.setVisual(hist[hIdx], false, 'nav'); } },
  /** @returns {boolean} whether the code was valid */
  loadCode(code) {
    const s = seedOf(code);
    if (s == null) { toast(t('badCode')); return false; }
    studio.setVisual(s); return true;
  },
  /** Rebuilds the current seed (after 3D came up, or a lock changed). */
  refresh(why = 'lock') { if (studio.cur) studio.setVisual(studio.cur.seed, false, why); },

  setLock(kind, value) {
    lock[kind] = value; saveLock();
    studio.refresh('lock'); emit('lock');
  },
  unlockAll() { lock.env = lock.s3 = lock.style = 'auto'; saveLock(); studio.refresh('lock'); emit('lock'); },
  /** Adds the user's photo or video as a background and locks it. */
  addUserBackground(file) {
    if (!file) return;
    if (!stage.has3D) { toast(t('no3d')); return; }
    const isVid = /^video\//.test(file.type), id = 'u' + (++userBg), nm = file.name.replace(/\.[^.]+$/, '').slice(0, 22);
    const url = URL.createObjectURL(file);
    ENVS.push({ id, type: isVid ? 'video' : 'image', src: url, n: [nm, nm], user: true, thumb: isVid ? null : url, videoThumb: isVid ? url : null });
    emit('envs'); studio.setLock('env', id);
  },

  async toggleFav() {
    const V = studio.cur; if (!V) return;
    const i = favs.findIndex(f => f.code === V.code);
    if (i >= 0) { favs.splice(i, 1); toast(t('unfaved')); }
    else {
      const fav = { code: V.code, name: V.name, thumb: '' };
      favs.unshift(fav); toast(t('faved'));
      emit('favs');
      fav.thumb = await stage.snapshot(240, 135);
    }
    saveFavs(); emit('favs');
  },
  removeFav(code) { favs = favs.filter(f => f.code !== code); saveFavs(); emit('favs'); },
};

function saveFavs() {
  if (store.set('cs-favs', favs)) return;
  // storage full: keep the codes, drop the oldest pictures
  for (let i = favs.length - 1; i >= 0 && !store.set('cs-favs', favs); i--) favs[i].thumb = '';
}

on('beat', beats => { if (settings.auto && beats % 32 === 0) studio.next(); });
