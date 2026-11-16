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
  // KPMF K75400 colours. The fifth entry is the maker's code, shown under the name.
  ["trident-blue", "Gloss Trident Blue", "Gloss Trident Blue.", "radial-gradient(circle at 30% 24%,#fff 0 5%,#3f63d6 16%,#12287e 68%)", "KPMF K75418"],
  ["sterling-blue", "Matte Sterling Blue", "Matte Sterling Blue.", "radial-gradient(circle at 32% 28%,#a9bccf,#62768c 72%)", "KPMF K75514"],
  ["interstellar-pink", "Gloss Interstellar Pink", "Gloss Interstellar Pink.", "radial-gradient(circle at 30% 24%,#fff 0 5%,#ee6fb0 16%,#9c1f63 70%)", "KPMF K75478"],
  ["dynamic-lime", "Ultra Gloss Dynamic Lime", "Ultra Gloss Dynamic Lime.", "radial-gradient(circle at 30% 24%,#fff 0 5%,#c5ec4a 16%,#6f9a0c 70%)", "KPMF K75454"],
  ["vector-green", "Absolute Matte Vector Green", "Absolute Matte Vector Green.", "radial-gradient(circle at 32% 28%,#6f8a5d,#33452a 72%)", "KPMF K75808"],
  ["java-brown", "Matte Java Brown", "Matte Java Brown.", "radial-gradient(circle at 32% 28%,#86604a,#3a2619 72%)", "KPMF K75543"],
  ["dune", "Matte Dune Metallic", "Matte Dune Metallic.", "radial-gradient(circle at 32% 28%,#d9c7a6,#8f7c5c 72%)", "KPMF K75516"],
  ["red-black", "Gloss Red/Black Iridescent", "Gloss Red/Black Iridescent.", "radial-gradient(circle at 30% 24%,#fff 0 4%,#b3202c 16%,#2a0508 72%)", "KPMF K75408"],
];
// What the visitor is looking at. The price form reads this to pre-fill itself.
export const S = { ch: R.dataset.ch || "wrap", finish: "satin-black", ppf: "front", tint: 20, vehicle: "sedan", size: 0, commercial: R.dataset.mode === "commercial" };
export const DATA = { manifest: null, work: [], pricing: null };
export const money = (n) => "$" + (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// Starting price of one row of the price list, for the vehicle size the visitor picked.
export function fromPrice(group, id, size = S.size) {
  const g = DATA.pricing && DATA.pricing.groups[group], r = g && g.rows.find((x) => x.id === id);
  if (!r || r.from == null) return null;
  return Array.isArray(r.from) ? r.from[size] ?? r.from[0] : r.from;
}
export const hooks = { heroGo: null, quote: null, relabel: null, upload: null, files: [] };
export const fin = () => FIN.find((f) => f[0] === S.finish);

// The glow colour follows what the visitor is looking at: the finish on wraps, a fixed colour per service otherwise.
const GLOW = { "trident-blue": ["#4d7dff", "#b9ccff"], "sterling-blue": ["#9db6cf", "#e3edf7"], "interstellar-pink": ["#ff5aa8", "#ffc2de"], "dynamic-lime": ["#b6ea2a", "#efffb0"], "vector-green": ["#8fb277", "#d5e6c9"], "java-brown": ["#c58a5c", "#f0d2b8"], "dune": ["#dcc69c", "#fff1d4"], "red-black": ["#e0263a", "#ff9a8a"], "satin-black": ["#ef5b2a", "#ffd2a6"], "gloss-black": ["#8fb2ff", "#ffffff"], "satin-grey": ["#c9d2dc", "#7f8a96"], "satin-red": ["#ff2f45", "#ff9a6b"], "color-shift": ["#8a5cff", "#1fd6c8"] };
const GLOW_CH = { ppf: ["#6fd3ff", "#ffffff"], tint: ["#a78bff", "#5b6cff"], kits: ["#ff3347", "#ff9a6b"] };
export function glowAs(finishId) { const g = GLOW[finishId]; if (g) { R.style.setProperty("--glow", g[0]); R.style.setProperty("--glow2", g[1]); } }
export function theme(label) {
  if (S.commercial) return;
  const g = GLOW_CH[S.ch] || GLOW[S.finish] || GLOW["satin-black"];
  R.style.setProperty("--glow", g[0]); R.style.setProperty("--glow2", g[1]); R.style.setProperty("--dot", fin()[3]);
  if (label) $$("#hero [data-booksub], #stickybar [data-booksub]").forEach((el) => (el.textContent = label));
}

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
