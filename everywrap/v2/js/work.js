import { CONFIG } from "./config.js";
import { ev } from "./track.js";
import { ROOT, $, $$, esc, reduce, DATA, hooks } from "./state.js";

// Real jobs, shown two ways: a reel that plays by itself, and a square grid
// like a profile page. Both open the same job view.
const TABS = [["all", "All"], ["black", "Black"], ["color", "Colour"], ["shift", "Shift"], ["commercial", "Fleet"]];
const src = (j) => ROOT + CONFIG.assets + j.src;
const year = (j) => (j.date ? j.date.slice(0, 4) : "");
const pool = (tag) => DATA.work.filter((j) => tag === "all" || j.tags.includes(tag));
const alt = (j) => j.title + (j.finish ? ", " + j.finish : "");
let list = [], at = 0; // what the job view pages through

/* ---------- grid ---------- */
function tile(j, k) {
  return `<figure class="tile" style="--k:${k % 12}" data-id="${esc(j.id)}"><button type="button" aria-label="Open ${esc(j.title)}"><img loading="lazy" decoding="async" src="${src(j)}" alt="${esc(alt(j))}"></button><figcaption>${esc(j.title)}</figcaption></figure>`;
}
function render(wall) {
  const tag = wall.dataset.tag || "all", limit = +wall.dataset.limit || 999;
  wall._all = pool(tag); wall._shown = wall._all.slice(0, limit);
  $(".tiles", wall).innerHTML = wall._shown.map(tile).join("") || `<p class="empty">Nothing in this group yet.</p>`;
  const more = $(".wallmore", wall); if (more) more.hidden = wall._all.length <= limit;
}
// The grid keeps moving: every few seconds one square changes to a job that is not
// on screen yet, and its name shows for a moment.
function keepLive(wall) {
  if (reduce) return;
  setInterval(() => {
    const tiles = $$(".tile", wall), all = wall._all || [], shown = wall._shown || [], r = wall.getBoundingClientRect();
    if (document.hidden || tiles.length < 4 || r.bottom < 0 || r.top > innerHeight || !$("#lightbox").hidden) return;
    const i = Math.floor(Math.random() * tiles.length), el = tiles[i], spare = all.filter((j) => !shown.includes(j));
    const flash = () => { el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2200); };
    if (!spare.length) return flash();
    const j = spare[Math.floor(Math.random() * spare.length)], old = $("img", el), im = new Image();
    im.alt = alt(j); im.decoding = "async"; im.className = "out";
    im.onload = () => {
      old.after(im); void im.offsetWidth; im.classList.remove("out"); setTimeout(() => old.remove(), 950);
      shown[i] = j; el.dataset.id = j.id; $("button", el).setAttribute("aria-label", "Open " + j.title); $("figcaption", el).textContent = j.title; flash();
    };
    im.src = src(j);
  }, 2600);
}

/* ---------- reel ---------- */
function makeReel(reel) {
  const stage = $(".reel-stage", reel), bars = $(".reel-bars", reel), kicker = $(".reel-kicker", reel), title = $(".reel-title", reel), finEl = $(".reel-fin", reel), pauseBtn = $(".reel-pause", reel);
  const DUR = 3800;
  let items = [], i = 0, timer = 0, t0 = 0, left = DUR, visible = false, stopped = reduce, held = false, tag = "all";
  reel.style.setProperty("--dur", DUR + "ms");
  const pause = () => { if (timer) { clearTimeout(timer); timer = 0; left = Math.max(250, left - (performance.now() - t0)); } reel.classList.add("paused"); };
  const play = () => { if (timer || !visible || stopped || held || items.length < 2) return; reel.classList.remove("paused"); t0 = performance.now(); timer = setTimeout(() => { timer = 0; show(i + 1); }, left); };
  function show(n) {
    i = (n + items.length) % items.length; const j = items[i], old = $$("img", stage), im = new Image();
    im.alt = ""; im.decoding = "async"; im.src = src(j); if (i % 2) im.classList.add("alt");
    stage.appendChild(im); void im.offsetWidth; im.classList.add("on");
    old.forEach((o) => o.classList.remove("on")); setTimeout(() => old.forEach((o) => o.remove()), 750);
    [...bars.children].forEach((b, k) => (b.className = k < i ? "done" : "")); void bars.offsetWidth; bars.children[i].className = "on";
    kicker.textContent = [year(j), j.location].filter(Boolean).join(" · ");
    title.innerHTML = j.title.split(/\s+/).map((w, k) => `<span><b style="--n:${k}">${esc(w)}</b></span>`).join("");
    finEl.textContent = j.finish || "";
    for (const el of [kicker, finEl]) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
    clearTimeout(timer); timer = 0; left = DUR; if (visible && !stopped && !held) play(); else reel.classList.add("paused");
  }
  function load(t) {
    tag = t; clearTimeout(timer); timer = 0;
    // The largest photos first: this card is the biggest picture on the page.
    items = pool(t).filter((j) => !j.tags.includes("shop")).sort((a, b) => Math.min(b.w, b.h * 0.8) - Math.min(a.w, a.h * 0.8)).slice(0, 8);
    stage.innerHTML = ""; bars.innerHTML = items.map(() => "<i></i>").join(""); reel.hidden = !items.length;
    if (items.length) show(0);
  }
  let downAt = 0;
  $$(".reel-hit", reel).forEach((b) => {
    b.addEventListener("pointerdown", () => { downAt = performance.now(); held = true; pause(); });
    b.addEventListener("click", () => { if (performance.now() - downAt < 320) show(i + (b.classList.contains("prev") ? -1 : 1)); });
  });
  addEventListener("pointerup", () => { if (held) { held = false; play(); } });
  addEventListener("pointercancel", () => { if (held) { held = false; play(); } });
  pauseBtn.setAttribute("aria-pressed", stopped); pauseBtn.setAttribute("aria-label", stopped ? "Play" : "Pause");
  pauseBtn.addEventListener("click", () => { stopped = !stopped; pauseBtn.setAttribute("aria-pressed", stopped); pauseBtn.setAttribute("aria-label", stopped ? "Play" : "Pause"); stopped ? pause() : play(); });
  $(".reel-open", reel).addEventListener("click", () => { list = pool(tag); open(Math.max(0, list.indexOf(items[i]))); });
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? play() : pause(); }, { threshold: 0.4 }).observe(reel);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  return { load };
}

/* ---------- job view ---------- */
function open(n) {
  ev("work_open", "", true);
  at = (n + list.length) % list.length; const j = list[at], lb = $("#lightbox");
  $("#lbImg").src = src(j); $("#lbImg").alt = j.title;
  $("#lbTitle").textContent = j.title; $("#lbFinish").textContent = j.finish || "";
  $("#lbCap").textContent = j.caption ? "“" + j.caption + "”" : ""; $("#lbCap").hidden = !j.caption;
  const meta = [year(j), j.location, j.brands && j.brands.length ? "Film: " + j.brands.join(", ") : ""].filter(Boolean);
  $("#lbMeta").innerHTML = meta.map((m) => `<li>${esc(m)}</li>`).join("");
  $("#lbCount").textContent = `${at + 1} / ${list.length}`;
  if (lb.hidden) { lb.hidden = false; $("#lbClose").focus(); }
}
function close() { const lb = $("#lightbox"); if (lb.hidden) return; lb.hidden = true; const b = list[at] && $(`.tile[data-id="${list[at].id}"] button`); if (b) b.focus(); }

export function initWork() {
  const walls = $$(".wall"), lb = $("#lightbox");
  if (!DATA.work.length || !lb) return;
  const reelEl = $("#reel"), reel = reelEl ? makeReel(reelEl) : null;
  walls.forEach((wall) => {
    const tabs = $(".tabs", wall), cur = wall.dataset.tag || "all";
    if (tabs) {
      tabs.innerHTML = TABS.filter(([id]) => id === "all" || pool(id).length).map(([id, label]) => `<button type="button" data-tag="${id}" aria-pressed="${id === cur}"${id === cur ? ' class="live"' : ""}>${label}</button>`).join("");
      tabs.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b || b.getAttribute("aria-pressed") === "true") return;
        $$("button", tabs).forEach((x) => { x.setAttribute("aria-pressed", x === b); x.classList.toggle("live", x === b); });
        wall.dataset.tag = b.dataset.tag; render(wall); if (reel) reel.load(b.dataset.tag);
      });
    }
    render(wall); keepLive(wall);
    $(".tiles", wall).addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (!t) return; list = wall._all; open(Math.max(0, list.findIndex((j) => j.id === t.dataset.id))); });
  });
  if (reel) reel.load("all");
  $("#lbClose").addEventListener("click", close); $("#lbPrev").addEventListener("click", () => open(at - 1)); $("#lbNext").addEventListener("click", () => open(at + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  $("#lbQuote").addEventListener("click", () => { const j = list[at]; close(); if (hooks.quote) hooks.quote({ note: `Like this job: ${j.title}${j.finish ? ", " + j.finish : ""}` }); });
  document.addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") open(at - 1); if (e.key === "ArrowRight") open(at + 1); });
  let x0 = null; lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) open(at + (dx < 0 ? 1 : -1)); x0 = null; });
}
