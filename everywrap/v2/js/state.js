// Shared helpers and state for every page.
export const R = document.documentElement;
export const ROOT = R.dataset.root || "";
export const $ = (s, c = document) => c.querySelector(s);
export const $$ = (s, c = document) => [...c.querySelectorAll(s)];
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const phone = matchMedia("(max-width: 860px)");
export const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const FIN = [
  ["satin-black", "Satin Black", "Satin black.", "radial-gradient(circle at 32% 28%,#4a4a4c,#151516 62%)"],
  ["gloss-black", "Gloss Black", "Gloss black.", "radial-gradient(circle at 30% 24%,#fff 0 5%,#2a2a2c 14%,#050506 60%)"],
  ["satin-grey", "Satin Grey", "Satin grey.", "radial-gradient(circle at 32% 28%,#b9bdc2,#7d8389 70%)"],
  ["satin-red", "Satin Red", "Satin red.", "radial-gradient(circle at 32% 28%,#e0484d,#7c1118 70%)"],
  ["color-shift", "Color Shift", "Color shift.", "conic-gradient(from 210deg,#6d3bd6,#1fb8b0,#2b6fe0,#7a3fd1,#6d3bd6)"],
];
// What the visitor is looking at. The price form reads this to pre-fill itself.
export const S = { ch: R.dataset.ch || "wrap", finish: "satin-black", ppf: "front", tint: 20, vehicle: "sedan", commercial: R.dataset.mode === "commercial" };
export const DATA = { manifest: null, work: [] };
export const hooks = { heroGo: null, say: null };
export const fin = () => FIN.find((f) => f[0] === S.finish);

// Scroll progress of an element through the viewport: 0 when its top reaches the
// top of the screen, 1 when its bottom reaches the bottom (for sticky scenes).
export function progress(el) {
  const r = el.getBoundingClientRect(), span = r.height - innerHeight;
  return span > 0 ? clamp(-r.top / span) : clamp(1 - (r.top + r.height) / (innerHeight + r.height));
}
const watchers = new Set();
let ticking = false;
export function onScroll(fn) { watchers.add(fn); fn(); }
function fire() { ticking = false; watchers.forEach((f) => f()); }
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(fire); } }, { passive: true });
addEventListener("resize", () => { if (!ticking) { ticking = true; requestAnimationFrame(fire); } });
