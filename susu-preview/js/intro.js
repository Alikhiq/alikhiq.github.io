/* Susu Ink & Glow — intro timing (the look is all in css/intro.css).
   - First visit of a session: the full piece, about 2.8 s. Later pages in the session: under a second.
   - It runs while the portrait engine and fonts load, and waits for them if they need longer,
     but it never holds the page past 5.5 s. Tap, click or any key skips it.
   - Exit: the gold mark flies into the nav logo while the page fades up.
   - Tells js/site.js the page may show with `window.__susuIntroReady` + a `susu:intro-ready` event. */
(() => {
  const loader = document.querySelector('.loader');
  const body = document.body;
  let sent = false;
  const signalReady = () => {
    if (sent) return; sent = true;
    window.__susuIntroReady = true;
    window.dispatchEvent(new Event('susu:intro-ready'));
  };
  if (!loader) { signalReady(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let repeat = false;
  try { repeat = sessionStorage.getItem('susu-intro') === '1'; sessionStorage.setItem('susu-intro', '1'); } catch (e) { /* private mode */ }
  const MIN = repeat ? 750 : 2800; // ms since navigation start
  const CAP = 5500;

  let fontsIn = false;
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fonts.then(() => { fontsIn = true; }, () => { fontsIn = true; });

  const finish = () => { body.classList.remove('intro-landing'); loader.remove(); };

  let left = false;
  const leave = () => {
    if (left) return; left = true;
    removeEventListener('keydown', leave);
    const mark = loader.querySelector('.loader__mark');
    const img = document.querySelector('.nav__logo img');
    const r = img && img.getBoundingClientRect();
    const onScreen = r && r.width >= 8 && r.bottom > 0 && r.top < innerHeight;
    body.classList.add('intro-landing');
    loader.classList.add('loader--exit');
    signalReady(); // page fades up underneath
    if (mark && onScreen && !reduce) {
      const m = mark.getBoundingClientRect();
      const s = r.width / m.width;
      const dx = (r.left + r.width / 2) - (m.left + m.width / 2);
      const dy = (r.top + r.height / 2) - (m.top + m.height / 2);
      // take over from the CSS entrance animation (animations beat inline styles)
      mark.style.opacity = getComputedStyle(mark).opacity;
      mark.style.animation = 'none';
      void mark.offsetWidth;
      mark.style.transition = 'transform .85s cubic-bezier(.65,0,.35,1), opacity .3s ease .66s';
      mark.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
      mark.style.opacity = '0';
      setTimeout(() => body.classList.remove('intro-landing'), 660);
      setTimeout(finish, 1050);
    } else {
      loader.classList.add('loader--out');
      body.classList.remove('intro-landing');
      setTimeout(finish, 700);
    }
    // the body-piercing illustration is only needed six chapters down: fetch it once the page is up
    setTimeout(() => {
      document.querySelectorAll('img[data-src]').forEach((i) => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
    }, 300);
  };

  const muse = document.querySelector('muse-story');
  let drawn = 0;
  const tick = () => {
    if (left) return;
    const t = performance.now();
    // _ready: the portrait texture is uploaded. _fb: the still fallback (no WebGL) is in place.
    const portrait = !muse || muse._ready || muse._fb;
    if (portrait) drawn++; // give the engine two frames to compile its shaders behind the intro
    if ((t >= MIN && portrait && drawn > 2 && fontsIn) || t >= CAP) { leave(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(leave, CAP + 300); // background tabs pause requestAnimationFrame
  addEventListener('keydown', leave);
  loader.addEventListener('pointerdown', leave);
})();
