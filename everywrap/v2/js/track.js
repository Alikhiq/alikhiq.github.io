// Anonymous counts for the dashboard: page views and a few named taps.
// No cookies. Only the live site sends anything; previews and local copies stay silent.
import { R } from "./state.js";

const live = !!R.dataset.live;
let ref = "";
try {
  const src = new URLSearchParams(location.search).get("utm_source");
  const from = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
  ref = src || (from && from !== location.hostname ? from : "");
} catch {}
const once = new Set();

export function ev(name, detail = "", onlyOnce = false) {
  if (!live) return;
  if (onlyOnce) { if (once.has(name)) return; once.add(name); }
  try {
    const body = JSON.stringify({ n: name, d: String(detail || "").slice(0, 80), p: location.pathname, r: ref });
    if (!(navigator.sendBeacon && navigator.sendBeacon("/api/event", body))) fetch("/api/event", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}

export function initTrack() {
  ev("view");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]"); if (!a) return;
    if (a.href.startsWith("mailto:")) ev("mail_click");
    else if (/instagram\.com/.test(a.href)) ev("social_click");
  });
}
