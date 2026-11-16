import { CONFIG } from "./config.js";
import { R, ROOT, $, $$, reduce, esc, FIN, S, DATA, hooks, fin, onScroll, fromPrice, money } from "./state.js";
import { heroSweep } from "./hero.js";

/* ---------- sheets ---------- */
let lastFocus = null, qStep = 1, photo = false, note = "";
function openSheet(id) { lastFocus = document.activeElement; const s = $(id); s.hidden = false; const f = s.querySelector("input:not([type=file]),button.btn"); if (f) setTimeout(() => f.focus(), 60); }
function closeSheets() { $$(".scrim").forEach((s) => (s.hidden = true)); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function step(n) {
  qStep = n; $$("#qForm .qstep").forEach((s) => s.classList.toggle("show", +s.dataset.step === n));
  $("#qProg").textContent = n < 4 ? `Step ${n} of 3` : "Request ready"; $("#qTitle").textContent = n < 4 ? "Book now" : "Here's what we got";
  const f = $(`#qForm .qstep[data-step="${n}"] input, #qForm .qstep[data-step="${n}"] button`); if (f) f.focus();
}
const SVC = [["wrap", "Vinyl wrap"], ["ppf", "Protection film"], ["tint", "Window tint"], ["kits", "Body kit"], ["fleet", "Fleet graphics"], ["design", "Design"], ["print", "Printing"]];
function menu(open) { const m = $("#menu"); if (!m) return; m.hidden = !open; $("[data-menu]").setAttribute("aria-expanded", open); R.classList.toggle("menu-open", open); }
function openQuote(pre = {}) {
  menu(false);
  const want = pre.svc || (S.commercial ? "fleet" : S.ch); note = pre.note || "";
  $("#qSvc").innerHTML = SVC.map((s) => `<label><input type="checkbox" id="qS_${s[0]}" value="${s[1]}"${s[0] === want ? " checked" : ""}>${s[1]}</label>`).join("");
  const com = want === "fleet" || want === "design" || want === "print", studio = want === "design" || want === "print";
  $("#qCarL").textContent = studio ? "What do you need designed or printed?" : com ? "What vehicles, and how many?" : "What are you driving?"; $("#qCar").placeholder = studio ? "Full wrap design for a Ford Transit" : com ? "3 Sprinter vans and a box truck" : "2021 Dodge Charger";
  if (pre.note && studio && !pre.car) { $("#qCar").value = pre.note; note = ""; }
  if (pre.car) $("#qCar").value = pre.car;
  $("#qFin").value = fin()[1].charAt(0) + fin()[1].slice(1).toLowerCase();
  $("#qSizeF").hidden = com; const sz = $(`#qSizeF input[value="${S.size}"]`); if (sz) sz.checked = true;
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
  const com = $("#qSizeF").hidden, size = com ? 0 : +($("#qSizeF input:checked") || { value: 0 }).value, shift = /shift/i.test($("#qFin").value);
  const starts = [["wrap", "Wrap", fromPrice("wrap", shift ? "shift" : "full", size)], ["ppf", "PPF", fromPrice("ppf", S.ppf, size)], ["tint", "Tint", fromPrice("tint", "carbon", size)]].filter(([id, , n]) => n && $("#qS_" + id).checked).map(([, name, n]) => `${name} ${money(n)}`);
  const lead = { size: com ? "" : DATA.pricing ? DATA.pricing.sizes[size] : "", from: starts, vehicle: $("#qCar").value.trim() || "From photo", services: picked(), finish: $("#qS_wrap").checked ? $("#qFin").value : null, tint: $("#qS_tint").checked ? S.tint + "%" : null, note, name, phone: $("#qPhone").value.trim(), contact: $("#qHowCall").checked ? "call" : "text", page: location.pathname };
  const rows = [["Vehicle", lead.vehicle], ["Service", lead.services.join(", ")]];
  if (lead.finish) rows.push(["Finish", lead.finish]); if (lead.tint) rows.push(["Tint", lead.tint]); if (note) rows.push(["Note", note]);
  if (lead.size) rows.push(["Size", lead.size]); if (lead.from.length) rows.push(["Starting from", lead.from.join(", ")]);
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
  hooks.quote = openQuote;
  $("#usw").innerHTML = FIN.map((f) => `<button type="button" data-f="${f[0]}" aria-pressed="false"><i style="background:${f[3]}"></i>${f[1]}</button>`).join("");
  document.addEventListener("click", (e) => {
    const q = e.target.closest("[data-quote]"); if (q) { e.preventDefault(); return openQuote(q.dataset.quote ? { svc: q.dataset.quote } : {}); }
    if (e.target.closest("[data-upload]")) return openUpload();
    if (e.target.closest("[data-close]") || e.target.classList.contains("scrim")) return closeSheets();
    if (e.target.closest("[data-menu]")) return menu($("#menu").hidden);
    if (e.target.closest("#menu a")) menu(false);
  });
  $("#usw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#usw button").forEach((x) => x.setAttribute("aria-pressed", x === b)); if (hooks.heroGo && S.ch === "wrap") hooks.heroGo({ finish: b.dataset.f }); else S.finish = b.dataset.f; });
  $("#uFile").addEventListener("change", function () { const f = this.files && this.files[0]; if (!f) return; const t = $("#dropT"); t.innerHTML = ""; const im = new Image(); im.alt = "Your car"; im.src = URL.createObjectURL(f); t.appendChild(im); photo = true; });
  $("#uGo").addEventListener("click", () => openQuote());
  $("#qForm").addEventListener("submit", submitQuote);
  $("#qForm").addEventListener("click", (e) => { if (e.target.closest("[data-next]")) next(); else if (e.target.closest("[data-back]")) step(qStep - 1); });
  $("#qSvc").addEventListener("change", finField);
  $("#qSizeF").addEventListener("change", (e) => { S.size = +e.target.value; if (hooks.relabel) hooks.relabel(); });
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const i = $("#intro"); if (i && !i.hidden) endIntro(true); else { closeSheets(); menu(false); } });
  // The floating capsule shows once the hero is gone, and steps aside for the closing one.
  const bar = $("#stickybar"), hero = $("#hero"), end = $(".final");
  if (bar) onScroll(() => bar.classList.toggle("show", (hero ? hero.getBoundingClientRect().bottom < 80 : scrollY > 160) && !(end && end.getBoundingClientRect().top < innerHeight - 140)));
  const intro = $("#intro");
  if (intro) {
    $("#iskip").addEventListener("click", () => endIntro(true)); intro.addEventListener("click", (e) => { if (e.target.id !== "iskip") endIntro(false); });
    const rp = $("#replay"); if (rp) rp.addEventListener("click", () => { scrollTo(0, 0); playIntro(); });
    let seen = false; try { seen = sessionStorage.getItem("ew3-intro") === "1"; sessionStorage.setItem("ew3-intro", "1"); } catch {}
    if (!seen && !reduce && !new URLSearchParams(location.search).get("dev")) playIntro();
  }
}
