/* Susu Ink & Glow — loading screen timing (the look is all in css/intro.css).
   - Leaves as soon as the portrait is ready to draw and the fonts are in, never before the
     icons have finished arriving (about a second on a first visit, a blink on later ones).
   - Never holds the page: it always leaves by 4.5 s. Tap, click or any key skips it.
   - Tells js/site.js the page may show with `window.__susuIntroReady` + a `susu:intro-ready` event. */
(() => {
  const loader = document.querySelector('.loader');
  let sent = false;
  const signalReady = () => {
    if (sent) return; sent = true;
    window.__susuIntroReady = true;
    window.dispatchEvent(new Event('susu:intro-ready'));
  };
  if (!loader) { signalReady(); return; }

  let repeat = false;
  try { repeat = sessionStorage.getItem('susu-intro') === '1'; sessionStorage.setItem('susu-intro', '1'); } catch (e) { /* private mode */ }
  const MIN = repeat ? 350 : 1100; // ms since navigation start
  const CAP = 4500;

  let fontsIn = false;
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fonts.then(() => { fontsIn = true; }, () => { fontsIn = true; });

  let left = false;
  const leave = () => {
    if (left) return; left = true;
    signalReady();
    loader.classList.add('loader--out');
    removeEventListener('keydown', leave);
    setTimeout(() => loader.remove(), 650);
    // the body-piercing illustration is only needed six chapters down: fetch it once the page is up
    setTimeout(() => {
      document.querySelectorAll('img[data-src]').forEach((img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    }, 300);
  };

  const muse = document.querySelector('muse-story');
  let drawn = 0;
  const tick = () => {
    if (left) return;
    const t = performance.now();
    // _ready: the portrait texture is uploaded. _fb: the still fallback (no WebGL) is in place.
    const portrait = !muse || muse._ready || muse._fb;
    if (portrait) drawn++; // give the engine two frames to compile its shaders behind the loader
    if ((t >= MIN && portrait && drawn > 2 && fontsIn) || t >= CAP) { leave(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(leave, CAP + 300); // background tabs pause requestAnimationFrame
  addEventListener('keydown', leave);
  loader.addEventListener('pointerdown', leave);
})();
