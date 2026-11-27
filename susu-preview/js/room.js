/* Susu Ink & Glow — the 3D studio room behind the portrait.
   Two rendered camera angles of the same room. The wide one shows on the hero; as the story
   scrolls into the close-up chapters it drifts and cross-fades to the closer angle.
   The images load only after the intro has handed over, so they never slow the first paint. */
(() => {
  const room = document.querySelector('.story__room');
  const track = document.getElementById('muse-track');
  if (!room || !track) return;
  const start = () => {
    room.classList.add('is-on');
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = (track.querySelector('.story-stage') || {}).clientHeight || innerHeight;
      const p = Math.max(0, Math.min(6, -track.getBoundingClientRect().top / h)); // chapter progress 0..6
      const k = Math.max(0, Math.min(1, (p - 0.25) / 0.75));                       // 0 on the hero, 1 from chapter 1
      if (p > 0.05) room.classList.add('is-near');
      room.style.setProperty('--room', (k * k * (3 - 2 * k)).toFixed(3));
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    setInterval(ask, 400); // smooth-scroll libraries move the page without scroll events on some browsers
    update();
  };
  if (window.__susuIntroReady) start(); else addEventListener('susu:intro-ready', start, { once: true });
})();
