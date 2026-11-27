/* Cycling picture cards: the small cards beside the portrait (.proof) and the
   slideshow cards in The Work (.slides). Images load one ahead, and only while
   the card is on screen. */
(() => {
  const cards = [...document.querySelectorAll('[data-slides]')].map((el) => ({
    el,
    story: el.classList.contains('proof'),
    seen: false,
    frame: el.querySelector('.proof__frame'),
    tag: el.querySelector('.proof__tag'),
    slides: el.dataset.slides.split(',').map((s) => { const [src, label] = s.split('|'); return { src, label: label || '' }; }),
    i: 0, next: null,
  })).filter((c) => c.frame);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    ents.forEach((e) => { const c = cards.find((k) => k.el === e.target); if (c) c.seen = e.isIntersecting; });
  }, { threshold: 0.4 }) : null;
  cards.forEach((c) => {
    c.tag.textContent = c.slides[0].label;
    if (!c.story) io ? io.observe(c.el) : (c.seen = true);
  });
  const prep = (c) => {
    if (c.next || c.slides.length < 2) return;
    const img = new Image();
    img.decoding = 'async'; img.alt = '';
    img.src = c.slides[(c.i + 1) % c.slides.length].src;
    c.next = img;
  };
  let n = 0;
  setInterval(() => {
    if (document.hidden) return;
    n++;
    cards.forEach((c, k) => {
      if (c.slides.length < 2) return;
      if (!(c.story ? +c.el.style.opacity > 0.6 : c.seen)) return;
      if (!c.next) return prep(c);
      if (!c.story && (n + k) % 2) return;              // work cards: half the pace, out of step with each other
      if (!c.next.complete || !c.next.naturalWidth) return;
      const img = c.next;
      c.i = (c.i + 1) % c.slides.length;
      c.next = null;
      img.className = 'is-in';
      c.frame.insertBefore(img, c.tag);
      c.tag.textContent = c.slides[c.i].label;
      const old = c.frame.querySelectorAll('img');
      setTimeout(() => { for (let j = 0; j < old.length - 1; j++) old[j].remove(); }, 800);
      prep(c);
    });
  }, 1300);
})();
