// Seed -> visual. The order of rng draws below is the "file format" of a code: changing it changes what
// every existing code looks like, so add new draws only at the end.
import { mulberry32, codeOf } from '../core/rng.js';
import { store } from '../core/storage.js';
import { PALETTES, ENVS, S3_KEYS, STYLES, STYLE_KEYS, NAME_A, NAME_B } from './catalog.js';
import { FAM, FAM_KEYS } from './families2d.js';

/** Locks chosen in the browser. 'auto' means "let the seed decide". */
export const lock = Object.assign({ env: 'auto', s3: 'auto', style: 'auto' }, store.get('cs-lock', {}));
if (!ENVS.some(e => e.id === lock.env)) lock.env = 'auto';
if (lock.s3 !== 'auto' && lock.s3 !== 'none' && !S3_KEYS.includes(lock.s3)) lock.s3 = 'auto';
if (lock.style !== 'auto' && !STYLES[lock.style]) lock.style = 'auto';
export function saveLock() {
  // the user's own backgrounds are object URLs: they do not survive a reload, so they are not saved
  store.set('cs-lock', { env: lock.env.startsWith('u') ? 'auto' : lock.env, s3: lock.s3, style: lock.style });
}

const VIDS = ENVS.filter(e => e.type === 'video'), PANOS = ENVS.filter(e => e.type === 'hdri');
const FULL_FRAME = k => k === 'terrain' || k === 'rain';

/** @param {number} seed @param {boolean} has3D whether the WebGL world is running */
export function makeVisual(seed, has3D) {
  const r = mulberry32(seed), pick = a => a[r() * a.length | 0];
  const P = PALETTES[r() * PALETTES.length | 0];
  const re = mulberry32(seed ^ 0x9e3779b9);
  const roll = re();
  let env = roll < .2 ? 'plain' : roll < .62 ? VIDS[re() * VIDS.length | 0].id : PANOS[re() * PANOS.length | 0].id;
  let s3 = re() < .82 ? S3_KEYS[re() * S3_KEYS.length | 0] : 'none';
  let style = STYLE_KEYS[re() * STYLE_KEYS.length | 0];
  if (lock.env !== 'auto') env = lock.env;
  if (lock.s3 !== 'auto') s3 = lock.s3;
  if (lock.style !== 'auto') style = lock.style;
  const with3D = has3D && s3 !== 'none';
  const nLayers = with3D ? Math.floor(r() * 1.8) : 1 + Math.floor(r() * r() * 3.2);
  const keys = FAM_KEYS.filter(k => !(with3D && (k === 'terrain' || k === 'rain' || k === 'eclipse')));
  for (let i = keys.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [keys[i], keys[j]] = [keys[j], keys[i]]; }
  const chosen = keys.slice(0, nLayers);
  chosen.sort((a, b) => FULL_FRAME(b) - FULL_FRAME(a)); // full-frame families go underneath
  const layers = chosen.map(k => ({ key: k, f: FAM[k](r, P), blend: r() < .7 ? 'lighter' : 'source-over' }));
  return {
    seed, code: codeOf(seed), P, layers, keys: chosen, env, s3, style,
    trail: .1 + r() * .35, mirror: pick(['none', 'none', 'none', 'x', 'quad']), shake: r() < .6, flash: r() < .65, grain: r() < .85, zoom: r() * .07,
    name: pick(NAME_A) + ' ' + pick(NAME_B),
  };
}
