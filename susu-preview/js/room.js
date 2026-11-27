/* Susu Ink & Glow — the 3D studio room behind the portrait.
   One rendered plate of the room; this moves a virtual camera over it. Each chapter of the story
   lands on a different part of the room (mirror, vanity bottles, wall lamp, armchair, hanging
   globes) and the move between them uses the same easing as the portrait's own zoom, so the two
   travel together. The plate loads only after the intro has handed over. */
(() => {
  const room = document.querySelector('.story__room');
  const plate = room && room.querySelector('i');
  const track = document.getElementById('muse-track');
  if (!plate || !track) return;
  // [zoom, shift right %, shift down %] for hero, then chapters 1 to 6
  const WIDE = [[1.06, 0, 0], [1.70, 0, 7], [2.10, -2, -14], [1.95, -17, 5], [2.25, 26, -15], [2.05, 0, 23], [2.05, 0, 23]];
  const TALL = [[1.06, 0, 0], [1.60, 9, 11], [2.00, 11, -3], [1.85, -13, 13], [1.75, 10, -17], [2.05, 13, 21], [2.05, 13, 21]];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (t) => { t = Math.max(0, Math.min(1, (t - 0.2) / 0.6)); return t * t * (3 - 2 * t); };
  const start = () => {
    room.classList.add('is-on');
    if (reduce) return;
    let shown = -1, target = 0, raf = 0;
    const draw = () => {
      raf = 0;
      shown = shown < 0 ? target : shown + (target - shown) * 0.12;      // a little glide, like the portrait
      const K = innerWidth / innerHeight < 0.9 ? TALL : WIDE;
      const i = Math.min(K.length - 2, Math.floor(shown)), k = ease(shown - i);
      const a = K[i], b = K[i + 1];
      const z = Math.exp(Math.log(a[0]) + (Math.log(b[0]) - Math.log(a[0])) * k);
      const x = a[1] + (b[1] - a[1]) * k, y = a[2] + (b[2] - a[2]) * k;
      plate.style.transform = `scale(${z.toFixed(4)}) translate3d(${x.toFixed(3)}%,${y.toFixed(3)}%,0)`;
      if (Math.abs(target - shown) > 0.002) raf = requestAnimationFrame(draw);
    };
    const read = () => {
      const h = (track.querySelector('.story-stage') || {}).clientHeight || innerHeight;
      target = Math.max(0, Math.min(6, -track.getBoundingClientRect().top / h)); // chapter progress 0..6
      if (!raf) raf = requestAnimationFrame(draw);
    };
    addEventListener('scroll', read, { passive: true });
    addEventListener('resize', read);
    setInterval(read, 300); // smooth-scroll libraries can move the page between scroll events
    read();
  };
  if (window.__susuIntroReady) start(); else addEventListener('susu:intro-ready', start, { once: true });
})();
