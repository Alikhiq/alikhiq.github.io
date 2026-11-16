// The EveryWrap site Worker.
// 1. Serves the static site from an R2 bucket.
// 2. Records anonymous visits and taps, and stores booking requests (D1, photos in a private bucket).
// 3. Serves the data behind the private dashboard at /desk/.
const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8", svg: "image/svg+xml", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", xml: "application/xml; charset=utf-8", txt: "text/plain; charset=utf-8", webmanifest: "application/manifest+json", ico: "image/x-icon" };
const MAIN = "everywrap.com";
const EVENTS = new Set(["view", "book_open", "book_step2", "book_step3", "lead_sent", "lead_fail", "voice_start", "voice_live", "photo_open", "photo_added", "finish_pick", "service_pick", "menu_open", "work_open", "calc_use", "mock_use", "mail_click", "social_click"]);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|scrapy|facebookexternalhit|whatsapp|pingdom|gtmetrix|scan|fetch\b/i;
const STATUSES = ["new", "contacted", "booked", "closed"];
const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { "content-type": TYPES.json, "cache-control": "no-store", "x-robots-tag": "noindex", ...extra } });
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
// The shop is in Ohio, so a "day" is an Eastern day.
const dayOf = (ts) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
const device = (ua) => (/iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "phone" : "computer");

async function sha(text) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))); }
// No cookies and no stored IP: a visitor is a one-way hash that changes every day.
async function visitorOf(request, env, day) {
  const ua = request.headers.get("user-agent") || "";
  const id = (await sha(`${request.headers.get("cf-connecting-ip") || ""}|${ua}|${day}|${env.SESSION_SECRET || ""}`)).slice(0, 16);
  return (/EWSelfTest/.test(ua) ? "test-" : "") + id;
}
function sameSite(request) {
  const o = request.headers.get("origin");
  if (!o) return true;
  try { return new URL(o).hostname === new URL(request.url).hostname; } catch { return false; }
}
async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function signedIn(request, env) {
  if (!env.SESSION_SECRET) return false;
  const m = /(?:^|;\s*)ew_desk=(\d+)\.([0-9a-f]{64})/.exec(request.headers.get("cookie") || "");
  if (!m || +m[1] < Date.now()) return false;
  return same(m[2], await hmac(env, "desk." + m[1]));
}

/* ---------- visits and taps ---------- */
async function event(request, env, ctx, url) {
  if (url.hostname !== MAIN || !env.DB || !sameSite(request)) return new Response(null, { status: 204 });
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  let b; try { b = JSON.parse((await request.text()).slice(0, 2000)); } catch { return new Response(null, { status: 204 }); }
  if (!b || !EVENTS.has(b.n)) return new Response(null, { status: 204 });
  const ts = Date.now(), day = dayOf(ts);
  ctx.waitUntil((async () => {
    try {
      await env.DB.prepare("INSERT INTO events (ts, day, name, path, visitor, device, country, ref, detail) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(ts, day, b.n, clip(b.p, 120), await visitorOf(request, env, day), device(ua), clip(request.cf && request.cf.country, 2), clip(b.r, 80), clip(b.d, 80)).run();
    } catch (e) { console.error("event", e.message); }
  })());
  return new Response(null, { status: 204 });
}

/* ---------- booking requests ---------- */
async function notify(env, lead, origin) {
  // Email alerts switch on once a Resend key, a sender and the recipients are set on the Worker.
  if (!env.RESEND_KEY || !env.NOTIFY_FROM || !env.NOTIFY_TO) return;
  const row = (k, v) => (v ? `<tr><td style="padding:6px 14px 6px 0;color:#6b6b6b;vertical-align:top">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>` : "");
  const digits = lead.phone.replace(/\D/g, "");
  const html = `<div style="font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:560px">
<h2 style="margin:0 0 4px">New booking request</h2><p style="margin:0 0 16px;color:#6b6b6b">From the EveryWrap website</p>
<table style="border-collapse:collapse">${row("Name", lead.name)}${row("Phone", lead.phone + " (prefers a " + lead.contact + ")")}${row("Vehicle", lead.vehicle)}${row("Wants", lead.services)}${row("Finish", lead.finish)}${row("Tint", lead.tint)}${row("Size", lead.size)}${row("Starting from", lead.starts)}${row("Location", lead.location)}${row("Note", lead.note)}${row("Photo", lead.photo ? "Yes, see it in the dashboard" : "")}</table>
<p style="margin:20px 0"><a href="tel:+1${digits.slice(-10)}" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin-right:8px">Call</a><a href="sms:+1${digits.slice(-10)}" style="background:#ef5b2a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin-right:8px">Text</a><a href="${origin}/desk/#r=${lead.id}" style="padding:10px 0;color:#111">Open in the dashboard</a></p></div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: env.NOTIFY_FROM, to: env.NOTIFY_TO.split(",").map((s) => s.trim()).filter(Boolean), subject: `New request: ${lead.name} · ${lead.services || "EveryWrap"}`, html }) });
    if (!r.ok) console.error("notify", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error("notify", e.message); }
}
async function lead(request, env, ctx, url) {
  if (!env.DB) return json({ ok: false, error: "not set up" }, 503);
  if (!sameSite(request)) return json({ ok: false }, 403);
  const ua = request.headers.get("user-agent") || "";
  let form; try { form = await request.formData(); } catch { return json({ ok: false, error: "bad form" }, 400); }
  if (form.get("website")) return json({ ok: true }); // a field people never see; only scripts fill it in
  let d; try { d = JSON.parse(String(form.get("data") || "{}").slice(0, 6000)); } catch { return json({ ok: false, error: "bad data" }, 400); }
  const name = clip(d.name, 80), phone = clip(d.phone, 30);
  if (!name || phone.replace(/\D/g, "").length < 10) return json({ ok: false, error: "name and phone needed" }, 400);
  const ts = Date.now(), day = dayOf(ts), visitor = await visitorOf(request, env, day);
  const n = await env.DB.prepare("SELECT COUNT(*) c FROM leads WHERE visitor = ? AND day = ?").bind(visitor, day).first();
  if (n && n.c >= 6) return json({ ok: false, error: "too many requests today" }, 429);
  const id = ts.toString(36) + hex(crypto.getRandomValues(new Uint8Array(4)));
  let photo = "";
  const file = form.get("photo");
  if (file && typeof file === "object" && file.size > 0 && file.size <= 12 * 1024 * 1024 && PHOTO_TYPES[file.type] && env.PRIVATE) {
    photo = `leads/${id}.${PHOTO_TYPES[file.type]}`;
    await env.PRIVATE.put(photo, file.stream(), { httpMetadata: { contentType: file.type } });
  }
  // Up to four files with a proof request: logos and artwork. They are only ever handed back as downloads.
  const files = [];
  for (let n = 0; n < 4 && env.PRIVATE; n++) {
    const f = form.get("file" + n);
    if (!f || typeof f !== "object" || !f.size || f.size > 15 * 1024 * 1024) continue;
    const fname = clip(f.name, 80).replace(/[^\w. ()-]+/g, "_") || "file" + n;
    if (!/\.(png|jpe?g|webp|gif|svg|pdf|ai|eps|heic|tiff?)$/i.test(fname)) continue;
    const key = `leads/${id}-f${n}`;
    await env.PRIVATE.put(key, f.stream(), { httpMetadata: { contentType: "application/octet-stream" } });
    files.push({ k: key, name: fname, size: f.size });
  }
  const L = { id, name, phone, contact: d.contact === "call" ? "call" : "text", vehicle: clip(d.vehicle, 120), services: clip((d.services || []).join(", "), 200), finish: clip(d.finish, 60), tint: clip(d.tint, 20),
    size: clip(d.size, 40), starts: clip((d.from || []).join(", "), 200), note: clip(d.note, 500), location: clip(d.location, 60), page: clip(d.page, 120), photo, render: /^[a-z0-9]{8,24}$/.test(String(d.render || "")) ? `renders/${d.render}.jpg` : "" };
  await env.DB.prepare("INSERT INTO leads (id, ts, day, status, name, phone, contact, vehicle, services, finish, tint, size, starts, note, location, page, photo, render, files, visitor, device, country, city) VALUES (?,?,?,'new',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, ts, day, L.name, L.phone, L.contact, L.vehicle, L.services, L.finish, L.tint, L.size, L.starts, L.note, L.location, L.page, photo, L.render, files.length ? JSON.stringify(files) : "", visitor, device(ua), clip(request.cf && request.cf.country, 2), clip(request.cf && request.cf.city, 60)).run();
  ctx.waitUntil(Promise.all([
    env.DB.prepare("INSERT INTO events (ts, day, name, path, visitor, device, country, ref, detail) VALUES (?,?,?,?,?,?,?,?,?)").bind(ts, day, "lead_sent", L.page, visitor, device(ua), clip(request.cf && request.cf.country, 2), "", L.services.slice(0, 80)).run().catch(() => {}),
    notify(env, L, url.origin),
  ]));
  return json({ ok: true, id });
}

/* ---------- "see it on your car": an AI preview of the visitor's photo in a finish ---------- */
const RENDER_MODEL = "@cf/black-forest-labs/flux-2-klein-9b";
const RENDER_PER_VISITOR = 4, RENDER_PER_DAY = 150;
const FINISH = {
  "satin-black": "satin black vinyl wrap, a smooth low-sheen black with soft highlights",
  "gloss-black": "gloss black vinyl wrap, deep black with crisp mirror-like reflections",
  "satin-grey": "satin grey vinyl wrap, a flat mid grey with a soft sheen",
  "satin-red": "satin red vinyl wrap, a rich red with a smooth low-sheen finish",
  "trident-blue": "KPMF Gloss Trident Blue vinyl wrap, a deep royal blue with crisp mirror-like reflections",
  "sterling-blue": "KPMF Matte Sterling Blue vinyl wrap, a pale metallic grey-blue with a flat matte surface",
  "interstellar-pink": "KPMF Gloss Interstellar Pink vinyl wrap, a vivid pink with crisp mirror-like reflections",
  "dynamic-lime": "KPMF Ultra Gloss Dynamic Lime vinyl wrap, a bright lime green with crisp mirror-like reflections",
  "vector-green": "KPMF Absolute Matte Vector Green vinyl wrap, a muted army green that is completely flat matte",
  "java-brown": "KPMF Matte Java Brown vinyl wrap, a dark coffee brown with a flat matte surface",
  "dune": "KPMF Matte Dune Metallic vinyl wrap, a sandy beige metallic with a flat matte surface",
  "red-black": "KPMF Gloss Red/Black Iridescent vinyl wrap, a deep blood red that falls away to black at the edges, high gloss",
  "color-shift": "iridescent colour-shift (chameleon) vinyl wrap: one continuous pearlescent paint whose hue drifts smoothly between deep purple, blue and teal with the light, with no separate colour blocks or hard edges",
};
async function render(request, env, ctx, url) {
  if (!env.AI || !env.DB) return json({ ok: false, error: "off" }, 503);
  const ua = request.headers.get("user-agent") || "";
  if (!sameSite(request) || !ua || BOT.test(ua)) return json({ ok: false }, 403);
  let form; try { form = await request.formData(); } catch { return json({ ok: false, error: "bad form" }, 400); }
  const file = form.get("photo"), finish = String(form.get("finish") || "");
  if (!FINISH[finish] || !file || typeof file !== "object" || !file.size || file.size > 600 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json({ ok: false, error: "bad input" }, 400);
  const ts = Date.now(), day = dayOf(ts), visitor = await visitorOf(request, env, day);
  const [mine, all] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) c FROM renders WHERE visitor = ? AND day = ?").bind(visitor, day).first(),
    env.DB.prepare("SELECT COUNT(*) c FROM renders WHERE day = ?").bind(day).first(),
  ]);
  if ((mine && mine.c >= RENDER_PER_VISITOR) || (all && all.c >= RENDER_PER_DAY)) return json({ ok: false, error: "limit" }, 429);
  // The photo arrives already shrunk to fit the model's input size. The output keeps its shape.
  const w = Math.min(512, Math.max(64, +form.get("w") || 512)), h = Math.min(512, Math.max(64, +form.get("h") || 384)), k = 1024 / Math.max(w, h);
  const prompt = `Repaint this exact car in ${FINISH[finish]}. Change only the painted body panels. Keep the same car, the same camera angle, wheels, tyres, windows, lights, grille, badges, background and lighting. Photorealistic photograph.`;
  const photo = await file.arrayBuffer();
  let out = null, last = "";
  // The model answers in about two seconds but now and then fails at once with an internal error, so try a few times.
  for (let n = 0; n < 4 && !(out && out.image); n++) {
    if (n) await new Promise((r) => setTimeout(r, 250 * n));
    const f = new FormData();
    f.append("prompt", prompt);
    f.append("input_image_0", new Blob([photo], { type: file.type }), "car.jpg");
    f.append("width", String(Math.round((w * k) / 16) * 16)); f.append("height", String(Math.round((h * k) / 16) * 16));
    const fr = new Response(f);
    try { out = await env.AI.run(RENDER_MODEL, { multipart: { body: fr.body, contentType: fr.headers.get("content-type") } }); }
    catch (e) { last = String(e && e.message).slice(0, 300); console.error("render", n, last); }
  }
  if (!out || !out.image) return json({ ok: false, error: "model", detail: /EWSelfTest/.test(ua) ? last : undefined }, 502);
  const b64 = out && out.image;
  const id = ts.toString(36) + hex(crypto.getRandomValues(new Uint8Array(4)));
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  ctx.waitUntil(Promise.all([
    env.PRIVATE ? env.PRIVATE.put(`renders/${id}.jpg`, bytes, { httpMetadata: { contentType: "image/jpeg" } }) : null,
    env.DB.prepare("INSERT INTO renders (id, ts, day, visitor, finish) VALUES (?,?,?,?,?)").bind(id, ts, day, visitor, finish).run(),
    env.DB.prepare("INSERT INTO events (ts, day, name, path, visitor, device, country, ref, detail) VALUES (?,?,?,?,?,?,?,?,?)").bind(ts, day, "render", clip(form.get("page"), 120), visitor, device(ua), clip(request.cf && request.cf.country, 2), "", finish).run().catch(() => {}),
  ]));
  return json({ ok: true, id, image: "data:image/jpeg;base64," + b64 });
}

/* ---------- the dashboard's data ---------- */
async function desk(request, env, url) {
  const path = url.pathname;
  if (path === "/api/desk/open" && request.method === "POST") {
    if (!sameSite(request) || !env.DESK_KEY || !env.SESSION_SECRET) return json({ ok: false }, 403);
    let b; try { b = await request.json(); } catch { b = {}; }
    if (!same(await sha("k|" + String(b.key || "")), await sha("k|" + env.DESK_KEY))) return json({ ok: false }, 401);
    const exp = Date.now() + 90 * 864e5;
    return json({ ok: true }, 200, { "set-cookie": `ew_desk=${exp}.${await hmac(env, "desk." + exp)}; Path=/; Max-Age=${90 * 86400}; HttpOnly; Secure; SameSite=Strict` });
  }
  if (path === "/api/desk/close" && request.method === "POST") return json({ ok: true }, 200, { "set-cookie": "ew_desk=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict" });
  if (!(await signedIn(request, env))) return json({ ok: false, error: "sign in" }, 401);
  const DB = env.DB;

  if (path === "/api/desk/summary") {
    const days = Math.min(90, Math.max(1, +url.searchParams.get("days") || 7));
    const now = Date.now(), list = [];
    for (let i = days - 1; i >= 0; i--) list.push(dayOf(now - i * 864e5));
    const since = list[0], prev = dayOf(now - (2 * days - 1) * 864e5);
    const q = (sql, ...a) => DB.prepare(sql).bind(...a).all().then((r) => r.results);
    const [perDay, names, pages, refs, devices, finishes, leadDays, leads, before, beforeLeads, fresh] = await Promise.all([
      q("SELECT day, COUNT(DISTINCT visitor) v, SUM(name = 'view') pv FROM events WHERE day >= ? GROUP BY day", since),
      q("SELECT name, COUNT(*) c, COUNT(DISTINCT visitor) p FROM events WHERE day >= ? GROUP BY name", since),
      q("SELECT path, COUNT(*) c, COUNT(DISTINCT visitor) p FROM events WHERE day >= ? AND name = 'view' GROUP BY path ORDER BY p DESC, c DESC LIMIT 9", since),
      q("SELECT ref, COUNT(DISTINCT visitor) p FROM events WHERE day >= ? AND name = 'view' GROUP BY ref ORDER BY p DESC LIMIT 6", since),
      q("SELECT device, COUNT(DISTINCT visitor) p FROM events WHERE day >= ? GROUP BY device ORDER BY p DESC", since),
      q("SELECT detail, COUNT(*) c FROM events WHERE day >= ? AND name = 'finish_pick' AND detail != '' GROUP BY detail ORDER BY c DESC LIMIT 5", since),
      q("SELECT day, COUNT(*) c FROM leads WHERE day >= ? GROUP BY day", since),
      q("SELECT id, ts, status, name, phone, contact, vehicle, services, finish, tint, size, starts, note, location, page, photo, render, files, device, city FROM leads ORDER BY ts DESC LIMIT 200"),
      q("SELECT COUNT(DISTINCT visitor) v FROM events WHERE day >= ? AND day < ?", prev, since),
      q("SELECT COUNT(*) c FROM leads WHERE day >= ? AND day < ?", prev, since),
      q("SELECT COUNT(*) c FROM leads WHERE status = 'new'"),
    ]);
    const by = Object.fromEntries(names.map((r) => [r.name, r]));
    const pd = Object.fromEntries(perDay.map((r) => [r.day, r])), ld = Object.fromEntries(leadDays.map((r) => [r.day, r.c]));
    const people = (n) => (by[n] ? by[n].p : 0), times = (n) => (by[n] ? by[n].c : 0);
    const requests = leadDays.reduce((a, r) => a + r.c, 0);
    return json({ ok: true, days, since,
      totals: { visitors: perDay.reduce((a, r) => a + r.v, 0), views: perDay.reduce((a, r) => a + r.pv, 0), requests, fresh: fresh[0] ? fresh[0].c : 0, before: { visitors: before[0] ? before[0].v : 0, requests: beforeLeads[0] ? beforeLeads[0].c : 0 } },
      series: list.map((d) => ({ day: d, visitors: pd[d] ? pd[d].v : 0, views: pd[d] ? pd[d].pv : 0, requests: ld[d] || 0 })),
      funnel: [["Visited the site", perDay.reduce((a, r) => a + r.v, 0)], ["Opened Book now", people("book_open")], ["Filled in the vehicle", people("book_step3")], ["Sent a request", requests]],
      taps: [["Opened Book now", people("book_open"), times("book_open")], ["Started a voice chat", people("voice_start"), times("voice_start")], ["Opened the photo panel", people("photo_open"), times("photo_open")], ["Previewed their car in a finish", people("render"), times("render")], ["Tried a finish on the car", people("finish_pick"), times("finish_pick")],
        ["Switched service", people("service_pick"), times("service_pick")], ["Opened a job photo", people("work_open"), times("work_open")], ["Used the print calculator", people("calc_use"), times("calc_use")], ["Used the mockup studio", people("mock_use"), times("mock_use")], ["Tapped an email link", people("mail_click"), times("mail_click")], ["Tapped Instagram", people("social_click"), times("social_click")]],
      pages, refs, devices, finishes, leads });
  }
  if (path === "/api/desk/lead" && request.method === "POST") {
    if (!sameSite(request)) return json({ ok: false }, 403);
    let b; try { b = await request.json(); } catch { b = {}; }
    if (!STATUSES.includes(b.status) || !b.id) return json({ ok: false }, 400);
    await DB.prepare("UPDATE leads SET status = ? WHERE id = ?").bind(b.status, String(b.id)).run();
    return json({ ok: true });
  }
  if (path === "/api/desk/file") {
    const row = await DB.prepare("SELECT files FROM leads WHERE id = ?").bind(url.searchParams.get("id") || "").first();
    let list = []; try { list = JSON.parse((row && row.files) || "[]"); } catch {}
    const f = list[+url.searchParams.get("n") || 0], obj = f && env.PRIVATE ? await env.PRIVATE.get(f.k) : null;
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, { headers: { "content-type": "application/octet-stream", "content-disposition": `attachment; filename="${f.name.replace(/"/g, "")}"`, "x-content-type-options": "nosniff", "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
  }
  if (path === "/api/desk/photo") {
    const row = await DB.prepare("SELECT photo, render FROM leads WHERE id = ?").bind(url.searchParams.get("id") || "").first();
    const key = row && (url.searchParams.get("kind") === "render" ? row.render : row.photo);
    const obj = key && env.PRIVATE ? await env.PRIVATE.get(key) : null;
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, { headers: { "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "image/jpeg", "cache-control": "private, max-age=3600", "x-robots-tag": "noindex" } });
  }
  // Finished videos, kept in the private bucket: videos/index.json lists them, and each has a 4K master, a 1080 copy and a poster.
  if (path === "/api/desk/videos") {
    const obj = env.PRIVATE ? await env.PRIVATE.get("videos/index.json") : null;
    let list = { videos: [] }; try { if (obj) list = await obj.json(); } catch {}
    return json({ ok: true, made: list.made || "", videos: list.videos || [] });
  }
  if (path === "/api/desk/video") {
    const id = url.searchParams.get("id") || "", q = url.searchParams.get("q") || "1080";
    if (!/^[a-z0-9-]{1,80}$/.test(id) || !["4k", "1080", "poster"].includes(q) || !env.PRIVATE) return new Response("Not found", { status: 404 });
    const key = q === "poster" ? `videos/poster/${id}.jpg` : `videos/${q}/${id}.mp4`, range = request.headers.has("range");
    let obj;
    try { obj = await env.PRIVATE.get(key, { range: range ? request.headers : undefined }); } catch { obj = await env.PRIVATE.get(key); }
    if (!obj) return new Response("Not found", { status: 404 });
    const h = new Headers({ "content-type": q === "poster" ? "image/jpeg" : "video/mp4", "accept-ranges": "bytes", "cache-control": "private, max-age=3600", "x-robots-tag": "noindex", "x-content-type-options": "nosniff" });
    if (url.searchParams.get("save")) h.set("content-disposition", `attachment; filename="everywrap-${id}${q === "4k" ? "-4k" : ""}.mp4"`);
    if (range && obj.range && obj.range.length !== undefined && obj.range.length < obj.size) {
      const start = obj.range.offset || 0;
      h.set("content-range", `bytes ${start}-${start + obj.range.length - 1}/${obj.size}`); h.set("content-length", String(obj.range.length));
      return new Response(obj.body, { status: 206, headers: h });
    }
    h.set("content-length", String(obj.size));
    return new Response(obj.body, { headers: h });
  }
  return json({ ok: false }, 404);
}

/* ---------- the static site ---------- */
async function site(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  // Only the main domain is for search engines; any other address this Worker answers on is a copy.
  const copy = url.hostname !== MAIN;
  // Where the booking form falls back to email. The addresses are Worker settings, not files in the repo.
  if (url.pathname === "/lead.json") {
    if (!env.LEAD_TO) return new Response("{}", { status: 404, headers: { "content-type": TYPES.json } });
    return json({ to: env.LEAD_TO, cc: env.LEAD_CC || "" });
  }
  let key;
  try { key = decodeURIComponent(url.pathname).replace(/^\/+/, ""); } catch { return new Response("Bad request", { status: 400 }); }
  // Pages load scripts and styles as /v/<build id>/...; the id only keeps old cached copies out of a new build.
  const versioned = /^v\/[a-z0-9]+\//.test(key);
  if (versioned) key = key.replace(/^v\/[a-z0-9]+\//, "");
  if (key === "" || key.endsWith("/")) key += "index.html";
  else if (!/\.[a-z0-9]+$/i.test(key)) { url.pathname += "/"; return Response.redirect(url.toString(), 301); }

  const range = request.headers.has("range");
  let obj;
  try { obj = await env.SITE.get(key, { onlyIf: request.headers, range: range ? request.headers : undefined }); }
  catch { obj = await env.SITE.get(key); }
  if (!obj) return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Not found | EveryWrap</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#f3ede2;font:16px system-ui'><p>That page is not here. <a style='color:#ef5b2a' href='/'>Go to the home page</a></p>", { status: 404, headers: { "content-type": TYPES.html, "x-robots-tag": "noindex" } });

  const ext = key.split(".").pop().toLowerCase();
  const h = new Headers();
  h.set("content-type", TYPES[ext] || "application/octet-stream");
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  const media = ["webp", "jpg", "jpeg", "png", "mp4", "ico"].includes(ext);
  h.set("cache-control", versioned ? "public, max-age=31536000, immutable" : media ? "public, max-age=86400" : "public, max-age=0, must-revalidate");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  if (copy || key.startsWith("desk/")) h.set("x-robots-tag", "noindex, nofollow");
  if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
  if (range && obj.range && obj.range.length !== undefined && obj.range.length < obj.size) {
    const start = obj.range.offset || 0;
    h.set("content-range", `bytes ${start}-${start + obj.range.length - 1}/${obj.size}`);
    h.set("content-length", String(obj.range.length));
    return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(request.method === "HEAD" ? null : obj.body, { headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === "www.everywrap.com") { url.hostname = MAIN; return Response.redirect(url.toString(), 301); }
    try {
      if (url.pathname === "/api/event" && request.method === "POST") return await event(request, env, ctx, url);
      if (url.pathname === "/api/lead" && request.method === "POST") return await lead(request, env, ctx, url);
      if (url.pathname === "/api/render" && request.method === "POST") return await render(request, env, ctx, url);
      if (url.pathname.startsWith("/api/desk/")) return await desk(request, env, url);
      if (url.pathname.startsWith("/api/")) return json({ ok: false }, 404);
    } catch (e) {
      console.error("api", url.pathname, e && e.message);
      return json({ ok: false, error: "server" }, 500);
    }
    return site(request, env, url);
  },
};
