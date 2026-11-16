// Ask by voice. The conversation runs on the page: the button turns into a live orb,
// and the assistant can open the photo panel or the booking form while it talks.
// If the browser cannot start it (no microphone, blocked, old browser), the link opens as before.
import { ROOT, $, $$, hooks, reduce } from "./state.js";

const SERVICES = ["wrap", "ppf", "tint", "kits", "fleet", "design", "print"];
let convo = null, orb = null, raf = 0, busy = false, sdk = null, run = 0;

function build() {
  if (orb) return orb;
  orb = document.createElement("button");
  orb.type = "button"; orb.className = "vorb"; orb.id = "vorb"; orb.hidden = true;
  orb.setAttribute("aria-label", "End voice chat");
  orb.innerHTML = '<i class="vorb-ring" aria-hidden="true"></i><span class="vorb-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><em class="vorb-cap" aria-live="polite"></em><b class="vorb-x" aria-hidden="true">End</b>';
  orb.addEventListener("click", stop);
  document.body.appendChild(orb);
  return orb;
}
function set(state, text) {
  if (!orb) return;
  orb.dataset.state = state; $(".vorb-cap", orb).textContent = text;
  $$("[data-voice]").forEach((b) => { b.classList.toggle("live", state !== "off"); const t = $(".voice-t", b); if (t) t.textContent = state === "off" ? t.dataset.idle : "Live · tap to end"; });
}
function show(from) {
  build(); orb.hidden = false; orb.classList.remove("in");
  // The orb starts where the tapped button is and travels to its place.
  const a = from.getBoundingClientRect(), b = orb.getBoundingClientRect();
  orb.style.setProperty("--fx", `${a.left + a.width / 2 - (b.left + b.width / 2)}px`);
  orb.style.setProperty("--fy", `${a.top + a.height / 2 - (b.top + b.height / 2)}px`);
  void orb.offsetWidth; orb.classList.add("in");
}
function hide() {
  cancelAnimationFrame(raf); raf = 0;
  if (!orb) return;
  set("off", ""); orb.classList.remove("in"); orb.style.setProperty("--v", "0");
  setTimeout(() => { if (!convo && !busy) orb.hidden = true; }, 420);
}
function meter() {
  if (!convo || !orb) return;
  let v = 0;
  try { v = Math.max(convo.getInputVolume() || 0, convo.getOutputVolume() || 0); } catch {}
  orb.style.setProperty("--v", Math.min(1, v * 2.2).toFixed(3));
  raf = requestAnimationFrame(meter);
}
async function stop() {
  run++; busy = false;
  const c = convo; convo = null; hide();
  if (c) { try { await c.endSession(); } catch {} }
}

const tools = {
  open_photo_upload() {
    if (!hooks.upload) return "The photo panel is not on this page. Ask the visitor to tap Book now instead.";
    hooks.upload();
    return "The photo panel is open on the visitor's screen. They add a photo there and continue to the booking form. You cannot see the photo, and it is not sent on its own: when the request opens in their email app at the end, they attach the photo to that email. Tell them this in one short sentence.";
  },
  open_booking_form(p = {}) {
    if (!hooks.quote) return "The booking form is not available. Ask the visitor to tap Book now on the page.";
    const svc = SERVICES.includes(p.service) ? p.service : "";
    hooks.quote({ svc, car: (p.vehicle || "").slice(0, 80), note: (p.note || "").slice(0, 160) });
    return "The booking form is open on the visitor's screen with the service picked. They fill in the vehicle, their name and mobile number, then press the last button to send it.";
  },
};

// One connection attempt. `live` goes false when the attempt is dropped, so its late events are ignored.
function attempt(agentId, type, me) {
  const live = { ok: true };
  const p = sdk.Conversation.startSession({
    agentId, connectionType: type, clientTools: tools,
    onModeChange: ({ mode }) => { if (live.ok && me === run) set(mode === "speaking" ? "talk" : "hear", mode === "speaking" ? "Speaking" : "Listening"); },
    onDisconnect: () => { if (live.ok && me === run) { convo = null; busy = false; hide(); } },
    onError: (m) => console.warn("Voice:", m),
  });
  const drop = () => { live.ok = false; p.then((c) => c.endSession()).catch(() => {}); };
  return { p, drop };
}
// Direct audio first. Some networks block it, so after a few seconds fall back to a plain web socket.
async function connect(agentId, me) {
  const first = attempt(agentId, "webrtc", me);
  let timer;
  const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error("slow")), 7000); });
  try { return await Promise.race([first.p, late]); }
  catch { first.drop(); if (me !== run) throw new Error("cancelled"); return await attempt(agentId, "websocket", me).p; }
  finally { clearTimeout(timer); }
}

async function start(btn) {
  if (convo || busy) return stop();
  const me = ++run;
  busy = true; show(btn); set("wait", "Connecting");
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("no microphone support");
    // Ask for the microphone first, so the permission prompt comes straight from the tap.
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); mic.getTracks().forEach((t) => t.stop());
    if (me !== run) return;
    sdk = sdk || (await import(new URL(ROOT + "js/vendor/elevenlabs-client.js", location.href).href));
    const c = await connect(btn.dataset.voice, me);
    if (me !== run) { try { c.endSession(); } catch {} return; }
    convo = c; busy = false;
    if (orb.dataset.state === "wait") set("hear", "Listening");
    if (!reduce) meter();
  } catch (err) {
    if (me !== run) return;
    busy = false; convo = null; hide();
    console.warn("Voice could not start on the page:", err && err.message ? err.message : err);
    // Fall back to the hosted conversation in a new tab.
    if (btn.href) window.open(btn.href, "_blank", "noopener");
  }
}

export function initVoice() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-voice]"); if (!b) return;
    e.preventDefault(); start(b);
  });
  addEventListener("pagehide", () => { if (convo) { try { convo.endSession(); } catch {} } });
}
