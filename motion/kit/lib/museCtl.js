// helpers to drive <muse-story> deterministically from a timeline
window.MuseCtl = (el) => {
  const st = { p: 0, t: 0, mod: null };
  const ready = new Promise((res) => { const iv = () => { if (el._ready && el._r) res(); else window.__realTimeout(iv, 50); }; iv(); });
  ready.then(() => {
    el._progress = () => st.p;
    const orig = el._views.bind(el);
    el._views = () => { const v = orig(); return st.mod ? st.mod(v) : v; };
  });
  return {
    ready,
    // call before __tick(ms): p = chapter progress, t = portrait-local seconds, mod = fn(views) for camera tweaks
    set(p, t, mod, ms) { st.p = p; st.t = t; st.mod = mod || null; el._pd = p; el._t0 = ms - t * 1000; },
  };
};
