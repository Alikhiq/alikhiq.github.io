window.PLAN = { w: 1440, h: 900, dsf: 1.5, mobile: false, dur: 24 };
// Shared scroll timeline for the "Devices" video: both viewports visit the same sections at the same times.
(() => {
  const P = window.PLAN;
  const sm = (x) => x * x * (3 - 2 * x), io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  // [time s, anchor]; between keys the scroll glides with an ease-in-out, otherwise it holds
  const K = [
    [0, ['p', 0]], [2.6, ['p', 0]], [4.0, ['p', 1]], [5.4, ['p', 1]], [6.7, ['p', 2]], [8.0, ['p', 2]], [9.3, ['p', 3]],
    [10.4, ['p', 3]], [11.9, ['sec', '#results', 0]], [12.9, ['sec', '#results', 0]], [14.3, ['sec', '#prices', 0]],
    [15.7, ['sec', '#prices', 0.12]], [17.0, ['sec', '#book', 0]], [18.4, ['sec', '#book', 0]], [20.0, ['end']], [40, ['end']],
  ];
  const yOf = (a) => {
    if (typeof document === 'undefined' || !document.body) return 0;
    const mob = innerWidth <= 760;
    if (a[0] === 'p') { const st = document.querySelector('.story__stage'); const s = document.querySelector('#story'); const STEP = st.clientHeight * (mob ? 0.85 : 0.95); return s.offsetTop + a[1] * STEP + 2; }
    if (a[0] === 'sec') { const el = document.querySelector(a[1]); return el.getBoundingClientRect().top + scrollY + a[2] * el.offsetHeight; }
    return document.documentElement.scrollHeight - innerHeight;
  };
  P.y = (t) => {
    for (let i = 0; i < K.length - 1; i++) {
      const [t0, a0] = K[i], [t1, a1] = K[i + 1];
      if (t >= t0 && t <= t1) { const y0 = yOf(a0), y1 = yOf(a1); return y0 + (y1 - y0) * io((t - t0) / (t1 - t0)); }
    }
    return yOf(K[K.length - 1][1]);
  };
})();
