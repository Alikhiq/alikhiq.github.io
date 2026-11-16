import { CONFIG } from "./config.js";
import { loadImage } from "./engine.js";
import { ROOT, $, $$, reduce, esc, DATA } from "./state.js";

// Commercial hero: real job photos as upright light boxes, with a seam wipe between them.
let cats = [], cur = 0, tok = 0;
const src = (j) => ROOT + CONFIG.assets + j.src;
function show(wipe) {
  const job = cats[cur].job, n1 = cats[(cur + 1) % cats.length].job, n2 = cats[(cur + 2) % cats.length].job;
  const p1 = $("#p1"), over = $(".over", p1), under = $(".under", p1), t = ++tok;
  $("#p2 img").src = src(n1); $("#p2 img").alt = n1.title; $("#p3 img").src = src(n2); $("#p3 img").alt = n2.title;
  $("#pcap").innerHTML = `${esc(job.title)}<span>${esc(cats[cur].note)}</span>`; $("#cap").textContent = "Real job · " + job.title;
  $$("#rail li").forEach((li, i) => { li.classList.toggle("on", i === cur); li.firstElementChild.setAttribute("aria-current", i === cur); });
  if (!wipe || reduce || !under.getAttribute("src")) { under.src = src(job); under.alt = job.title; over.src = src(job); p1.style.setProperty("--w", "100%"); p1.style.setProperty("--so", 0); return; }
  loadImage(src(job)).then(() => {
    if (t !== tok) return;
    over.src = src(job); const t0 = performance.now();
    (function step(now) {
      if (t !== tok) return;
      const k = Math.min(1, (now - t0) / 800), e = 1 - Math.pow(1 - k, 3);
      p1.style.setProperty("--w", (e * 100).toFixed(1) + "%"); p1.style.setProperty("--wn", e.toFixed(3)); p1.style.setProperty("--so", k < 1 ? 1 : 0);
      if (k < 1) requestAnimationFrame(step); else { under.src = src(job); under.alt = job.title; }
    })(t0);
  });
}
export function initFleet() {
  const el = $("#fleet"); if (!el) return;
  const by = Object.fromEntries(DATA.work.map((j) => [j.id, j]));
  cats = JSON.parse(el.dataset.cats).map((c) => ({ ...c, job: by[c.job] })).filter((c) => c.job);
  if (!cats.length) return;
  $("#rail").innerHTML = cats.map((c, i) => `<li><button type="button" data-i="${i}"><b>0${i + 1}</b>${esc(c.label)}</button></li>`).join("");
  $("#rail").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { cur = +b.dataset.i; show(true); } });
  const stepBy = (d) => { cur = (cur + d + cats.length) % cats.length; show(true); };
  $("#railPrev").addEventListener("click", () => stepBy(-1)); $("#railNext").addEventListener("click", () => stepBy(1));
  show(false);
}
