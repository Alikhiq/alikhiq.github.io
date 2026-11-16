import { Stage, loadImage } from "./engine.js";
import { CONFIG } from "./config.js";
import { ev } from "./track.js";
import { R, ROOT, $, $$, reduce, phone, esc, FIN, S, DATA, hooks, fin, theme, fromPrice, money } from "./state.js";

const CHAPTERS = [
  { id: "wrap", label: "Wrap", sub: "Pick a colour and drag the line. Thirteen finishes to try, then see it on your own car." },
  { id: "ppf", label: "Protect", head: ["Protection film.", "Done right."], sub: "Clear film over the panels that take the hits. The lit area is what gets covered." },
  { id: "tint", label: "Tint", head: ["Window tint.", "Done right."], sub: "Pick a shade. The number is how much light gets through." },
  { id: "kits", label: "Kits", head: ["Body kits.", "Done right."], sub: "Tell us what you drive. We find the kit that fits, fit it and wrap it." },
];
const RICON = {
  wrap: '<path d="M4 7h11a4 4 0 010 8H9"/><path d="M9 15H7a3 3 0 000 6h13"/>',
  ppf: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.500-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  tint: '<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M4 12h16" opacity=".5"/><path d="M4 9h16M4 15h16" opacity=".25"/>',
  kits: '<path d="M3 15l2-5a3 3 0 012.800-2h8.400a3 3 0 012.800 2l2 5v3H3z"/><circle cx="7.500" cy="16" r="1.500"/><circle cx="16.500" cy="16" r="1.500"/><path d="M2 19h20"/>',
};
const PPF = [["partial", "Partial front"], ["front", "Full front"], ["full", "Full body"]];
const TINT = [70, 35, 20, 5];
const HINTS = { partial: "Partial front covers the bumper and the leading edge of the hood and fenders.", front: "Full front covers the bumper, the full hood, both fenders and the mirrors.", full: "Full body protects every painted panel." };

let stage = null, dragging = false;
const M = () => DATA.manifest;
const veh = () => M().vehicles[S.vehicle];
const factoryOf = (v) => (v.sets["factory-white"] ? "factory-white" : v.sets.factory ? "factory" : null);
function supports(v, ch) {
  if (ch === "wrap") return !!factoryOf(v) && FIN.every((f) => v.sets[f[0]]);
  if (ch === "ppf") return !!(v.sets["gloss-black"] && v.masks && v.masks["ppf-front"]);
  if (ch === "tint") return !!(v.sets["clear-glass"] && v.sets["satin-black"]);
  if (ch === "kits") return !!(v.sets.kit && v.sets["satin-black"]);
  return false;
}
function scene() {
  const v = veh();
  if (S.ch === "ppf") return { before: "gloss-black", after: null, seam: false, mask: v.masks["ppf-" + S.ppf] };
  if (S.ch === "tint") return { before: "clear-glass", after: "satin-black", seam: true, alpha: { 70: 0.22, 35: 0.52, 20: 0.8, 5: 1 }[S.tint] };
  if (S.ch === "kits") return { before: "satin-black", after: "kit", seam: true };
  return { before: factoryOf(v), after: S.finish, seam: true };
}
function renderRail() {
  $("#rail").innerHTML = CHAPTERS.map((c) => `<li><button type="button" data-id="${c.id}" aria-current="${c.id === S.ch}"${c.id === S.ch ? ' class="live"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RICON[c.id] || ""}</svg><span>${c.label}</span></button></li>`).join("");
}
const PPF_NAME = { partial: "Partial front", front: "Full front", full: "Full body" };
const bookName = () => (S.ch === "ppf" ? PPF_NAME[S.ppf] + " PPF" : S.ch === "tint" ? S.tint + "% tint" : S.ch === "kits" ? "Body kit, quoted per car" : fin()[1].charAt(0) + fin()[1].slice(1).toLowerCase() + " wrap");
const bookPrice = () => (S.ch === "ppf" ? fromPrice("ppf", S.ppf) : S.ch === "tint" ? fromPrice("tint", "carbon") : S.ch === "kits" ? null : fromPrice("wrap", S.finish === "color-shift" ? "shift" : "full"));
const bookLabel = () => { const p = bookPrice(); return bookName() + (p ? " · from " + money(p) : ""); };
function renderCopy() {} // the headline is fixed now: it says what we sell
function renderOpts() {
  const o = $("#opts");
  if (S.ch === "wrap") o.innerHTML = `<div class="dotrow">` + FIN.map((f) => `<button type="button" class="dot" data-f="${f[0]}" aria-label="${f[1]}" aria-pressed="${f[0] === S.finish}" style="background:${f[3]}"></button>`).join("") + `</div><span class="optname"><b>${fin()[1]}</b>${fin()[4] ? `<small>${fin()[4]}</small>` : ""}</span>`;
  else if (S.ch === "ppf") o.innerHTML = PPF.map((p) => `<button type="button" class="chip" data-p="${p[0]}" aria-pressed="${p[0] === S.ppf}">${p[1]}</button>`).join("");
  else if (S.ch === "tint") o.innerHTML = TINT.map((t) => `<button type="button" class="chip" data-t="${t}" aria-pressed="${t === S.tint}">${t}%</button>`).join("");
  else o.innerHTML = "";
  // keep the picked swatch in view inside its strip
  const row = $(".dotrow", o), on = row && $('[aria-pressed="true"]', row);
  if (on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
}
function measure() {
  const cz = $("#carzone").getBoundingClientRect(), cv = $("#stage").getBoundingClientRect();
  if (!cv.width || !cv.height) return;
  stage.setRegion({ x0: (cz.left - cv.left) / cv.width, x1: (cz.right - cv.left) / cv.width, y0: (cz.top - cv.top) / cv.height, y1: (cz.bottom - cv.top) / cv.height });
  stage.fit = phone.matches ? 1.02 : 0.94;
}
function syncSeam() {
  const cz = $("#carzone").getBoundingClientRect(), cv = $("#stage").getBoundingClientRect(), b = stage.box;
  if (!b || !cz.width) return;
  const x0 = (b.x0 * cv.width + cv.left - cz.left) / cz.width, x1 = (b.x1 * cv.width + cv.left - cz.left) / cz.width, cy = (((b.y0 + b.y1) / 2) * cv.height + cv.top - cz.top) / cz.height, ctl = $("#seamctl");
  ctl.style.setProperty("--seam-x0", `calc(${(x0 * 100).toFixed(2)}% - 22px)`);
  ctl.style.setProperty("--seam-x1", `calc(${(x1 * 100).toFixed(2)}% + 22px)`);
  ctl.style.setProperty("--seam-y", (cy * 100).toFixed(2) + "%");
  if (!dragging) $("#seam").value = Math.round((stage.noseLeft() ? stage.seam : 1 - stage.seam) * 1000);
  const ta = $("#tagA"), tb = $("#tagB");
  if (ta && tb) {
    const on = !ctl.hidden && stage.seamX != null; ta.hidden = tb.hidden = !on;
    if (on) {
      const sx = stage.seamX * cv.width + cv.left - cz.left, y = Math.max(0, b.y0 * cv.height + cv.top - cz.top - 4) + "px", left = stage.noseLeft();
      const [l, r] = left ? [ta, tb] : [tb, ta];
      l.style.cssText = `top:${y};right:${(cz.width - sx + 12).toFixed(1)}px;left:auto`; r.style.cssText = `top:${y};left:${(sx + 12).toFixed(1)}px;right:auto`;
    }
  }
}
async function paint(sweep) {
  if (!supports(veh(), S.ch)) S.vehicle = Object.keys(M().vehicles).find((k) => supports(M().vehicles[k], S.ch)) || S.vehicle;
  const sc = scene();
  $("#seamctl").hidden = !sc.seam;
  $("#seamLabel").textContent = { wrap: "Drag the seam: factory paint on one side, " + fin()[1] + " on the other", tint: "Drag the seam: clear glass on one side, tinted on the other", kits: "Drag the seam: stock on one side, with the kit on the other" }[S.ch] || "";
  const tags = { wrap: [fin()[1], "Factory"], tint: [S.tint + "% tint", "Clear glass"], kits: ["With kit", "Stock"] }[S.ch];
  if (tags && $("#tagA")) { $("#tagA").textContent = tags[0]; $("#tagB").textContent = tags[1]; }
  measure();
  await stage.show(veh(), sc.before, sc.after, { sweep, afterAlpha: sc.alpha ?? 1, seam: sc.seam, maskSrc: sc.mask || null });
  $("#carzone").classList.toggle("spin", stage.frameCount() > 1);
}
function hint() {
  const c = CHAPTERS.find((x) => x.id === S.ch);
  let t = c.sub;
  if (S.ch === "tint" && S.tint < 50) t = `${S.tint}% lets ${S.tint}% of light through. Ohio needs 50% or more on the front side windows, so this shade is for the rear.`;
  else if (S.ch === "ppf") t = HINTS[S.ppf];
  $("#sub").textContent = t;
}
function go(patch, sweep = true) {
  if (patch.vehicle && !M().vehicles[patch.vehicle]) delete patch.vehicle;
  if (patch.ch && !CHAPTERS.some((c) => c.id === patch.ch)) delete patch.ch;
  if (R.dataset.lock && patch.ch && patch.ch !== S.ch) { location.href = ROOT + { wrap: "vinyl-wrap", ppf: "paint-protection-film", tint: "window-tint", kits: "body-kits" }[patch.ch] + "/index.html"; return; }
  Object.assign(S, patch);
  renderRail(); renderCopy(); renderOpts(); paint(sweep); hint(); theme(bookLabel());
}

export function initHero() {
  if (!$("#stage") || !M()) return;
  if (new URLSearchParams(location.search).get("dev") === "spin") {
    const c = M().vehicles.sedan, order = ["factory-white", "satin-grey", "satin-red", "color-shift"].map((k) => c.sets[k].frames[0]);
    for (const k of Object.keys(c.sets)) c.sets[k].frames = [c.sets[k].frames[0], ...order];
  }
  stage = new Stage($("#stage"), { base: ROOT + CONFIG.assets, reduceMotion: reduce });
  stage.onDraw = syncSeam;
  hooks.heroGo = go; hooks.relabel = () => theme(bookLabel());
  window.__ew = { S, stage, go };
  $("#rail").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { ev("service_pick", b.dataset.id); go({ ch: b.dataset.id }); } });
  $("#opts").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.f) { ev("finish_pick", b.dataset.f); go({ finish: b.dataset.f }); } else if (b.dataset.p) go({ ppf: b.dataset.p }, false); else if (b.dataset.t) go({ tint: +b.dataset.t }, false); });
  const seam = $("#seam");
  seam.addEventListener("input", () => { const left = seam.value / 1000; stage.setSeam(stage.noseLeft() ? left : 1 - left); });
  seam.addEventListener("pointerdown", () => (dragging = true)); addEventListener("pointerup", () => (dragging = false));
  const cz = $("#carzone"); let spin = null;
  cz.addEventListener("pointerdown", (e) => { if (e.target === seam || stage.frameCount() < 2) return; spin = { x: e.clientX, a: stage.angle }; cz.setPointerCapture(e.pointerId); });
  cz.addEventListener("pointermove", (e) => { if (!spin) return; const n = stage.frameCount(), w = cz.getBoundingClientRect().width; stage.angle = (((spin.a - ((e.clientX - spin.x) / w) * n) % n) + n) % n; stage.invalidate(); });
  cz.addEventListener("pointerup", () => (spin = null)); cz.addEventListener("pointercancel", () => (spin = null));
  if (!reduce && matchMedia("(pointer:fine)").matches) $("#hero").addEventListener("pointermove", (e) => { const r = $("#stage").getBoundingClientRect(); stage.setParallax(0.5 - (e.clientX - r.left) / r.width, 0.5 - (e.clientY - r.top) / r.height); });
  addEventListener("resize", () => { measure(); stage.resize(); });
  if (phone.addEventListener) phone.addEventListener("change", () => { measure(); stage.invalidate(); });
  renderRail(); renderCopy(); renderOpts(); paint(false); hint(); theme(bookLabel());
  setTimeout(() => { for (const s of Object.values(veh().sets)) s.frames.forEach((f) => loadImage(ROOT + CONFIG.assets + f)); }, 1500);
}
export function heroSweep() { if (stage) { stage.seam = 0; stage.setSeam(0.5, true); } }
