import { Stage, loadImage } from "./engine.js";
import { CONFIG } from "./config.js";

const R = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 860px)");
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- content ---------- */
const FIN = [
  ["satin-black", "Satin Black", "Satin black.", "radial-gradient(circle at 32% 28%,#4a4a4c,#151516 62%)"],
  ["gloss-black", "Gloss Black", "Gloss black.", "radial-gradient(circle at 30% 24%,#fff 0 5%,#2a2a2c 14%,#050506 60%)"],
  ["satin-grey", "Satin Grey", "Satin grey.", "radial-gradient(circle at 32% 28%,#b9bdc2,#7d8389 70%)"],
  ["satin-red", "Satin Red", "Satin red.", "radial-gradient(circle at 32% 28%,#e0484d,#7c1118 70%)"],
  ["color-shift", "Color Shift", "Color shift.", "conic-gradient(from 210deg,#6d3bd6,#1fb8b0,#2b6fe0,#7a3fd1,#6d3bd6)"],
];
const CHAPTERS = [
  { id: "wrap", label: "Wrap", sub: "Any car, wrapped by hand in Columbus, Ohio." },
  { id: "ppf", label: "Protect", head: ["Protection film.", "Done right."], sub: "Clear film over the panels that take the hits. The lit area is what gets covered." },
  { id: "tint", label: "Tint", head: ["Window tint.", "Done right."], sub: "Pick a shade. The number is how much light gets through." },
  { id: "kits", label: "Kits", head: ["Body kits.", "Done right."], sub: "Tell us what you drive. We find the kit that fits, fit it and wrap it." },
  { id: "fleet", label: "Fleet" },
];
const PPF = [["partial", "Partial front"], ["front", "Full front"], ["full", "Full body"]];
const TINT = [70, 35, 20, 5];
const FLEET = [
  { id: "vans", label: "Vans", photos: [["sprinter-print", "Sprinter van", "Full custom print"], ["crv-print", "Honda CR-V", "Full print for a pet-care business"]] },
  { id: "buses", label: "Buses", photos: [["library-bus", "Queens Public Library bus", "Full custom print"]] },
  { id: "food", label: "Food trucks", photos: [["food-truck", "Food truck", "Colour change and custom design"]] },
  { id: "boats", label: "Boats", photos: [["boat-print", "Wake boat", "Custom printed livery"]] },
];
const WORK = [["hellcat-satin-black", "Charger Hellcat", "Satin black, blue stripes", "p"], ["tesla-3-satin-black", "Tesla Model 3", "Satin black", "p"], ["porsche-aqua", "Porsche 911 Turbo", "Satin aqua", "p"], ["bmw-autumn-fire", "BMW 3 Series", "Matte Autumn Fire", "p"], ["mustang-satin-pink", "Ford Mustang", "Satin pink", "p"], ["tesla-y-satin-charcoal", "Tesla Model Y", "Satin dark grey", "p"], ["corvette-color-shift", "Corvette C7", "Color-shift chrome", "p"], ["durango-satin-black", "Dodge Durango", "Satin black, red stripes", "p"], ["s580-satin-red", "Mercedes S580", "Satin red", "p"], ["corvette-matte-black", "Corvette Z06", "Matte black, tricolor stripe", "p"], ["range-rover-copper", "Range Rover Sport", "Burnt copper", "p"], ["trackhawk-sky-blue", "Jeep Trackhawk", "Gloss sky blue", "p"], ["bmw-satin-copper", "BMW 550i", "Satin copper", "p"], ["tesla-y-pearl-white", "Tesla Model Y", "Satin pearl white", "p"], ["hellcat-lime", "Challenger Hellcat", "Gloss lime green", "p"], ["install-mirror", "Mirror cap", "Mid-install, trimmed by hand", "p"],
  ["sprinter-print", "Sprinter van", "Full custom print", "c"], ["library-bus", "Queens Public Library bus", "Full custom print", "c"], ["crv-print", "Honda CR-V", "Full print for a pet-care business", "c"], ["lexus-lettering", "Lexus sedan", "Matte black with printed lettering", "c"], ["boat-print", "Wake boat", "Custom printed livery", "c"], ["ryker-print", "Can-Am Ryker", "Custom printed graphics", "c"]];
const REEL = ["hellcat-satin-black", "porsche-aqua", "bmw-autumn-fire", "tesla-3-satin-black", "mustang-satin-pink", "corvette-color-shift", "durango-satin-black", "s580-satin-red", "corvette-matte-black", "tesla-y-satin-charcoal"];

/* ---------- state ---------- */
const S = { mode: "personal", ch: "wrap", finish: "satin-black", ppf: "front", tint: 20, vehicle: "sedan", fleet: "vans" };
let M = null;           // manifest
let stage = null;
let dragging = false;

const fin = () => FIN.find((f) => f[0] === S.finish);
const veh = () => M.vehicles[S.vehicle];
const factoryOf = (v) => (v.sets["factory-white"] ? "factory-white" : v.sets.factory ? "factory" : null);
function supports(v, ch) {
  if (ch === "wrap") return !!factoryOf(v) && FIN.every((f) => v.sets[f[0]]);
  if (ch === "ppf") return !!(v.sets["gloss-black"] && v.masks && v.masks["ppf-front"]);
  if (ch === "tint") return !!(v.sets["clear-glass"] && v.sets["satin-black"]);
  if (ch === "kits") return !!(v.sets.kit && v.sets["satin-black"]);
  return true;
}
function scene() {
  const v = veh();
  if (S.ch === "ppf") return { before: "gloss-black", after: null, seam: false, mask: v.masks["ppf-" + S.ppf] };
  if (S.ch === "tint") return { before: "clear-glass", after: "satin-black", seam: true, alpha: { 70: 0.22, 35: 0.52, 20: 0.8, 5: 1 }[S.tint] };
  if (S.ch === "kits") return { before: "satin-black", after: "kit", seam: true };
  return { before: factoryOf(v), after: S.finish, seam: true };
}

/* ---------- rendering ---------- */
function press(list, fn) { list.forEach((b) => b.setAttribute("aria-pressed", fn(b) ? "true" : "false")); }

function renderRail() {
  const items = S.mode === "commercial" ? FLEET : CHAPTERS, cur = S.mode === "commercial" ? S.fleet : S.ch;
  $("#rail").innerHTML = items.map((c, i) => `<li class="${c.id === cur ? "on" : ""}"><button type="button" data-id="${c.id}" aria-current="${c.id === cur}"><b>0${i + 1}</b>${c.label}</button></li>`).join("");
}
function renderCopy() {
  let head, sub;
  if (S.mode === "commercial") { head = ["Your van is", "a billboard."]; sub = "Fleet graphics, printed and installed in Columbus, Ohio."; }
  else { const c = CHAPTERS.find((x) => x.id === S.ch); head = c.head || [fin()[2], "Done right."]; sub = c.sub; }
  const h1 = $("#h1"), html = head.map((t) => `<span>${esc(t)}</span>`).join(" ");
  if (h1.innerHTML !== html) { h1.innerHTML = html; h1.classList.remove("swap"); void h1.offsetWidth; h1.classList.add("swap"); }
  $("#sub").textContent = sub;
  $("#ask").placeholder = S.mode === "commercial" ? "Tell me your fleet…" : "Tell me your car…";
  $("#askLabel").textContent = S.mode === "commercial" ? "Tell me about your fleet" : "Tell me your car and what you want";
  $("#cap").textContent = S.mode === "commercial" ? "Real EveryWrap jobs" : "Placeholder render";
}
function renderOpts() {
  const o = $("#opts");
  if (S.mode === "commercial" || S.ch === "kits") o.innerHTML = "";
  else if (S.ch === "wrap") o.innerHTML = FIN.map((f) => `<button type="button" class="dot" data-f="${f[0]}" aria-label="${f[1]}" aria-pressed="${f[0] === S.finish}" style="background:${f[3]}"></button>`).join("") + `<span class="optname">${fin()[1]}</span>`;
  else if (S.ch === "ppf") o.innerHTML = PPF.map((p) => `<button type="button" class="chip" data-p="${p[0]}" aria-pressed="${p[0] === S.ppf}">${p[1]}</button>`).join("");
  else if (S.ch === "tint") o.innerHTML = TINT.map((t) => `<button type="button" class="chip" data-t="${t}" aria-pressed="${t === S.tint}">${t}%</button>`).join("");
  const b = $("#bodies"), list = S.mode === "commercial" ? [] : Object.entries(M.vehicles).filter(([, v]) => supports(v, S.ch));
  b.innerHTML = list.length > 1 ? `<span>Show on</span>` + list.map(([id, v]) => `<button type="button" data-v="${id}" aria-pressed="${id === S.vehicle}">${esc(v.body.charAt(0).toUpperCase() + v.body.slice(1))}</button>`).join("") : "";
}
function measure() {
  const cz = $("#carzone").getBoundingClientRect(), cv = $("#stage").getBoundingClientRect();
  if (!cv.width || !cv.height) return;
  const wide = !phone.matches;
  stage.setRegion({ x0: (cz.left - cv.left) / cv.width, x1: (cz.right - cv.left) / cv.width, y0: (cz.top - cv.top) / cv.height + (wide ? 0.02 : 0), y1: (cz.bottom - cv.top) / cv.height });
}
function syncSeam() {
  const cz = $("#carzone").getBoundingClientRect(), cv = $("#stage").getBoundingClientRect(), b = stage.box;
  if (!b || !cz.width) return;
  const x0 = (b.x0 * cv.width + cv.left - cz.left) / cz.width, x1 = (b.x1 * cv.width + cv.left - cz.left) / cz.width, cy = (((b.y0 + b.y1) / 2) * cv.height + cv.top - cz.top) / cz.height;
  const ctl = $("#seamctl");
  ctl.style.setProperty("--seam-x0", `calc(${(x0 * 100).toFixed(2)}% - 22px)`);
  ctl.style.setProperty("--seam-x1", `calc(${(x1 * 100).toFixed(2)}% + 22px)`);
  ctl.style.setProperty("--seam-y", (cy * 100).toFixed(2) + "%");
  if (!dragging) { const left = stage.noseLeft() ? stage.seam : 1 - stage.seam; $("#seam").value = Math.round(left * 1000); }
}
async function paint(sweep = true) {
  if (S.mode === "commercial") { $("#seamctl").hidden = true; $("#fleet").hidden = false; return; }
  $("#fleet").hidden = true;
  if (!supports(veh(), S.ch)) S.vehicle = Object.keys(M.vehicles).find((k) => supports(M.vehicles[k], S.ch)) || S.vehicle;
  const sc = scene();
  $("#seamctl").hidden = !sc.seam;
  $("#seamLabel").textContent = { wrap: "Drag the seam: factory paint on one side, " + fin()[1] + " on the other", tint: "Drag the seam: clear glass on one side, tinted on the other", kits: "Drag the seam: stock on one side, with the kit on the other" }[S.ch] || "";
  measure();
  await stage.show(veh(), sc.before, sc.after, { sweep, afterAlpha: sc.alpha ?? 1, seam: sc.seam, maskSrc: sc.mask || null });
  $("#carzone").classList.toggle("spin", stage.frameCount() > 1);
}
function setTheme() {
  R.dataset.mode = S.mode;
  $("#mPer").setAttribute("aria-pressed", S.mode === "personal");
  $("#mCom").setAttribute("aria-pressed", S.mode === "commercial");
  stage.bg = "#000000"; stage.invalidate();
}
function render(sweep = true) { setTheme(); renderRail(); renderCopy(); renderOpts(); renderWork(); paint(sweep); if (S.mode === "commercial") fleetShow(false); }
function go(patch, sweep = true) {
  const wasCom = S.mode === "commercial";
  if (patch.vehicle && !M.vehicles[patch.vehicle]) delete patch.vehicle;
  Object.assign(S, patch);
  if (S.ch === "fleet") { S.mode = "commercial"; S.ch = "wrap"; }
  render(sweep);
  if (S.mode === "commercial" && (!wasCom || patch.fleet)) fleetShow(wasCom);
  hint();
}

/* ---------- commercial panels ---------- */
let fleetTok = 0;
function fleetShow(wipe) {
  const i = FLEET.findIndex((f) => f.id === S.fleet), cur = FLEET[i].photos[0], n1 = FLEET[(i + 1) % FLEET.length].photos[0], n2 = FLEET[(i + 2) % FLEET.length].photos[0];
  const src = (p) => CONFIG.assets + "work/" + p[0] + ".jpg", p1 = $("#p1"), over = $(".over", p1), under = $(".under", p1), tok = ++fleetTok;
  $("#p2 img").src = src(n1); $("#p2 img").alt = n1[1]; $("#p3 img").src = src(n2); $("#p3 img").alt = n2[1];
  $("#pcap").innerHTML = `${esc(cur[1])}<span>${esc(cur[2])}</span>`; $("#cap").textContent = "Real job · " + cur[1];
  if (!wipe || reduce || !under.getAttribute("src")) { under.src = src(cur); under.alt = cur[1]; over.src = src(cur); over.alt = ""; p1.style.setProperty("--w", "100%"); p1.style.setProperty("--so", 0); return; }
  loadImage(src(cur)).then(() => {
    if (tok !== fleetTok) return;
    over.src = src(cur); const t0 = performance.now();
    (function step(t) {
      if (tok !== fleetTok) return;
      const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3);
      p1.style.setProperty("--w", (e * 100).toFixed(1) + "%"); p1.style.setProperty("--wn", e.toFixed(3)); p1.style.setProperty("--so", k < 1 ? 1 : 0);
      if (k < 1) requestAnimationFrame(step); else { under.src = src(cur); under.alt = cur[1]; }
    })(t0);
  });
}

/* ---------- assistant (scripted rules in this build) ---------- */
function say(html) { const el = $("#say"); el.hidden = !html; el.innerHTML = html || ""; R.classList.toggle("has-say", !!html); if (html) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); } }
function hint() {
  if (S.mode === "personal" && S.ch === "tint" && S.tint < 50) say(`${S.tint}% lets ${S.tint}% of light through. In Ohio the front side windows must let in at least 50%, so this shade is for the rear.`);
  else if (S.mode === "personal" && S.ch === "ppf") say({ partial: "Partial front covers the bumper and the leading edge of the hood and fenders.", front: "Full front covers the bumper, the full hood, both fenders and the mirrors.", full: "Full body protects every painted panel." }[S.ppf]);
  else say("");
}
const MAKES = "acura audi bmw buick cadillac chevy chevrolet chrysler dodge ford gmc honda hyundai infiniti jeep kia lexus lincoln mazda mercedes nissan porsche ram subaru tesla toyota volkswagen vw volvo charger challenger mustang camaro corvette durango sprinter transit".split(" ");
function findCar(t) {
  const y = t.match(/\b(19[6-9]\d|20[0-3]\d)\b/), words = t.split(/\s+/);
  const i = words.findIndex((w) => MAKES.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
  if (i < 0) return y ? y[0] : "";
  const tail = words.slice(i, i + 3).filter((w) => !/^(wrap|tint|ppf|price|in|with|and|for|satin|gloss|black|red|grey|gray|kit)$/i.test(w)).join(" ").replace(/[.,!?]/g, "");
  return ((y ? y[0] + " " : "") + tail.replace(/\b\w/g, (c) => c.toUpperCase())).trim();
}
function ask(text) {
  const t = text.trim(); if (!t) return;
  const l = t.toLowerCase(), car = findCar(t), patch = {}, bits = [];
  const com = /(fleet|\bvans?\b|box truck|food truck|\bbus(es)?\b|boat|business|company|logo|trailer)/.test(l);
  if (com) { patch.mode = "commercial"; patch.fleet = /food/.test(l) ? "food" : /bus/.test(l) ? "buses" : /boat/.test(l) ? "boats" : "vans"; bits.push("fleet graphics"); }
  else {
    if (/tint|window|limo/.test(l)) { patch.mode = "personal"; patch.ch = "tint"; const n = l.match(/\b(70|35|20|5)\s?%/); if (n) patch.tint = +n[1]; bits.push("window tint" + (n ? " " + n[1] + "%" : "")); }
    else if (/ppf|protect|clear bra|rock chip/.test(l)) { patch.mode = "personal"; patch.ch = "ppf"; if (/full body/.test(l)) patch.ppf = "full"; else if (/partial/.test(l)) patch.ppf = "partial"; bits.push("paint protection film"); }
    else if (/kit|widebody|splitter|spoiler|diffuser/.test(l)) { patch.mode = "personal"; patch.ch = "kits"; bits.push("body kit"); }
    const f = /gloss black/.test(l) ? "gloss-black" : /grey|gray/.test(l) ? "satin-grey" : /\bred\b/.test(l) ? "satin-red" : /shift|chameleon|purple/.test(l) ? "color-shift" : /black|satin/.test(l) ? "satin-black" : "";
    if (!patch.ch && (f || /wrap|vinyl|colou?r change/.test(l))) { patch.mode = "personal"; patch.ch = "wrap"; if (f) patch.finish = f; bits.push((f ? FIN.find((x) => x[0] === f)[1].toLowerCase() + " " : "") + "wrap"); }
    const body = /porsche|911|coupe|corvette|sports car/.test(l) ? "coupe" : /charger|sedan|challenger/.test(l) ? "sedan" : "";
    const vid = body && Object.keys(M.vehicles).find((k) => M.vehicles[k].body === body);
    if (vid && supports(M.vehicles[vid], patch.ch || S.ch)) patch.vehicle = vid;
  }
  if (Object.keys(patch).length) go(patch);
  if (/legal|law/.test(l)) return say("In Ohio the front side windows must let in at least 50% of light. The rear side and back glass can go darker. We confirm it for your car before we cut film.");
  if (/how long|last|years/.test(l)) return say("That depends on the film and how the car is kept. Tell me the car and you get a real answer with the quote.");
  if (car || /(price|quote|cost|how much|\$|callback|call me|book)/.test(l)) { openQuote({ car }); say(`Got it${car ? ": <b>" + esc(car) + "</b>" : ""}${bits.length ? ", " + bits.join(" and ") : ""}. The price form is open with that filled in.`); }
  else if (bits.length) say(`Showing ${bits.join(" and ")}. Tell me the car and I'll price it.`);
  else say("I can show wraps, protection film, tint, body kits or fleet graphics. Try “2021 Charger satin black wrap price”.");
}

/* ---------- gallery ---------- */
function renderWork() {
  const el = $("#work"), k = S.mode === "commercial" ? "c" : "p"; if (el.dataset.set === k) return; el.dataset.set = k;
  el.innerHTML = WORK.filter((w) => w[3] === k).map((w) => `<figure class="card"><img loading="lazy" src="${CONFIG.assets}work/${w[0]}.jpg" alt="${esc(w[1])}, ${esc(w[2].toLowerCase())}"><figcaption>${esc(w[1])}<span>${esc(w[2])}</span></figcaption></figure>`).join("");
  el.scrollLeft = 0;
  $("#workh").textContent = k === "c" ? "Work that works." : "Proof in the finish.";
  $("#workp").textContent = k === "c" ? "Real commercial jobs from the EveryWrap archive. Not renders." : "Real EveryWrap jobs from our own Instagram. Not renders.";
}

/* ---------- sheets ---------- */
let lastFocus = null, qStep = 1, photo = false;
function openSheet(id) { lastFocus = document.activeElement; const s = $(id); s.hidden = false; const f = s.querySelector("input:not([type=file]),button.btn"); if (f) setTimeout(() => f.focus(), 60); }
function closeSheets() { $$(".scrim").forEach((s) => (s.hidden = true)); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function step(n) {
  qStep = n; $$("#qForm .qstep").forEach((s) => s.classList.toggle("show", +s.dataset.step === n));
  $("#qProg").textContent = n < 4 ? `Step ${n} of 3` : "Request ready"; $("#qTitle").textContent = n < 4 ? "Get my price" : "Here's what we got";
  const f = $(`#qForm .qstep[data-step="${n}"] input, #qForm .qstep[data-step="${n}"] button`); if (f) f.focus();
}
const SVC = [["wrap", "Vinyl wrap"], ["ppf", "Protection film"], ["tint", "Window tint"], ["kits", "Body kit"], ["fleet", "Fleet graphics"]];
function openQuote(pre = {}) {
  const com = S.mode === "commercial";
  $("#qSvc").innerHTML = SVC.map((s) => `<label><input type="checkbox" id="qS_${s[0]}" value="${s[1]}"${(com ? s[0] === "fleet" : s[0] === S.ch) ? " checked" : ""}>${s[1]}</label>`).join("");
  $("#qCarL").textContent = com ? "What vehicles, and how many?" : "What are you driving?"; $("#qCar").placeholder = com ? "3 Sprinter vans and a box truck" : "2021 Dodge Charger";
  if (pre.car) $("#qCar").value = pre.car;
  $("#qFin").value = fin()[1].charAt(0) + fin()[1].slice(1).toLowerCase();
  $("#qPhoto").hidden = !photo; $$("#qForm .err").forEach((e) => (e.textContent = ""));
  finField(); closeSheets(); openSheet("#qScrim"); step(1);
}
function finField() { const w = $("#qS_wrap"); $("#qFinF").hidden = !(w && w.checked); }
const picked = () => $$("#qSvc input:checked").map((i) => i.value);
function next() {
  if (qStep === 1) { if (!$("#qCar").value.trim() && !photo) { $("#qErr1").textContent = "Add the year, make and model so we can price the right car."; $("#qCar").focus(); return; } $("#qErr1").textContent = ""; step(2); }
  else if (qStep === 2) { if (!picked().length) { $("#qErr2").textContent = "Pick at least one service."; return; } $("#qErr2").textContent = ""; step(3); }
}
async function submitQuote(e) {
  e.preventDefault();
  if (qStep < 3) return next();
  const name = $("#qName").value.trim(), digits = $("#qPhone").value.replace(/\D/g, "");
  if (!name) { $("#qErr3").textContent = "Add your name so we know who to ask for."; $("#qName").focus(); return; }
  if (digits.length < 10) { $("#qErr3").textContent = "That number looks short. Enter all 10 digits."; $("#qPhone").focus(); return; }
  const lead = { vehicle: $("#qCar").value.trim() || "From photo", services: picked(), finish: $("#qS_wrap").checked ? $("#qFin").value : null, tint: $("#qS_tint").checked ? S.tint + "%" : null, name, phone: $("#qPhone").value.trim(), contact: $("#qHowCall").checked ? "call" : "text", mode: S.mode, page: location.href };
  const rows = [["Vehicle", lead.vehicle], ["Service", lead.services.join(", ")]];
  if (lead.finish) rows.push(["Finish", lead.finish]); if (lead.tint) rows.push(["Tint", lead.tint]);
  rows.push(["Contact", `${name}, ${lead.phone} (${lead.contact})`]);
  $("#qSum").innerHTML = rows.map((r) => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
  let msg = "This is a preview, so nothing was sent. On the live site this request goes to the EveryWrap team.";
  if (CONFIG.leadEndpoint) {
    const b = $("#qSend"); b.disabled = true; b.textContent = "Sending…";
    try { const r = await fetch(CONFIG.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }); msg = r.ok ? `Sent. We'll ${lead.contact} you at ${lead.phone}.` : "That didn't go through. Please try again in a minute, or call us."; }
    catch { msg = "That didn't go through. Check your connection and try again."; }
    b.disabled = false; b.textContent = "Request my price";
  }
  $("#qDone").textContent = msg; step(4);
}
function openUpload() { press($$("#usw button"), (b) => b.dataset.f === S.finish); closeSheets(); openSheet("#uScrim"); }

/* ---------- intro ---------- */
let introT = [];
function endIntro(fast) {
  const el = $("#intro"); introT.forEach(clearTimeout); introT = [];
  if (el.hidden) return;
  if (fast || reduce) { el.hidden = true; el.classList.remove("out", "boom"); }
  else { el.classList.add("boom", "out"); setTimeout(() => { el.hidden = true; el.classList.remove("out", "boom"); }, 650); }
  if (stage && S.mode === "personal") { stage.seam = 0; stage.setSeam(0.5, true); }
}
function playIntro() {
  const el = $("#intro"), card = $("#icard"), bg = $("#ibg"); el.hidden = false; el.classList.remove("out", "boom"); card.innerHTML = "";
  const imgs = REEL.map((n) => { const i = new Image(); i.src = CONFIG.assets + "work/" + n + ".jpg"; i.alt = ""; card.appendChild(i); return i; });
  const beat = 215, start = 320;
  imgs.forEach((im, n) => introT.push(setTimeout(() => { if (!im.complete || !im.naturalWidth) return; im.style.zIndex = n + 1; im.classList.add("hit"); bg.style.backgroundImage = `url("${im.src}")`; }, start + n * beat)));
  introT.push(setTimeout(() => endIntro(false), start + imgs.length * beat + 260));
}

/* ---------- boot ---------- */
async function boot() {
  M = window.__EW_MANIFEST || (await (await fetch(CONFIG.assets + "manifest.json")).json());
  const dev = new URLSearchParams(location.search).get("dev");
  if (dev === "spin") { // development check: fake a multi-angle set from the finishes
    const c = M.vehicles.sedan, order = ["factory-white", "satin-grey", "satin-red", "color-shift"].map((k) => c.sets[k].frames[0]);
    for (const k of Object.keys(c.sets)) c.sets[k].frames = [c.sets[k].frames[0], ...order];
  }
  stage = new Stage($("#stage"), { base: CONFIG.assets, reduceMotion: reduce });
  stage.onDraw = syncSeam;
  window.__ew = { S, stage, go };

  $("#usw").innerHTML = FIN.map((f) => `<button type="button" data-f="${f[0]}" aria-pressed="false"><i style="background:${f[3]}"></i>${f[1]}</button>`).join("");
  $("#rail").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.mode === "commercial" ? go({ fleet: b.dataset.id }) : go({ ch: b.dataset.id }); });
  const stepRail = (d) => { const items = S.mode === "commercial" ? FLEET : CHAPTERS, cur = S.mode === "commercial" ? S.fleet : S.ch, i = (items.findIndex((c) => c.id === cur) + d + items.length) % items.length; S.mode === "commercial" ? go({ fleet: items[i].id }) : go({ ch: items[i].id }); };
  $("#railPrev").addEventListener("click", () => stepRail(-1)); $("#railNext").addEventListener("click", () => stepRail(1));
  $("#opts").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.f) go({ finish: b.dataset.f }); else if (b.dataset.p) go({ ppf: b.dataset.p }, false); else if (b.dataset.t) go({ tint: +b.dataset.t }, false); });
  $("#bodies").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go({ vehicle: b.dataset.v }); });
  $("#mPer").addEventListener("click", () => { if (S.mode !== "personal") go({ mode: "personal" }); });
  $("#mCom").addEventListener("click", () => { if (S.mode !== "commercial") go({ mode: "commercial" }); });

  const seam = $("#seam");
  seam.addEventListener("input", () => { const left = seam.value / 1000; stage.setSeam(stage.noseLeft() ? left : 1 - left); });
  seam.addEventListener("pointerdown", () => (dragging = true)); addEventListener("pointerup", () => (dragging = false));

  const cz = $("#carzone"); let spin = null;
  cz.addEventListener("pointerdown", (e) => { if (e.target === seam || stage.frameCount() < 2) return; spin = { x: e.clientX, a: stage.angle }; cz.setPointerCapture(e.pointerId); });
  cz.addEventListener("pointermove", (e) => { if (!spin) return; const n = stage.frameCount(), w = cz.getBoundingClientRect().width; stage.angle = (((spin.a - ((e.clientX - spin.x) / w) * n) % n) + n) % n; stage.invalidate(); });
  cz.addEventListener("pointerup", () => (spin = null)); cz.addEventListener("pointercancel", () => (spin = null));
  cz.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") stage.rotate(-1); if (e.key === "ArrowRight") stage.rotate(1); });
  if (!reduce && matchMedia("(pointer:fine)").matches) $("#hero").addEventListener("pointermove", (e) => { const r = $("#stage").getBoundingClientRect(); stage.setParallax(0.5 - (e.clientX - r.left) / r.width, 0.5 - (e.clientY - r.top) / r.height); });

  $("#bQuote").addEventListener("click", () => openQuote());
  $("#askCam").addEventListener("click", openUpload);
  $("#askf").addEventListener("submit", (e) => { e.preventDefault(); const i = $("#ask"); ask(i.value); i.value = ""; });
  $("#usw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.finish = b.dataset.f; press($$("#usw button"), (x) => x === b); if (S.mode === "personal" && S.ch === "wrap") render(); });
  $("#uFile").addEventListener("change", function () { const f = this.files && this.files[0]; if (!f) return; const t = $("#dropT"); t.innerHTML = ""; const im = new Image(); im.alt = "Your car"; im.src = URL.createObjectURL(f); t.appendChild(im); photo = true; });
  $("#uGo").addEventListener("click", () => openQuote());
  $("#qForm").addEventListener("submit", submitQuote);
  $("#qForm").addEventListener("click", (e) => { if (e.target.closest("[data-next]")) next(); else if (e.target.closest("[data-back]")) step(qStep - 1); });
  $("#qSvc").addEventListener("change", finField);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.classList.contains("scrim")) closeSheets(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#intro").hidden) endIntro(true); else closeSheets(); } });
  $("#iskip").addEventListener("click", () => endIntro(true));
  $("#intro").addEventListener("click", (e) => { if (e.target.id !== "iskip") endIntro(false); });
  $("#replay").addEventListener("click", () => { scrollTo(0, 0); playIntro(); });
  addEventListener("resize", () => { measure(); stage.resize(); });
  if (phone.addEventListener) phone.addEventListener("change", () => { measure(); stage.invalidate(); });

  render(false);
  // warm the rest of the sets once the first frame is up
  setTimeout(() => { for (const v of Object.values(M.vehicles)) for (const s of Object.values(v.sets)) s.frames.forEach((f) => loadImage(CONFIG.assets + f)); }, 1200);
  let seen = false; try { seen = sessionStorage.getItem("ew2-intro") === "1"; sessionStorage.setItem("ew2-intro", "1"); } catch {}
  if (seen || reduce || dev) $("#intro").hidden = true; else playIntro();
}
boot();
