// Registers the service worker (production builds only) and tells the UI when a new version is waiting.
import { emit } from '../core/bus.js';

export function registerPWA() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) emit('sw-update'); });
      });
    }).catch(() => { /* offline support is optional */ });
  });
}
