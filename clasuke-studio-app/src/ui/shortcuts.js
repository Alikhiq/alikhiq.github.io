// Global keyboard shortcuts. Keys never fire while typing, and Space/Enter on a focused control
// keeps its normal meaning.
import { actionForKey, isStream, setStream } from './actions.js';
import { openPalette, closePalette, paletteOpen } from './palette.js';

export function initShortcuts() {
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), tg = e.target, tag = tg && tg.tagName;
    if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); paletteOpen() ? closePalette() : openPalette(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || paletteOpen()) return;
    if (tag === 'INPUT' && tg.type === 'text') return;
    if (k === 'escape') { if (isStream()) setStream(false); return; }
    if (k === '?' || k === '/') { e.preventDefault(); openPalette(); return; }
    if (tag === 'INPUT' && tg.type === 'range' && (k.startsWith('arrow') || k === 'home' || k === 'end')) return;
    if ((k === ' ' || k === 'enter') && (tag === 'BUTTON' || tag === 'LABEL' || tag === 'A')) return;
    if (e.repeat && k !== 'arrowright' && k !== 'arrowleft') return;
    const a = actionForKey(k);
    if (a) { e.preventDefault(); a.run(); }
  });
}
