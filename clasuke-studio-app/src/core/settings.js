// Live settings shared by the renderer and the UI.
import { store } from './storage.js';
import { ASPECT } from '../visual/catalog.js';

const ar = store.get('cs-ar', 'free');
export const settings = {
  intensity: 1,
  speed: 1,
  showTag: store.get('cs-tag', true) !== false,
  auto: false,
  /** @type {'free'|'9:16'|'16:9'|'1:1'} */ aspect: ar in ASPECT ? ar : 'free',
  recording: false,
};
