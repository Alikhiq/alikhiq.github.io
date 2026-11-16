import { $, $$, esc, reduce, hooks } from "./state.js";
import { ev } from "./track.js";

// Mockup studio: a vehicle side view drawn in SVG, with a wrap layout, two brand
// colours and the customer's own name on it. Everything is drawn here, no images.
const VEH = {
  van: { label: "Van", body: "M40 200V84q0-18 18-18h342q20 0 34 16l66 68q12 14 12 32v18z", glass: ["M418 84l56 64h-74V84z"], wheels: [[140, 204], [430, 204]], lines: ["M392 66v134", "M250 66v134"], text: [62, 92, 310, 96] },
  box: { label: "Box truck", body: "M40 40h362v160H40zM410 200v-90q0-14 14-14h60q12 0 20 10l34 48q8 10 8 22v24z", glass: ["M432 110h50l30 44h-80z"], wheels: [[120, 206], [310, 206], [490, 206]], lines: [], text: [58, 58, 326, 126] },
  trailer: { label: "Trailer", body: "M70 56h470v144H70z", glass: [], wheels: [[380, 206], [450, 206]], lines: ["M18 184h52"], text: [92, 74, 420, 108] },
  car: { label: "Car", body: "M28 196v-12q0-26 30-32l92-12q52-46 130-48h100q62 4 102 48l58 10q32 6 32 34v12z", glass: ["M176 140q40-34 106-36h18v36z", "M312 104h66q46 4 74 36H312z"], wheels: [[148, 196], [462, 196]], lines: ["M306 104v92"], text: [176, 146, 272, 44] },
};
const ART = {
  swoosh: (a, b) => `<path d="M0 232C170 120 300 250 600 86V260H0z" fill="${a}"/><path d="M0 214C170 104 300 232 600 66" fill="none" stroke="${b}" stroke-width="14"/>`,
  split: (a, b) => `<path d="M0 0h340L236 260H0z" fill="${a}"/><path d="M340 0h44L280 260h-44z" fill="${b}"/>`,
  band: (a, b) => `<rect y="146" width="600" height="74" fill="${a}"/><rect y="132" width="600" height="8" fill="${b}"/>`,
  stripes: (a, b) => `<path d="M330 0h90l-80 260h-90z" fill="${a}"/><path d="M440 0h60l-80 260h-60z" fill="${a}"/><path d="M520 0h34l-80 260h-34z" fill="${b}"/>`,
  fade: (a, b, id) => `<rect width="600" height="260" fill="url(#${id}f)"/><rect y="206" width="600" height="10" fill="${b}"/>`,
  blocks: (a, b) => `<circle cx="150" cy="150" r="140" fill="${a}"/><rect y="204" width="600" height="56" fill="${b}"/>`,
};
const NAMES = { swoosh: "Swoosh", split: "Split", band: "Band", stripes: "Stripes", fade: "Fade", blocks: "Blocks" };
const ON_COLOUR = ["split", "blocks", "fade"]; // layouts where the name sits on the main colour
const PAL = [["#0f1c3f", "#f2c200"], ["#111316", "#ef5b2a"], ["#c8102e", "#1a1c20"], ["#14532d", "#a3e635"], ["#1d4ed8", "#22d3ee"], ["#6d28d9", "#f472b6"], ["#0f766e", "#fb7185"], ["#2b2f36", "#d4a437"]];
const BASES = [["#ffffff", "White"], ["#c9ced6", "Silver"], ["#121316", "Black"]];
let uid = 0;
const lum = (h) => { const n = parseInt(h.slice(1), 16), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };

function draw(st, thumb = false) {
  const v = VEH[st.veh], [tx, ty, tw, th] = v.text, id = "mk" + uid++;
  const bg = ON_COLOUR.includes(st.art) ? st.a : st.base, fg = lum(bg) > 0.45 ? (ON_COLOUR.includes(st.art) ? "#101216" : st.a) : "#ffffff";
  const name = (st.name || "Your name").slice(0, 26), fs = Math.max(16, Math.min(th * 0.6, (tw / Math.max(4, name.length)) * 1.9));
  const words = thumb ? "" : `<text x="${tx}" y="${ty + th * (st.line ? 0.5 : 0.62)}" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-style="italic" font-weight="700" font-size="${fs.toFixed(1)}" fill="${fg}" stroke="${bg}" stroke-width="5" paint-order="stroke" style="text-transform:uppercase">${esc(name)}</text>` +
    (st.line ? `<text x="${tx + 2}" y="${ty + th * 0.5 + fs * 0.62}" font-family="'Instrument Sans',system-ui,sans-serif" font-weight="600" font-size="${Math.max(11, fs * 0.36).toFixed(1)}" fill="${fg}" stroke="${bg}" stroke-width="4" paint-order="stroke">${esc(st.line.slice(0, 30))}</text>` : "");
  return `<svg viewBox="0 0 600 260" role="img" aria-label="${esc(`${v.label} mockup, ${NAMES[st.art]} layout`)}"><defs><clipPath id="${id}"><path d="${v.body}"/></clipPath><linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="${st.a}"/><stop offset=".8" stop-color="${st.base}"/></linearGradient></defs>` +
    `<ellipse cx="300" cy="238" rx="270" ry="9" fill="rgba(0,0,0,.3)"/><path d="${v.body}" fill="${st.base}"/><g clip-path="url(#${id})"><g class="mk-layer">${ART[st.art](st.a, st.b, id)}${st.logo && !thumb ? `<rect x="${tx - 8}" y="${ty - 6}" width="${tw + 16}" height="${th + 12}" rx="10" fill="#fff" opacity=".94"/><image href="${st.logo}" x="${tx}" y="${ty}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid meet"/>` : words}</g></g>` +
    `<path d="${v.body}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="2.5"/>${v.lines.map((d) => `<path d="${d}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>`).join("")}` +
    `${v.glass.map((d) => `<path d="${d}" fill="#1b2230" stroke="rgba(255,255,255,.3)"/>`).join("")}${v.wheels.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="28" fill="#15171b"/><circle cx="${x}" cy="${y}" r="12" fill="#8b9098"/>`).join("")}</svg>`;
}

export function initMock() {
  $$(".mock").forEach((el) => {
    const st = { veh: "van", art: "swoosh", a: PAL[0][0], b: PAL[0][1], base: BASES[0][0], name: "", line: "" };
    const stage = $(".mk-stage", el), vehs = $(".mk-vehs", el), arts = $(".mk-arts", el), pals = $(".mk-pals", el), bases = $(".mk-bases", el);
    let touched = false, demo = 0;
    vehs.innerHTML = Object.entries(VEH).map(([k, v]) => `<button type="button" data-veh="${k}">${v.label}</button>`).join("");
    pals.innerHTML = PAL.map(([a, b], i) => `<button type="button" data-pal="${i}" aria-label="Colour pair ${i + 1}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join("");
    bases.innerHTML = BASES.map(([c, n]) => `<button type="button" data-base="${c}" aria-label="${n} vehicle" style="background:${c}"></button>`).join("");
    const render = () => {
      stage.innerHTML = draw(st);
      arts.innerHTML = Object.keys(ART).map((k) => `<button type="button" data-art="${k}" aria-label="${NAMES[k]} layout" aria-pressed="${k === st.art}">${draw({ ...st, veh: "van", art: k }, true)}<span>${NAMES[k]}</span></button>`).join("");
      $$("button", vehs).forEach((b) => { const on = b.dataset.veh === st.veh; b.setAttribute("aria-pressed", on); b.classList.toggle("live", on); });
      $$("button", pals).forEach((b) => b.setAttribute("aria-pressed", PAL[+b.dataset.pal][0] === st.a && PAL[+b.dataset.pal][1] === st.b));
      $$("button", bases).forEach((b) => b.setAttribute("aria-pressed", b.dataset.base === st.base));
    };
    const stop = () => { touched = true; clearInterval(demo); };
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      ev("mock_use", "", true);
      if (b.dataset.veh) st.veh = b.dataset.veh; else if (b.dataset.art) st.art = b.dataset.art; else if (b.dataset.pal) [st.a, st.b] = PAL[+b.dataset.pal]; else if (b.dataset.base) st.base = b.dataset.base;
      else if (b.classList.contains("mk-go")) { if (hooks.quote) hooks.quote({ svc: el.dataset.svc || "design", note: `Proof request: ${VEH[st.veh].label.toLowerCase()}${st.name ? `, name "${st.name}"` : ""}${hooks.files && hooks.files.length ? `, ${hooks.files.length} file${hooks.files.length > 1 ? "s" : ""} attached` : ""}` }); return; }
      else return;
      stop(); render();
    });
    el.addEventListener("input", (e) => { if (e.target.classList.contains("mk-name")) st.name = e.target.value; else return; stage.innerHTML = draw(st); });
    // Files travel with the proof request. A logo is shown on the vehicle at once and lends its two main colours.
    el.addEventListener("change", (e) => {
      if (!e.target.classList.contains("mk-file")) return;
      const files = [...e.target.files].slice(0, 4); hooks.files = files; ev("mock_use", "files", true);
      $(".mk-files", el).textContent = files.length ? files.map((f) => f.name).join(", ") : "";
      const pic = files.find((f) => /^image\//.test(f.type)); if (!pic) return;
      const url = URL.createObjectURL(pic), im = new Image();
      im.onload = () => {
        st.logo = url; st.own = true;
        try {
          const c = document.createElement("canvas"), n = 48; c.width = c.height = n; const x = c.getContext("2d"); x.drawImage(im, 0, 0, n, n);
          const d = x.getImageData(0, 0, n, n).data, count = {};
          for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const r = d[i] >> 5, g = d[i + 1] >> 5, b2 = d[i + 2] >> 5; if (r > 6 && g > 6 && b2 > 6) continue; const k = (r << 6) | (g << 3) | b2; count[k] = (count[k] || 0) + 1; }
          const top = Object.entries(count).sort((a, b2) => b2[1] - a[1]).map(([k]) => +k), hex = (k) => "#" + [(k >> 6) & 7, (k >> 3) & 7, k & 7].map((v) => Math.round((v * 255) / 7).toString(16).padStart(2, "0")).join("");
          if (top.length) { st.a = hex(top[0]); const far = top.find((k) => Math.abs(((k >> 6) & 7) - ((top[0] >> 6) & 7)) + Math.abs(((k >> 3) & 7) - ((top[0] >> 3) & 7)) + Math.abs((k & 7) - (top[0] & 7)) >= 4); st.b = hex(far === undefined ? top[0] ^ 0x1ff : far); }
        } catch {}
        render();
      };
      im.src = url;
    });
    render();
    // Until someone touches it, it shows itself off: a new layout and colour pair every few seconds.
    if (!reduce) demo = setInterval(() => {
      const r = el.getBoundingClientRect(); if (document.hidden || r.bottom < 0 || r.top > innerHeight) return;
      const keys = Object.keys(ART), i = (keys.indexOf(st.art) + 1) % keys.length, p = PAL[(PAL.findIndex((x) => x[0] === st.a) + 1) % PAL.length];
      st.art = keys[i]; if (!st.own) [st.a, st.b] = p; if (i === 0 && !touched) { const vk = Object.keys(VEH); st.veh = vk[(vk.indexOf(st.veh) + 1) % vk.length]; }
      render();
    }, 2600);
  });
}
