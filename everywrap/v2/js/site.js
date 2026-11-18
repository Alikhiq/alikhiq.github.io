import { CONFIG } from "./config.js";
import { R, ROOT, $, $$, reduce, esc, FIN, S, DATA, hooks, fin, onScroll, fromPrice, money } from "./state.js";
import { heroSweep } from "./hero.js";
import { ev } from "./track.js";

/* ---------- sheets ---------- */
let lastFocus = null, qStep = 1, photo = false, note = "", pics = [];
function openSheet(id) { lastFocus = document.activeElement; const s = $(id); s.hidden = false; const f = s.querySelector("input:not([type=file]),button.btn"); if (f) setTimeout(() => f.focus(), 60); }
function closeSheets() { $$(".scrim").forEach((s) => (s.hidden = true)); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
function step(n) {
  if (n > qStep && (n === 2 || n === 3)) ev("book_step" + n);
  qStep = n; $$("#qForm .qstep").forEach((s) => s.classList.toggle("show", +s.dataset.step === n));
  $("#qProg").textContent = n < 4 ? `Step ${n} of 3` : "Request ready"; $$(".qbar i").forEach((el, k) => el.classList.toggle("on", k < n)); $("#qTitle").textContent = n < 4 ? "Book now" : "Here's what we got";
  const f = $(`#qForm .qstep[data-step="${n}"] input, #qForm .qstep[data-step="${n}"] button`); if (f) f.focus();
}
// What the booking form offers, in the same three groups as the rest of the site.
const GROUPS = [
  ["For your car", [["wrap", "Vinyl wrap", "wrap", "full"], ["ppf", "Protection film", "ppf", "partial"], ["tint", "Window tint", "tint", "carbon"], ["kits", "Body kit"]]],
  ["For your business", [["fleet", "Fleet wrap or lettering", "fleet", "lettering"]]],
  ["Design and print", [["design", "Design", "design", "setup"], ["print", "Printing", "print", "wall"]]],
];
function menu(open) { const m = $("#menu"); if (!m) return; m.hidden = !open; $("[data-menu]").setAttribute("aria-expanded", open); R.classList.toggle("menu-open", open); }
const ids = () => $$("#qSvc input:checked").map((i) => i.id.slice(3));
const picked = () => $$("#qSvc input:checked").map((i) => i.value);
function finField() { const w = $("#qS_wrap"); $("#qFinF").hidden = !(w && w.checked); }
// The second step asks for what fits the services picked: a car, a list of vehicles, or a job description.
function details() {
  const sel = ids(), studio = sel.length > 0 && sel.every((x) => x === "design" || x === "print"), com = studio || sel.includes("fleet");
  $("#qCarL").textContent = studio ? "What do you need designed or printed?" : com ? "What vehicles, and how many?" : "What are you driving?";
  $("#qCar").placeholder = studio ? "Full wrap design for a Ford Transit" : com ? "3 Sprinter vans and a box truck" : "2021 Dodge Charger";
  $("#qSizeF").hidden = com; finField();
}
function openQuote(pre = {}) {
  menu(false); ev("book_open", pre.svc || "");
  if (pre.loc) { const r = $(`#qForm input[name=qLoc][value="${pre.loc}"]`); if (r) r.checked = true; }
  const want = pre.svc || (S.commercial ? "fleet" : S.ch); note = pre.note || "";
  $("#qSvc").innerHTML = GROUPS.map(([g, items]) => `<span class="legend">${g}${g === "For your car" ? "" : "<em class='who'> · designed and quoted by Ali</em>"}</span><div class="picks" role="group" aria-label="${g}">` + items.map(([id, label, grp, row]) => { const p = grp ? fromPrice(grp, row, 0) : null; return `<label><input type="checkbox" id="qS_${id}" value="${label}"${id === want ? " checked" : ""}>${label}${p ? `<small>from ${money(p)}</small>` : ""}</label>`; }).join("") + "</div>").join("");
  if (pre.note && (want === "design" || want === "print") && !pre.car) { $("#qCar").value = pre.note; note = ""; }
  if (pre.car) $("#qCar").value = pre.car;
  $("#qFin").value = fin()[1].charAt(0) + fin()[1].slice(1).toLowerCase();
  const sz = $(`#qSizeF input[value="${S.size}"]`); if (sz) sz.checked = true;
  $("#qPhoto").hidden = !photo; $("#qNote").hidden = !note; $("#qNote").textContent = note;
  $$("#qForm .err").forEach((e) => (e.textContent = ""));
  details(); closeSheets(); openSheet("#qScrim"); step(1);
}
function next() {
  if (qStep === 1) { if (!picked().length) { $("#qErr1").textContent = "Pick at least one thing you need."; return; } $("#qErr1").textContent = ""; details(); step(2); }
  else if (qStep === 2) { if (!$("#qCar").value.trim() && !photo && !pics.length) { $("#qErr2").textContent = $("#qSizeF").hidden ? "Tell us a little about the job so we can price it." : "Add the year, make and model so we can price the right vehicle."; $("#qCar").focus(); return; } $("#qErr2").textContent = ""; step(3); }
}
async function submitQuote(e) {
  e.preventDefault();
  if (qStep < 3) return next();
  const name = $("#qName").value.trim(), digits = $("#qPhone").value.replace(/\D/g, "");
  if (!name) { $("#qErr3").textContent = "Add your name so we know who to ask for."; $("#qName").focus(); return; }
  if (digits.length < 10) { $("#qErr3").textContent = "That number looks short. Enter all 10 digits."; $("#qPhone").focus(); return; }
  const com = $("#qSizeF").hidden, size = com ? 0 : +($("#qSizeF input:checked") || { value: 0 }).value, shift = /shift/i.test($("#qFin").value);
  const starts = [["wrap", "Wrap", fromPrice("wrap", shift ? "shift" : "full", size)], ["ppf", "PPF", fromPrice("ppf", S.ppf, size)], ["tint", "Tint", fromPrice("tint", "carbon", size)]].filter(([id, , n]) => n && $("#qS_" + id).checked).map(([, name, n]) => `${name} ${money(n)}`);
  const lead = { size: com ? "" : DATA.pricing ? DATA.pricing.sizes[size] : "", from: starts, vehicle: $("#qCar").value.trim() || "From photo", photos: pics.length, services: picked(), finish: $("#qS_wrap").checked ? $("#qFin").value : null, tint: $("#qS_tint").checked ? S.tint + "%" : null, note, name, phone: $("#qPhone").value.trim(), contact: $("#qHowCall").checked ? "call" : "text", page: location.pathname, render: renderId, location: ($("#qForm input[name=qLoc]:checked") || { dataset: { name: "" } }).dataset.name };
  const rows = [["Vehicle", lead.vehicle], ["Service", lead.services.join(", ")]];
  if (lead.finish) rows.push(["Finish", lead.finish]); if (lead.tint) rows.push(["Tint", lead.tint]); if (note) rows.push(["Note", note]); if (pics.length || photoFile) rows.push(["Photos", String(pics.length + (photoFile ? 1 : 0))]);
  if (lead.size) rows.push(["Size", lead.size]); if (lead.from.length) rows.push(["Starting from", lead.from.join(", ")]);
  if (lead.location) rows.push(["Location", lead.location]);
  rows.push(["Contact", `${name}, ${lead.phone} (${lead.contact})`]);
  $("#qSum").innerHTML = rows.map((r) => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
  // The live site stores the request (and the photo) and the team sees it on their dashboard.
  const endpoint = CONFIG.leadEndpoint || (R.dataset.live ? "/api/lead" : "");
  if (endpoint) {
    const b = $("#qSend"); b.disabled = true; b.textContent = "Sending…";
    let ok = false;
    try {
      const fd = new FormData(); fd.append("data", JSON.stringify(lead)); fd.append("website", $("#qWeb") ? $("#qWeb").value : "");
      // The first photo is the main one; the rest travel as attachments (four at most in all).
      const imgs = photoFile ? [photoFile, ...pics] : [...pics], main = imgs.shift();
      if (main) fd.append("photo", main, main.name || "photo.jpg");
      [...imgs, ...(hooks.files || [])].slice(0, 4).forEach((f, n) => fd.append("file" + n, f, f.name || "file" + n + ".jpg"));
      const r = await fetch(endpoint, { method: "POST", body: fd }); ok = r.ok && (await r.json()).ok === true;
    } catch {}
    b.disabled = false; b.textContent = "Request my price";
    if (ok) { $("#qDone").textContent = `Sent. We'll ${lead.contact} you at ${lead.phone} with your price in writing.${photoFile || pics.length ? " Your photos went with it." : ""}`; pics = []; drawPics(); step(4); return; }
    ev("lead_fail");
    if (!MAIL) { $("#qErr3").textContent = "That didn't go through. Check your connection and try again."; return; }
  }
  if (MAIL) {
    // If the request could not be stored, hand it to the visitor's email app instead.
    const body = rows.map((r) => `${r[0]}: ${r[1]}`).join("\n") + `\n\nSent from ${location.origin + location.pathname}`;
    const href = `mailto:${MAIL.to}?${MAIL.cc ? "cc=" + encodeURIComponent(MAIL.cc) + "&" : ""}subject=${encodeURIComponent("New EveryWrap quote request")}&body=${encodeURIComponent(body)}`;
    $("#qDone").innerHTML = `Your email app should open with this request ready. Press send and it reaches the EveryWrap team.${photo || pics.length ? " Attach your photos to that email before you send it." : ""} <a href="${esc(href)}">Open the email again</a>`;
    step(4); location.href = href; return;
  }
  const msg = "This is a preview, so nothing was sent. On the live site this request goes to the EveryWrap team.";
  $("#qDone").textContent = msg; step(4);
}
function openUpload() { ev("photo_open"); uState(); $$("#usw button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === S.finish)); closeSheets(); openSheet("#uScrim"); }

/* ---------- see it on your car: an AI preview of the visitor's photo in the picked finish ---------- */
function uState(msg) {
  const b = $("#uShow"), name = fin()[1].toLowerCase();
  b.disabled = !photoFile || painting; b.textContent = painting ? "Painting your car…" : `Show my car in ${name}`;
  const done = !!renderId; b.classList.toggle("pri", !done); $("#uGo").classList.toggle("pri", done);
  if (msg) $("#uMsg").textContent = msg;
}
// The model takes a small picture, so the photo is shrunk in the browser before it is sent.
async function shrink(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 504 / Math.max(bmp.width, bmp.height));
  const w = Math.max(64, Math.floor((bmp.width * k) / 8) * 8), h = Math.max(64, Math.floor((bmp.height * k) / 8) * 8);
  const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h);
  return { w, h, blob: await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9)) };
}
async function paint() {
  if (!photoFile || painting) return;
  if (!R.dataset.live) return uState("Previews run on the live site. Continue and we send your car back in this finish with your quote.");
  painting = true; uState("About five seconds. We are painting your car in " + fin()[1].toLowerCase() + "."); $("#drop").classList.add("busy");
  const finish = S.finish, label = fin()[1];
  let out = null, why = "";
  try {
    const small = await shrink(photoFile);
    for (let n = 0; n < 2 && !out; n++) {
      const fd = new FormData(); fd.append("photo", small.blob, "car.jpg"); fd.append("finish", finish); fd.append("w", small.w); fd.append("h", small.h); fd.append("page", location.pathname);
      const r = await fetch("/api/render", { method: "POST", body: fd }), d = await r.json().catch(() => ({}));
      if (d.ok) out = d; else { why = d.error || "x"; if (r.status !== 502) break; }
    }
  } catch { why = why || "x"; }
  painting = false; $("#drop").classList.remove("busy");
  if (!out) return uState(why === "limit" ? "That is all the previews for today. Continue and we send your car back in this finish with your quote." : "The preview did not work this time. Try again, or continue and we send your car back in this finish with your quote.");
  renderId = out.id; renderUrl = out.image;
  $("#uOutImg").src = renderUrl; $("#uTag").textContent = label + " · AI preview"; $("#uOut").hidden = false; $("#drop").hidden = true;
  uState("A preview made by AI. The real film, the light and your car's lines will look a little different. Try another finish, or continue for your price.");
}

/* ---------- where requests go ---------- */
// The live deployment answers /lead.json with the addresses requests are emailed to. Previews have none.
let MAIL = null;
async function loadMail() {
  if (!R.dataset.live) return;
  try {
    const r = await fetch("/lead.json", { cache: "no-store" }); if (!r.ok) return;
    const d = await r.json(); if (!d || !d.to) return;
    MAIL = d;
    if (d.cc) $$('a[href^="mailto:"]').forEach((a) => { if (!a.href.includes("cc=")) a.href += (a.href.includes("?") ? "&" : "?") + "cc=" + encodeURIComponent(d.cc); });
  } catch {}
}

// Photos added in the booking form itself (up to four), shown as small thumbnails that can be removed.
function drawPics() {
  const box = $("#qThumbs"); if (!box) return;
  box.innerHTML = ""; pics.forEach((f, n) => { const d = document.createElement("span"); const im = new Image(); im.alt = "Photo " + (n + 1); im.src = URL.createObjectURL(f);
    const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove photo " + (n + 1)); x.addEventListener("click", () => { pics.splice(n, 1); drawPics(); });
    d.append(im, x); box.appendChild(d); });
  $("#qPicsT").textContent = pics.length ? (pics.length < 4 ? "+ Add another photo" : "4 photos added") : "+ Add photos of the car or the job";
  $("#qPics").disabled = pics.length >= 4;
}

/* ---------- launch intro (home only) ---------- */
let introT = [];
let photoFile = null, photoUrl = "", renderId = "", renderUrl = "", painting = false;
function closeIntro() {
  const el = $("#intro"), m = $("#imark");
  el.hidden = true; el.classList.remove("play", "out"); m.style.transform = ""; document.documentElement.classList.remove("intro-on");
}
function endIntro(fast) {
  const el = $("#intro"); introT.forEach(clearTimeout); introT = [];
  if (!el || el.hidden || el.classList.contains("out")) return;
  heroSweep();
  if (fast || reduce) return closeIntro();
  // The big mark travels to the logo in the top bar while the sheet lifts off the page.
  const m = $("#imark"), to = $(".top .logo-mark"), a = m.getBoundingClientRect(), b = to ? to.getBoundingClientRect() : null;
  if (b && b.width) m.style.transform = `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${b.width / a.width})`;
  el.classList.add("out");
  introT.push(setTimeout(closeIntro, 1060));
}
function playIntro() {
  const el = $("#intro");
  if (!el) return;
  introT.forEach(clearTimeout); introT = [];
  el.classList.remove("play", "out"); $("#imark").style.transform = ""; el.hidden = false; document.documentElement.classList.add("intro-on");
  void el.offsetWidth; el.classList.add("play");
  introT.push(setTimeout(() => endIntro(false), 2750));
}

export function initSite() {
  hooks.quote = openQuote; hooks.upload = openUpload; loadMail();
  const de = document.documentElement, topState = () => de.classList.toggle("scrolled", window.scrollY > 24);
  addEventListener("scroll", topState, { passive: true }); topState();
  $("#usw").innerHTML = FIN.map((f) => `<button type="button" data-f="${f[0]}" data-n="${f[1]}" aria-pressed="false"><i class="sph ${/gloss/i.test(f[1]) ? "gloss" : /matte/i.test(f[1]) ? "matte" : "satin"}" style="--c:${f[3]}"></i>${f[1]}</button>`).join("");
  document.addEventListener("click", (e) => {
    const q = e.target.closest("[data-quote]"); if (q) { e.preventDefault(); return openQuote({ svc: q.dataset.quote || "", note: q.dataset.note || "", loc: q.dataset.loc || "" }); }
    if (e.target.closest("[data-upload]")) return openUpload();
    if (e.target.closest("[data-close]") || e.target.classList.contains("scrim")) return closeSheets();
    if (e.target.closest("[data-menu]")) { if ($("#menu").hidden) ev("menu_open"); return menu($("#menu").hidden); }
    if (e.target.closest("#menu a")) menu(false);
  });
  $("#usw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#usw button").forEach((x) => x.setAttribute("aria-pressed", x === b)); if (hooks.heroGo && S.ch === "wrap") hooks.heroGo({ finish: b.dataset.f }); else S.finish = b.dataset.f; uState(); });
  $("#uFile").addEventListener("change", function () { const f = this.files && this.files[0]; if (!f) return; const t = $("#dropT"); t.innerHTML = ""; const im = new Image(); im.alt = "Your car"; im.src = URL.createObjectURL(f); photoUrl = im.src; t.appendChild(im); photo = true; photoFile = f; renderId = ""; renderUrl = ""; $("#uOut").hidden = true; $("#drop").hidden = false; uState(); ev("photo_added"); });
  $("#uGo").addEventListener("click", () => openQuote());
  $("#uShow").addEventListener("click", paint);
  $("#uAgain").addEventListener("click", () => { $("#uOut").hidden = true; $("#drop").hidden = false; $("#uFile").click(); });
  const hold = $("#uHold"), peek = (on) => { if (!renderUrl) return; const tag = $("#uTag"); if (on && !tag.dataset.t) tag.dataset.t = tag.textContent;
    $("#uOutImg").src = on ? photoUrl : renderUrl; tag.textContent = on ? "Your photo" : tag.dataset.t || tag.textContent; if (!on) delete tag.dataset.t; };
  hold.addEventListener("pointerdown", (e) => { e.preventDefault(); peek(true); }); ["pointerup", "pointerleave", "pointercancel"].forEach((n) => hold.addEventListener(n, () => peek(false)));
  hold.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") peek(true); }); hold.addEventListener("keyup", () => peek(false));
  $("#qForm").addEventListener("submit", submitQuote);
  $("#qPics").addEventListener("change", function () { pics = [...pics, ...[...(this.files || [])].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))].slice(0, 4); this.value = ""; drawPics(); if (pics.length) ev("photo_added", "booking"); });
  $("#qForm").addEventListener("click", (e) => { if (e.target.closest("[data-next]")) next(); else if (e.target.closest("[data-back]")) step(qStep - 1); });
  $("#qSvc").addEventListener("change", details);
  // The team card tilts in 3D: with the pointer on a computer, with the scroll on a phone.
  $$("[data-tilt]").forEach((st) => {
    const card = $(".team-card", st); if (!card) return;
    // Hover, focus or tap a person's card: the photo becomes their solo portrait. Leave it and the pair comes back.
    const sec = st.closest(".team"), solo = document.createElement("img");
    solo.className = "team-solo"; solo.alt = ""; solo.decoding = "async"; solo.width = 1200; solo.height = 1500; card.insertBefore(solo, $(".team-glare", card));
    let held = null;
    const show = (li) => { if (!li || !li.dataset.shot) return; $$(".tp", sec).forEach((x) => x.classList.toggle("on", x === li)); solo.src = li.dataset.shot; solo.alt = li.dataset.alt || ""; card.classList.add("solo"); };
    const back = () => { if (held) return; $$(".tp", sec).forEach((x) => x.classList.remove("on")); card.classList.remove("solo"); };
    $$(".tp[data-shot]", sec).forEach((li) => {
      li.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") show(li); });
      li.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") back(); });
      li.addEventListener("focus", () => show(li)); li.addEventListener("blur", back);
      li.addEventListener("click", (e) => { if (e.target.closest("a,button")) return; held = held === li ? null : li; if (held) show(li); else back(); });
    });
    if (reduce) return;
    let rx = 0, ry = 0, gx = 30, raf = 0;
    const draw = () => { raf = 0; card.style.setProperty("--rx", rx.toFixed(2) + "deg"); card.style.setProperty("--ry", ry.toFixed(2) + "deg"); card.style.setProperty("--gx", gx.toFixed(1) + "%"); };
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
    st.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const b = st.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; ry = (x - .5) * 16; rx = -(y - .5) * 11; gx = x * 100; ask(); });
    st.addEventListener("pointerleave", () => { rx = ry = 0; gx = 30; ask(); });
    if (matchMedia("(hover: none)").matches) onScroll(() => { const b = st.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return; const p = (b.top + b.height / 2) / innerHeight - .5; rx = p * 14; ry = Math.sin(p * 2.6) * 7; gx = 50 - p * 60; ask(); });
  });
  // The catalogue tabs on phones.
  document.addEventListener("click", (e) => { const b = e.target.closest(".ctabs button"); if (!b) return; const box = b.closest(".catalog"); $(".ccols", box).dataset.cat = b.dataset.cat; $$(".ctabs button", box).forEach((x) => { x.setAttribute("aria-pressed", x === b); x.classList.toggle("live", x === b); }); });
  $("#qSizeF").addEventListener("change", (e) => { S.size = +e.target.value; if (hooks.relabel) hooks.relabel(); });
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const i = $("#intro"); if (i && !i.hidden) endIntro(true); else { closeSheets(); menu(false); } });
  // The floating capsule shows once the hero is gone, and steps aside for the closing one.
  const bar = $("#stickybar"), hero = $("#hero"), end = $(".final");
  if (bar) onScroll(() => bar.classList.toggle("show", (hero ? hero.getBoundingClientRect().bottom < 80 : scrollY > 160) && !(end && end.getBoundingClientRect().top < innerHeight - 140)));
  const intro = $("#intro");
  if (intro) {
    $("#iskip").addEventListener("click", () => endIntro(true)); intro.addEventListener("click", (e) => { if (e.target.id !== "iskip") endIntro(false); });
    const rp = $("#replay"); if (rp) rp.addEventListener("click", () => { scrollTo(0, 0); playIntro(); });
    let seen = false; try { seen = sessionStorage.getItem("ew5-intro") === "1"; sessionStorage.setItem("ew5-intro", "1"); } catch {}
    if (!seen && !reduce && !new URLSearchParams(location.search).get("dev")) playIntro();
  }
}
