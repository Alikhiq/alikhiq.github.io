import { CONFIG } from "./config.js";
import { ev } from "./track.js";
import { R, ROOT, $, $$, reduce, esc, clamp, FIN, S, DATA, hooks, progress, onScroll, glowAs, theme, money } from "./state.js";

/* ---------- light tunnel (canvas) ---------- */
class Tunnel {
  constructor(canvas, { light = false, round = false, line = "235,240,255", accent = "255,40,60", every = 4 } = {}) {
    Object.assign(this, { c: canvas, x: canvas.getContext("2d"), light, round, line, accent, every, off: 0, speed: 0.12, boost: 0, on: false, last: 0 });
    this.streaks = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2 + (i % 3) * 0.21, r: 0.25 + ((i * 37) % 60) / 100, red: i % 5 === 0 }));
    new ResizeObserver(() => this.size()).observe(canvas);
    new IntersectionObserver((es) => { this.on = es[0].isIntersecting; if (this.on) this.loop(); }, { rootMargin: "20%" }).observe(canvas);
    this.size();
  }
  size() { const r = this.c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); this.c.width = Math.max(2, r.width * d); this.c.height = Math.max(2, r.height * d); this.draw(); }
  loop() { if (this.raf) return; const step = (t) => { this.raf = 0; if (!this.on) return; const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t; if (!reduce) this.off += dt * (this.speed + this.boost); this.boost *= 0.92; this.draw(); this.raf = requestAnimationFrame(step); }; this.raf = requestAnimationFrame(step); }
  arch(cx, cy, hw, top, floor) {
    const x = this.x; x.beginPath();
    if (this.round) { x.moveTo(cx - hw, floor); x.lineTo(cx - hw, cy - top + hw); x.arc(cx, cy - top + hw, hw, Math.PI, 0); x.lineTo(cx + hw, floor); }
    else { x.moveTo(cx - hw, floor); x.lineTo(cx - hw, cy - top); x.lineTo(cx + hw, cy - top); x.lineTo(cx + hw, floor); }
    x.stroke();
  }
  draw() {
    const { c, x } = this, W = c.width, H = c.height, tall = H > W, cx = W * 0.5, cy = H * (tall ? 0.36 : 0.42), N = 13;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over";
    x.fillStyle = this.light ? "#f4f5f7" : "#000"; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = this.light ? "source-over" : "lighter"; x.lineCap = "square";
    const frac = this.off % 1, base = Math.floor(this.off);
    for (let i = N; i >= 0; i--) {
      const d = i - frac; if (d < 0.02) continue;
      const s = 1 / (0.42 + d * 0.62), hw = W * (tall ? 0.6 : 0.34) * s, top = H * (tall ? 0.2 : 0.3) * s, floor = cy + H * (tall ? 0.2 : 0.26) * s;
      const fade = clamp((N - d) / 4) * clamp(d / 0.6), red = (((i + base) % this.every) + this.every) % this.every === 0, col = red ? this.accent : this.line;
      x.strokeStyle = `rgba(${col},${(0.16 * fade).toFixed(3)})`; x.lineWidth = Math.max(2, 14 * s * (W / 900)); this.arch(cx, cy, hw, top, floor);
      x.strokeStyle = `rgba(${col},${(0.9 * fade).toFixed(3)})`; x.lineWidth = Math.max(1, 3.2 * s * (W / 900)); this.arch(cx, cy, hw, top, floor);
      // short reflection of the uprights in the floor
      const g = x.createLinearGradient(0, floor, 0, floor + H * 0.2 * s); g.addColorStop(0, `rgba(${col},${(0.35 * fade).toFixed(3)})`); g.addColorStop(1, `rgba(${col},0)`);
      x.strokeStyle = g; x.beginPath(); x.moveTo(cx - hw, floor); x.lineTo(cx - hw, floor + H * 0.2 * s); x.moveTo(cx + hw, floor); x.lineTo(cx + hw, floor + H * 0.2 * s); x.stroke();
    }
    const k = clamp(this.boost * 1.6); // speed streaks
    if (k > 0.03 && !reduce) for (const st of this.streaks) {
      const r0 = Math.max(W, H) * st.r * (0.5 + ((this.off * 0.9 + st.r) % 1) * 0.9), r1 = r0 + Math.max(W, H) * 0.3 * k;
      x.strokeStyle = `rgba(${st.red ? this.accent : this.line},${(0.5 * k).toFixed(3)})`; x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx + Math.cos(st.a) * r0, cy + Math.sin(st.a) * r0 * 0.7); x.lineTo(cx + Math.cos(st.a) * r1, cy + Math.sin(st.a) * r1 * 0.7); x.stroke();
    }
  }
}

/* ---------- small moving pictures: real jobs by tag, cross-fading while in view ---------- */
function initReels() {
  const els = $$("[data-reel]"); if (!els.length) return;
  const pools = {};
  const pool = (tag) => pools[tag] || (pools[tag] = DATA.work.filter((j) => j.tags.includes(tag)).map((j) => ROOT + CONFIG.assets + j.src));
  const live = new Set();
  els.forEach((el, n) => {
    const [kind, v] = el.dataset.reel.split(":"), list = kind === "tag" ? pool(v) : [ROOT + CONFIG.assets + v];
    if (!list.length) return;
    el._list = list; el._i = (n * 3) % list.length;
    el.innerHTML = `<img alt="" loading="lazy" src="${list[el._i]}"><img alt="" loading="lazy">`;
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))), { rootMargin: "80px" });
  els.forEach((el) => el._list && el._list.length > 1 && io.observe(el));
  if (reduce) return;
  let turn = 0;
  setInterval(() => {
    const now = [...live]; if (!now.length || document.hidden) return;
    const el = now[turn++ % now.length], [a, b] = el.children, on = el.classList.contains("flip") ? b : a, off = on === a ? b : a;
    el._i = (el._i + 1) % el._list.length; off.src = el._list[el._i];
    const go = () => el.classList.toggle("flip"); off.complete ? go() : off.addEventListener("load", go, { once: true });
  }, 900);
}

/* ---------- print products: a card that tilts with the pointer and shows each material in use ---------- */
function initPV() {
  const el = $("#pv"); if (!el) return;
  const items = JSON.parse($("#pvData").textContent), groups = [...new Set(items.map((x) => x.surface))];
  $("#pvPick").innerHTML = groups.map((g) => `<div class="pv-group"><span class="legend">${esc(g)}</span><div>${items.filter((x) => x.surface === g).map((x) => `<button type="button" data-id="${x.id}" aria-pressed="false">${esc(x.name)}</button>`).join("")}</div></div>`).join("");
  const card = $("#pvCard"), img = $("#pvImg"), stage = $(".pv-stage", el);
  let cur = -1, touched = false;
  const show = (i) => {
    if (i === cur) return; cur = i; const x = items[i];
    card.classList.remove("in"); void card.offsetWidth;
    img.src = ROOT + CONFIG.assets + x.img; img.alt = x.name;
    $("#pvSurf").textContent = x.surface; $("#pvName").textContent = x.name; $("#pvNote").textContent = x.note; $("#pvPrice").innerHTML = x.price;
    card.classList.add("in");
    $$("#pvPick button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === x.id));
  };
  $("#pvPick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; touched = true; ev("calc_use", "viewer", true); show(items.findIndex((x) => x.id === b.dataset.id)); });
  if (!reduce) {
    stage.addEventListener("pointermove", (e) => { const r = stage.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add("held"); card.style.setProperty("--ry", (px * 22).toFixed(2) + "deg"); card.style.setProperty("--rx", (-py * 16).toFixed(2) + "deg"); card.style.setProperty("--sx", (30 + px * 80).toFixed(1) + "%"); });
    stage.addEventListener("pointerleave", () => { card.classList.remove("held"); ["--rx", "--ry", "--sx"].forEach((k) => card.style.removeProperty(k)); });
    setInterval(() => { const r = el.getBoundingClientRect(); if (touched || document.hidden || r.bottom < 0 || r.top > innerHeight) return; show((cur + 1) % items.length); }, 3600);
  }
  show(0);
}

/* ---------- the film wall: every finish as a swatch, in two moving rows ---------- */
function initWall() {
  const el = $("#swall"); if (!el) return;
  const chip = (f) => `<button type="button" class="swchip" data-f="${f[0]}"><i class="sph ${f[0] === "color-shift" ? "shift" : /gloss/i.test(f[1]) ? "gloss" : /matte/i.test(f[1]) ? "matte" : "satin"}" style="--c:${f[3]}"></i><span><b>${esc(f[1])}</b><small>${esc(f[4] || "In stock films")}</small></span></button>`;
  const half = Math.ceil(FIN.length / 2), rows = [FIN.slice(0, half), FIN.slice(half)];
  el.innerHTML = rows.map((r, n) => `<div class="swrow${n ? " rev" : ""}"><div>${r.map(chip).join("")}${r.map(chip).join("")}${r.map(chip).join("")}</div></div>`).join("");
  el.addEventListener("click", (e) => { const b = e.target.closest(".swchip"); if (!b || !hooks.heroGo) return; hooks.heroGo({ ch: "wrap", finish: b.dataset.f }); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
}

// Shrinks a headline until its longest word fits the width it has.
function fit(el) { el.style.fontSize = ""; let fs = parseFloat(getComputedStyle(el).fontSize), n = 0; while (el.scrollWidth > el.clientWidth + 1 && fs > 28 && n++ < 30) { fs -= 3; el.style.fontSize = fs + "px"; } }
/* ---------- "GO SATIN BLACK." : scroll drives the finish ---------- */
function initTunnel() {
  const sec = $(".tunnel"); if (!sec) return;
  const t = new Tunnel($("canvas", sec)), cars = $$(".tcar img", sec), head = $(".thead", sec), name = $(".tname", sec), count = $(".tcount", sec), ticks = $$(".truler i", sec);
  const TF = cars.map((im) => FIN.find((f) => f[0] === im.dataset.f)).filter(Boolean), two = (n) => String(n).padStart(2, "0");
  let idx = -1, lastY = scrollY, inside = false;
  const set = (i) => {
    if (i === idx) return; idx = i; const f = TF[i];
    cars.forEach((im) => im.classList.toggle("on", im.dataset.f === f[0]));
    head.innerHTML = `GO ${esc(f[1].toUpperCase())}.`; fit(head); name.textContent = f[1].toUpperCase(); count.textContent = `${two(i + 1)} / ${two(TF.length)}`;
    ticks.forEach((el, n) => el.classList.toggle("on", n === i)); t.boost = 1.2;
  };
  onScroll(() => { const p = progress(sec); t.boost = Math.min(1.6, t.boost + Math.abs(scrollY - lastY) / 700); lastY = scrollY; set(Math.min(TF.length - 1, Math.floor(p * TF.length)));
    const r = sec.getBoundingClientRect(), now = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
    if (now) glowAs(TF[idx][0]); else if (inside) theme();
    inside = now; });
  const jump = (d) => { const r = sec.getBoundingClientRect(), span = r.height - innerHeight, i = clamp(idx + d, 0, TF.length - 1); scrollTo({ top: scrollY + r.top + ((i + 0.5) / TF.length) * span, behavior: reduce ? "auto" : "smooth" }); };
  $(".tprev", sec).addEventListener("click", () => jump(-1)); $(".tnext", sec).addEventListener("click", () => jump(1));
}

/* ---------- commercial: "YOUR FLEET" and "YOUR BRAND IN MOTION." ---------- */
function initFleetWord() {
  const sec = $(".fleetword"); if (!sec) return;
  const word = $(".fw-word", sec), prints = $$(".fw-print", sec);
  onScroll(() => { const r = sec.getBoundingClientRect(), p = clamp(1 - (r.top + r.height * 0.5) / innerHeight, -0.5, 1.2); word.style.transform = `translateY(${(-p * 9).toFixed(2)}%)`; prints.forEach((el, i) => { const k = i - 1; el.style.transform = `translate(${(k * (34 + p * 30)).toFixed(1)}%, ${(Math.abs(k) * 6).toFixed(1)}%) rotate(${(k * (4 + p * 7)).toFixed(2)}deg)`; }); });
  const tray = $(".fw-tray", sec), front = prints[1] && $("img", prints[1]);
  if (tray && front) tray.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; front.src = b.dataset.src; front.alt = b.dataset.alt; $$("button", tray).forEach((x) => x.setAttribute("aria-pressed", x === b)); });
}
function initMotion() {
  const sec = $(".motion"); if (!sec) return;
  const t = new Tunnel($("canvas", sec), { light: true, round: true, line: "255,60,70", accent: "230,20,40", every: 1 }), track = $(".mo-track", sec);
  let lastY = scrollY;
  onScroll(() => { const p = progress(sec); t.boost = Math.min(1.4, t.boost + Math.abs(scrollY - lastY) / 800); lastY = scrollY; if (track) track.style.transform = `translateX(${(-p * (track.scrollWidth - track.parentElement.clientWidth * 0.6)).toFixed(1)}px)`; });
}

/* ---------- reveal on scroll ---------- */
function initReveal() {
  const els = $$("[data-reveal]"); if (!els.length) return;
  R.classList.add("js-reveal");
  if (reduce || !("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((e) => io.observe(e));
}

/* ---------- moving pictures: they only run while they are on screen ---------- */
function initLive() {
  const els = $$("[data-live]"); if (!els.length || reduce || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = $("video", e.target); e.target.classList.toggle("live-on", e.isIntersecting);
    if (!v) return;
    if (e.isIntersecting) { if (!v.getAttribute("src")) { v.addEventListener("playing", () => v.classList.add("playing"), { once: true }); v.src = v.dataset.src; } v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.3 });
  els.forEach((e) => io.observe(e));
}

/* ---------- a framed job photo that wipes to the next one by itself ---------- */
function initBoards() {
  $$(".board").forEach((el) => {
    const cats = JSON.parse(el.dataset.board || "[]"); if (cats.length < 2) return;
    const fig = $("figure", el), under = $(".under", el), over = $(".over", el), cap = $("figcaption", el), dots = $$(".board-dots li", el), sec = el.closest("section"), word = sec && $("[data-flip]", sec);
    let cur = 0, busy = false; if (dots[0]) dots[0].classList.add("on");
    const set = (k, e) => { fig.style.setProperty("--w", (e * 100).toFixed(1) + "%"); fig.style.setProperty("--wn", e.toFixed(3)); fig.style.setProperty("--so", k > 0 && k < 1 ? 1 : 0); };
    const next = () => {
      const r = el.getBoundingClientRect(); if (busy || document.hidden || r.bottom < 0 || r.top > innerHeight) return;
      const n = (cur + 1) % cats.length, c = cats[n], im = new Image(); busy = true;
      im.onerror = () => (busy = false);
      im.onload = () => {
        over.src = c.src; cur = n; cap.textContent = c.title; dots.forEach((d, i) => d.classList.toggle("on", i === n));
        if (word) { word.textContent = c.word; word.classList.remove("go"); void word.offsetWidth; word.classList.add("go"); }
        const t0 = performance.now();
        (function step(now) {
          const k = Math.min(1, (now - t0) / 900); set(k, 1 - Math.pow(1 - k, 3));
          if (k < 1) return requestAnimationFrame(step);
          under.onload = () => { under.onload = null; set(0, 0); over.removeAttribute("src"); busy = false; };
          under.alt = c.title; under.src = c.src;
        })(t0);
      };
      im.src = c.src;
    };
    if (!reduce) setInterval(next, 3000);
  });
}

/* ---------- price tables: one size choice applies to every table on the page ---------- */
function initPrices() {
  const tables = $$(".ptable"); if (!tables.length) return;
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".ptabs button"); if (!b) return;
    S.size = +b.dataset.size;
    tables.forEach((t) => { t.dataset.size = S.size; $$(".ptabs button", t).forEach((x) => { const on = +x.dataset.size === S.size; x.setAttribute("aria-pressed", on); x.classList.toggle("live", on); }); });
    if (hooks.relabel) hooks.relabel();
  });
}

/* ---------- print price: width x length x copies x price per square foot ---------- */
function initCalc() {
  const el = $("#calc"); if (!el) return;
  const prod = $("#calcProd"), w = $("#calcW"), h = $("#calcH"), q = $("#calcQ");
  const calc = () => {
    const area = Math.max(0, +w.value || 0) * Math.max(0, +h.value || 0) * Math.max(1, Math.round(+q.value || 1));
    $("#calcArea").textContent = (Math.round(area * 10) / 10).toLocaleString("en-US") + " sq ft";
    $("#calcTotal").textContent = money(Math.round(area * +prod.selectedOptions[0].dataset.price * 100) / 100);
  };
  el.addEventListener("input", calc); calc();
  $("#calcGo").addEventListener("click", () => { calc(); ev("calc_use"); if (hooks.quote) hooks.quote({ svc: "print", note: `${prod.selectedOptions[0].textContent}: ${w.value} x ${h.value} ft, ${Math.max(1, Math.round(+q.value || 1))} copies, ${$("#calcArea").textContent}, ${$("#calcTotal").textContent}` }); });
}

export function initScenes() {
  initReels(); initWall(); initPV(); initTunnel(); initFleetWord(); initMotion(); initLive(); initBoards(); initPrices(); initCalc(); initReveal(); }
