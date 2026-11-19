export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
/** el('button.tile', { type: 'button', 'data-id': x }, child, 'text') */
export function el(spec, attrs, ...kids) {
  const [tag, ...cls] = spec.split('.');
  const n = document.createElement(tag || 'div');
  if (cls.length) n.className = cls.join(' ');
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : v); }
  for (const k of kids) if (k != null) n.append(k);
  return n;
}
const NS = 'http://www.w3.org/2000/svg';
export function icon(id) {
  const s = document.createElementNS(NS, 'svg'), u = document.createElementNS(NS, 'use');
  u.setAttribute('href', '#i-' + id); s.append(u); s.setAttribute('aria-hidden', 'true');
  return s;
}
export const fmtTime = s => { if (!isFinite(s)) return '0:00'; s = Math.max(0, s | 0); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };
/** Paints the filled part of a range input (WebKit has no ::range-progress). */
export function fillRange(input) { const min = +input.min || 0, max = +input.max || 100; input.style.setProperty('--v', ((input.value - min) / (max - min) * 100).toFixed(1) + '%'); }
