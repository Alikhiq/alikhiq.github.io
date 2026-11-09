// "Beauty": the site on a phone-shaped full-bleed viewport (432x768 @2.5 = 1080x1920), cut to a beat grid.
// Shots are in beats; window.BEATS = {bpm, offset} must be defined before this file.
(() => {
  const BT = window.BEATS, b = 60 / BT.bpm, B = (n) => BT.offset + n * b;
  const P = window.PLAN = { w: 432, h: 768, dsf: 2.5, mobile: true, dur: B(44) };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const cl = (x) => Math.min(1, Math.max(0, x));
  const doc = () => typeof document !== 'undefined' && document.body;
  const pY = (p) => { const st = document.querySelector('.story__stage'), s = document.querySelector('#story'); return s.offsetTop + p * st.clientHeight * 0.85 + 2; };
  const sec = (sel, off) => { const el = document.querySelector(sel); return el.getBoundingClientRect().top + scrollY + off; };
  P.y = (t) => {
    if (!doc()) return 0;
    if (t < B(15)) return pY(0);
    if (t < B(28)) { // chapters: glide during the last beat of each bar, land on the downbeat
      const bar = Math.floor((t - B(15)) / (4 * b)); const into = (t - B(15)) - bar * 4 * b;
      return pY(bar + io(cl(into / b)));
    }
    if (t < B(32)) return sec('#prices', 330 + 520 * io(cl((t - B(28)) / (4 * b))));
    if (t < B(40)) return sec('#book', 470 + 70 * cl((t - B(32)) / (8 * b)));
    return sec('#foot', -40 + 120 * io(cl((t - B(40)) / (4 * b))));
  };
  // eye blinks: muse-story blinks when ((U - 2.6) % blink) is ~0.09 s (fully closed), U = portrait-local seconds.
  // Blink every 4 beats, closed exactly on beats 14, 18, 22 and 26 (between the chapter cuts, so each blink is seen).
  // The portrait starts drawing itself just after beat 8 (U < 0 before that).
  P.blinkEvery = 4 * b; P.firstBlink = B(14);
  const SERV = ['brows', 'lips', 'pmu', 'tattoo'];
  P.act = async (t) => {
    const m = document.querySelector('muse-story');
    if (m) { m.setAttribute('blink', P.blinkEvery.toFixed(4)); const U = 2.6 + 0.09 + (t - P.firstBlink); m._t0 = (400 + t * 1000) - U * 1000; }
    // booking: one service ticks on each beat from beat 33
    SERV.forEach((s, i) => { const inp = document.querySelector(`input[name=service][value="${s}"]`); if (!inp) return; const want = t >= B(33 + i); if (inp.checked !== want) inp.click(); });
  };
})();
