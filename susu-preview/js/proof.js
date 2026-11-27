/* Proof cards: each service's card cycles through several results.
   Images load one ahead, only while that card is on screen. */
(() => {
  const cards = [...document.querySelectorAll('.proof[data-slides]')].map((el) => ({
    el,
    frame: el.querySelector('.proof__frame'),
    tag: el.querySelector('.proof__tag'),
    slides: el.dataset.slides.split(',').map((s) => { const [src, label] = s.split('|'); return { src, label: label || '' }; }),
    i: 0, next: null,
  }));
  const prep = (c) => {
    if (c.next || c.slides.length < 2) return;
    const img = new Image();
    img.decoding = 'async'; img.alt = '';
    img.src = c.slides[(c.i + 1) % c.slides.length].src;
    c.next = img;
  };
  cards.forEach((c) => { c.tag.textContent = c.slides[0].label; });
  setInterval(() => {
    if (document.hidden) return;
    cards.forEach((c) => {
      if (c.slides.length < 2 || +c.el.style.opacity < 0.6) return;
      if (!c.next) return prep(c);
      if (!c.next.complete || !c.next.naturalWidth) return;
      const img = c.next;
      c.i = (c.i + 1) % c.slides.length;
      c.next = null;
      img.className = 'is-in';
      c.frame.insertBefore(img, c.tag);
      c.tag.textContent = c.slides[c.i].label;
      const old = c.frame.querySelectorAll('img');
      setTimeout(() => { for (let k = 0; k < old.length - 1; k++) old[k].remove(); }, 900);
      prep(c);
    });
  }, 2400);
})();
