import { CONFIG } from "./config.js";
import { ROOT, $, $$, esc, DATA, hooks } from "./state.js";

// The work wall: real jobs, filterable, with a lightbox that shows the owner's own caption.
const FILTERS = [["all", "All work"], ["black", "Satin and matte black"], ["color", "Colour change"], ["shift", "Colour shift"], ["commercial", "Commercial"], ["shop", "In the shop"]];
const src = (j) => ROOT + CONFIG.assets + j.src;
const year = (j) => (j.date ? j.date.slice(0, 4) : "");
let list = [], at = 0;

function tile(j, i) {
  return `<figure class="tile" style="--ar:${(j.w / j.h).toFixed(3)}"><button type="button" data-i="${i}" aria-label="Open ${esc(j.title)}"><img loading="lazy" decoding="async" width="${j.w}" height="${j.h}" src="${src(j)}" alt="${esc(j.title)}${j.finish ? ", " + esc(j.finish) : ""}"></button><figcaption><b>${esc(j.title)}</b>${j.finish ? `<span>${esc(j.finish)}</span>` : ""}</figcaption></figure>`;
}
function render(wall) {
  const tag = wall.dataset.tag || "all", limit = +wall.dataset.limit || 999;
  list = DATA.work.filter((j) => tag === "all" || j.tags.includes(tag)).slice(0, limit);
  $(".tiles", wall).innerHTML = list.map(tile).join("") || `<p class="empty">Nothing in this group yet.</p>`;
  const more = $(".wallmore", wall); if (more) more.hidden = DATA.work.filter((j) => tag === "all" || j.tags.includes(tag)).length <= limit;
}
function open(i) {
  at = (i + list.length) % list.length; const j = list[at], lb = $("#lightbox");
  $("#lbImg").src = src(j); $("#lbImg").alt = j.title;
  $("#lbTitle").textContent = j.title; $("#lbFinish").textContent = j.finish || "";
  $("#lbCap").textContent = j.caption ? "“" + j.caption + "”" : ""; $("#lbCap").hidden = !j.caption;
  const meta = [year(j), j.location, j.brands && j.brands.length ? "Film: " + j.brands.join(", ") : "", j.likes ? j.likes + " likes on Instagram" : ""].filter(Boolean);
  $("#lbMeta").innerHTML = meta.map((m) => `<li>${esc(m)}</li>`).join("");
  $("#lbCount").textContent = `${at + 1} / ${list.length}`;
  if (lb.hidden) { lb.hidden = false; lb.dataset.prev = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.i || "" : ""; $("#lbClose").focus(); }
}
function close() { const lb = $("#lightbox"); if (lb.hidden) return; lb.hidden = true; const b = $(`.tile button[data-i="${at}"]`); if (b) b.focus(); }

export function initWork() {
  const walls = $$(".wall"); if (!walls.length || !DATA.work.length) return;
  walls.forEach((wall) => {
    const f = $(".filters", wall);
    if (f) { f.innerHTML = FILTERS.filter(([id]) => id === "all" || DATA.work.some((j) => j.tags.includes(id))).map(([id, label]) => `<button type="button" class="chip" data-tag="${id}" aria-pressed="${id === (wall.dataset.tag || "all")}">${label}</button>`).join("");
      f.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; wall.dataset.tag = b.dataset.tag; $$("button", f).forEach((x) => x.setAttribute("aria-pressed", x === b)); render(wall); }); }
    render(wall);
    $(".tiles", wall).addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (b) { render(wall); open(+b.dataset.i); } });
  });
  const lb = $("#lightbox"); if (!lb) return;
  $("#lbClose").addEventListener("click", close); $("#lbPrev").addEventListener("click", () => open(at - 1)); $("#lbNext").addEventListener("click", () => open(at + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  $("#lbQuote").addEventListener("click", () => { const j = list[at]; close(); if (hooks.quote) hooks.quote({ note: `Like this job: ${j.title}${j.finish ? ", " + j.finish : ""}` }); });
  document.addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") open(at - 1); if (e.key === "ArrowRight") open(at + 1); });
  let x0 = null; lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) open(at + (dx < 0 ? 1 : -1)); x0 = null; });
}
