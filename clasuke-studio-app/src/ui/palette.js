// Command palette (Ctrl/⌘+K, or ?). Lists every action with its shortcut, so it doubles as the shortcut sheet.
// Typing a 1-7 character code offers to load that visual.
import { t } from '../core/i18n.js';
import { seedOf, codeOf } from '../core/rng.js';
import { studio } from '../visual/studio.js';
import { ACTIONS } from './actions.js';
import { $, el, icon } from './dom.js';

let box, input, list, items = [], sel = 0, lastFocus = null;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function render() {
  const q = norm(input.value.trim());
  items = ACTIONS.map(a => ({ label: a.label(), icon: a.icon, hint: a.hint || '', run: a.run })).filter(a => !q || norm(a.label).includes(q));
  const seed = q && /^[0-9a-z]{4,7}$/.test(q) ? seedOf(q) : null;
  if (seed != null) items.unshift({ label: t('loadCode') + ' ' + codeOf(seed), icon: 'bolt', hint: '↵', run: () => studio.setVisual(seed) });
  sel = Math.min(sel, Math.max(0, items.length - 1));
  list.textContent = '';
  if (!items.length) { list.append(el('li.none', { text: t('palEmpty') })); return; }
  items.forEach((a, i) => {
    const li = el('li', { role: 'option', id: 'pal-' + i, 'aria-selected': i === sel ? 'true' : 'false' }, icon(a.icon), el('span', { text: a.label }), a.hint ? el('kbd', { text: a.hint }) : null);
    li.addEventListener('click', () => choose(i));
    li.addEventListener('pointermove', () => { if (sel !== i) { sel = i; mark(); } });
    list.append(li);
  });
  input.setAttribute('aria-activedescendant', 'pal-' + sel);
}
function mark() {
  Array.from(list.children).forEach((li, i) => li.setAttribute('aria-selected', i === sel ? 'true' : 'false'));
  input.setAttribute('aria-activedescendant', 'pal-' + sel);
  const cur = list.children[sel]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}
function choose(i) { const a = items[i]; closePalette(); if (a) a.run(); }

export const paletteOpen = () => box && !box.hidden;
export function openPalette() {
  if (paletteOpen()) return;
  lastFocus = document.activeElement;
  box.hidden = false; input.value = ''; sel = 0; render(); input.focus();
}
export function closePalette() {
  if (!paletteOpen()) return;
  box.hidden = true;
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
export function initPalette() {
  box = $('#palette'); input = $('#pal-input'); list = $('#pal-list');
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'Tab') e.preventDefault(); // the palette is modal: keep focus in the field
    e.stopPropagation();
  });
  box.addEventListener('pointerdown', e => { if (e.target === box) closePalette(); });
  $('#btn-palette').addEventListener('click', openPalette);
}
