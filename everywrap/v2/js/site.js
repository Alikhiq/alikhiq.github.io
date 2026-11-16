import { CONFIG } from "./config.js";
import { R, ROOT, $, $$, reduce, esc, FIN, S, DATA, hooks, fin, onScroll } from "./state.js";
import { heroSweep } from "./hero.js";

/* ---------- the short reply line above the input (scripted rules in this build) ---------- */
function say(html) { const el = $("#say"); if (!el) return; el.hidden = !html; el.innerHTML = html || ""; R.classList.toggle("has-say", !!html); if (html) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); } }
const MAKES = "acura audi bmw buick cadillac chevy chevrolet chrysler dodge ford gmc honda hyundai infiniti jeep kia lexus lincoln mazda mercedes nissan porsche ram subaru tesla toyota volkswagen vw volvo charger challenger mustang camaro corvette durango sprinter transit".split(" ");
function findCar(t) {
  const y = t.match(/\b(19[6-9]\d|20[0-3]\d)\b/), words = t.split(/\s+/), i = words.findIndex((w) => MAKES.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
  if (i < 0) return y ? y[0] : "";
  const tail = words.slice(i, i + 3).filter((w) => !/^(wrap|tint|ppf|price|in|with|and|for|satin|gloss|black|red|grey|gray|kit)$/i.test(w)).join(" ").replace(/[.,!?]/g, "");
  return ((y ? y[0] + " " : "") + tail.replace(/\b\w/g, (c) => c.toUpperCase())).trim();
}
function ask(text) {
  const t = text.trim(); if (!t) return;
  const l = t.toLowerCase(), car = findCar(t), patch = {}, bits = [];
  if (/(fleet|\bvans?\b|box truck|food truck|\bbus(es)?\b|boat|business|company|logo|trailer)/.test(l) && !S.commercial) { openQuote({ car: t, svc: "fleet" }); return say("That sounds like fleet work. The price form is open with your note in it."); }
  if (/tint|window|limo/.test(l)) { patch.ch = "tint"; const n = l.match(/\b(70|35|20|5)\s?%/); if (n) patch.tint = +n[1]; bits.push("window tint" + (n ? " " + n[1] + "%" : "")); }
  else if (/ppf|protect|clear bra|rock chip/.test(l)) { patch.ch = "ppf"; if (/full body/.test(l)) patch.ppf = "full"; else if (/partial/.test(l)) patch.ppf = "partial"; bits.push("protection film"); }
  else if (/kit|widebody|splitter|spoiler|diffuser/.test(l)) { patch.ch = "kits"; bits.push("body kit"); }
  const f = /gloss black/.test(l) ? "gloss-black" : /grey|gray/.test(l) ? "satin-grey" : /\bred\b/.test(l) ? "satin-red" : /shift|chameleon|purple/.test(l) ? "color-shift" : /black|satin/.test(l) ? "satin-black" : "";
  if (!patch.ch && (f || /wrap|vinyl|colou?r change/.test(l))) { patch.ch = "wrap"; if (f) patch.finish = f; bits.push((f ? FIN.find((x) => x[0] === f)[1].toLowerCase() + " " : "") + "wrap"); }
  const body = /porsche|911|coupe|corvette|sports car/.test(l) ? "coupe" : /charger|sedan|challenger/.test(l) ? "sedan" : "";
  const vid = body && DATA.manifest && Object.keys(DATA.manifest.vehicles).find((k) => DATA.manifest.vehicles[k].body === body);
  if (vid) patch.vehicle = vid;
  if (Object.keys(patch).length) { if (hooks.heroGo && !S.commercial) hooks.heroGo(patch); else Object.assign(S, patch); }
  if (/legal|law/.test(l)) return say("In Ohio the front side windows must let in at least 50% of light. The rear side and back glass can go darker. We confirm it for your car before we cut film.");
  if (/how long|last|years/.test(l)) return say("That depends on the film and how the car is kept. Tell me the car and you get a real answer with the quote.");
  if (/price|cost|how much|\$/.test(l) && !car) { openQuote({}); return say("Every car is priced on its own. The form is open: three short steps and you get a written quote."); }
  if (car || /(quote|callback|call me|book)/.test(l)) { openQuote({ car: car || t }); say(`Got it${car ? ": <b>" + esc(car) + "</b>" : ""}${bits.length ? ", " + bits.join(" and ") : ""}. The price form is open with that filled in.`); }
  else if (bits.length) say(`Showing ${bits.join(" and ")}. Tell me the car and I'll get it priced.`);
  else say(S.commercial ? "Tell me the vehicles and how many, for example “3 Sprinter vans and a food truck”." : "I can show wraps, protection film, tint or body kits. Try “2021 Charger satin black wrap”.");
}

/* ---------- sheets ---------- */
let lastFocus = null, qStep = 1, photo = false, note = "";
function openSheet(id) { lastFocus = document.activeElement; const s = $(id); s.hidden = false; const f = s.querySelector("input:not([type=file]),button.btn"); if (f) setTimeout(() => f.focus(), 60); }
function closeSheets() { $$(".scrim").forEach((s) => (s.hidden = true)); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function step(n) {
  qStep = n; $$("#qForm .qstep").forEach((s) => s.classList.toggle("show", +s.dataset.step === n));
  $("#qProg").textContent = n < 4 ? `Step ${n} of 3` : "Request ready"; $("#qTitle").textContent = n < 4 ? "Get my price" : "Here's what we got";
  const f = $(`#qForm .qstep[data-step="${n}"] input, #qForm .qstep[data-step="${n}"] button`); if (f) f.focus();
}
const SVC = [["wrap", "Vinyl wrap"], ["ppf", "Protection film"], ["tint", "Window tint"], ["kits", "Body kit"], ["fleet", "Fleet graphics"]];
function openQuote(pre = {}) {
  const want = pre.svc || (S.commercial ? "fleet" : S.ch); note = pre.note || "";
  $("#qSvc").innerHTML = SVC.map((s) => `<label><input type="checkbox" id="qS_${s[0]}" value="${s[1]}"${s[0] === want ? " checked" : ""}>${s[1]}</label>`).join("");
  const com = want === "fleet";
  $("#qCarL").textContent = com ? "What vehicles, and how many?" : "What are you driving?"; $("#qCar").placeholder = com ? "3 Sprinter vans and a box truck" : "2021 Dodge Charger";
  if (pre.car) $("#qCar").value = pre.car;
  $("#qFin").value = fin()[1].charAt(0) + fin()[1].slice(1).toLowerCase();
  $("#qPhoto").hidden = !photo; $("#qNote").hidden = !note; $("#qNote").textContent = note;
  $$("#qForm .err").forEach((e) => (e.textContent = ""));
  finField(); closeSheets(); openSheet("#qScrim"); step(1);
}
function finField() { const w = $("#qS_wrap"); $("#qFinF").hidden = !(w && w.checked); }
const picked = () => $$("#qSvc input:checked").map((i) => i.value);
function next() {
  if (qStep === 1) { if (!$("#qCar").value.trim() && !photo) { $("#qErr1").textContent = "Add the year, make and model so we can price the right vehicle."; $("#qCar").focus(); return; } $("#qErr1").textContent = ""; step(2); }
  else if (qStep === 2) { if (!picked().length) { $("#qErr2").textContent = "Pick at least one service."; return; } $("#qErr2").textContent = ""; step(3); }
}
async function submitQuote(e) {
  e.preventDefault();
  if (qStep < 3) return next();
  const name = $("#qName").value.trim(), digits = $("#qPhone").value.replace(/\D/g, "");
  if (!name) { $("#qErr3").textContent = "Add your name so we know who to ask for."; $("#qName").focus(); return; }
  if (digits.length < 10) { $("#qErr3").textContent = "That number looks short. Enter all 10 digits."; $("#qPhone").focus(); return; }
  const lead = { vehicle: $("#qCar").value.trim() || "From photo", services: picked(), finish: $("#qS_wrap").checked ? $("#qFin").value : null, tint: $("#qS_tint").checked ? S.tint + "%" : null, note, name, phone: $("#qPhone").value.trim(), contact: $("#qHowCall").checked ? "call" : "text", page: location.pathname };
  const rows = [["Vehicle", lead.vehicle], ["Service", lead.services.join(", ")]];
  if (lead.finish) rows.push(["Finish", lead.finish]); if (lead.tint) rows.push(["Tint", lead.tint]); if (note) rows.push(["Note", note]);
  rows.push(["Contact", `${name}, ${lead.phone} (${lead.contact})`]);
  $("#qSum").innerHTML = rows.map((r) => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
  let msg = "This is a preview, so nothing was sent. On the live site this request goes to the EveryWrap team.";
  if (CONFIG.leadEndpoint) {
    const b = $("#qSend"); b.disabled = true; b.textContent = "Sending…";
    try { const r = await fetch(CONFIG.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }); msg = r.ok ? `Sent. We'll ${lead.contact} you at ${lead.phone}.` : "That didn't go through. Please try again in a minute."; }
    catch { msg = "That didn't go through. Check your connection and try again."; }
    b.disabled = false; b.textContent = "Request my price";
  }
  $("#qDone").textContent = msg; step(4);
}
function openUpload() { $$("#usw button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === S.finish)); closeSheets(); openSheet("#uScrim"); }

/* ---------- launch intro (home only) ---------- */
let introT = [];
function endIntro(fast) {
  const el = $("#intro"); introT.forEach(clearTimeout); introT = [];
  if (!el || el.hidden) return;
  if (fast || reduce) { el.hidden = true; el.classList.remove("out", "boom"); }
  else { el.classList.add("boom", "out"); setTimeout(() => { el.hidden = true; el.classList.remove("out", "boom"); }, 650); }
  heroSweep();
}
function playIntro() {
  const el = $("#intro"), card = $("#icard"), bg = $("#ibg"), reel = DATA.work.filter((j) => !j.tags.includes("commercial") && !j.tags.includes("shop") && j.h >= j.w).slice(0, 10);
  if (!el || reel.length < 4) return;
  el.hidden = false; el.classList.remove("out", "boom"); card.innerHTML = "";
  const imgs = reel.map((j) => { const i = new Image(); i.src = ROOT + CONFIG.assets + j.src; i.alt = ""; card.appendChild(i); return i; });
  const beat = 215, start = 320;
  imgs.forEach((im, n) => introT.push(setTimeout(() => { if (!im.complete || !im.naturalWidth) return; im.style.zIndex = n + 1; im.classList.add("hit"); bg.style.backgroundImage = `url("${im.src}")`; }, start + n * beat)));
  introT.push(setTimeout(() => endIntro(false), start + imgs.length * beat + 260));
}

export function initSite() {
  hooks.say = say; hooks.quote = openQuote;
  $("#usw").innerHTML = FIN.map((f) => `<button type="button" data-f="${f[0]}" aria-pressed="false"><i style="background:${f[3]}"></i>${f[1]}</button>`).join("");
  document.addEventListener("click", (e) => {
    const q = e.target.closest("[data-quote]"); if (q) { e.preventDefault(); return openQuote(q.dataset.quote ? { svc: q.dataset.quote } : {}); }
    if (e.target.closest("[data-upload]")) return openUpload();
    if (e.target.closest("[data-close]") || e.target.classList.contains("scrim")) return closeSheets();
    if (e.target.closest("[data-menu]")) { const m = $("#menu"); m.hidden = !m.hidden; $("[data-menu]").setAttribute("aria-expanded", !m.hidden); return; }
    if (e.target.closest("#menu a")) $("#menu").hidden = true;
  });
  $$("form.ask").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); const i = $("input", f); ask(i.value); i.value = ""; }));
  $("#usw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#usw button").forEach((x) => x.setAttribute("aria-pressed", x === b)); if (hooks.heroGo && S.ch === "wrap") hooks.heroGo({ finish: b.dataset.f }); else S.finish = b.dataset.f; });
  $("#uFile").addEventListener("change", function () { const f = this.files && this.files[0]; if (!f) return; const t = $("#dropT"); t.innerHTML = ""; const im = new Image(); im.alt = "Your car"; im.src = URL.createObjectURL(f); t.appendChild(im); photo = true; });
  $("#uGo").addEventListener("click", () => openQuote());
  $("#qForm").addEventListener("submit", submitQuote);
  $("#qForm").addEventListener("click", (e) => { if (e.target.closest("[data-next]")) next(); else if (e.target.closest("[data-back]")) step(qStep - 1); });
  $("#qSvc").addEventListener("change", finField);
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const i = $("#intro"); if (i && !i.hidden) endIntro(true); else { closeSheets(); const m = $("#menu"); if (m) m.hidden = true; } });
  const bar = $("#stickybar"), hero = $("#hero");
  if (bar && hero) onScroll(() => bar.classList.toggle("show", hero.getBoundingClientRect().bottom < 80));
  const intro = $("#intro");
  if (intro) {
    $("#iskip").addEventListener("click", () => endIntro(true)); intro.addEventListener("click", (e) => { if (e.target.id !== "iskip") endIntro(false); });
    const rp = $("#replay"); if (rp) rp.addEventListener("click", () => { scrollTo(0, 0); playIntro(); });
    let seen = false; try { seen = sessionStorage.getItem("ew3-intro") === "1"; sessionStorage.setItem("ew3-intro", "1"); } catch {}
    if (!seen && !reduce && !new URLSearchParams(location.search).get("dev")) playIntro();
  }
}
