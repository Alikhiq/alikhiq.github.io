// Deterministic capture of the real site (susu-preview/index.html) on a virtual clock.
// node lib/sitecap.js <plan.js> <outdir> [--from s] [--to s] [--fps 30] [--list t,t,...]
// The plan file (evaluated in the page) defines:
//   window.PLAN = { w, h, dsf, mobile, intro:false, dur, y(t) -> scroll px, act?(t) -> async page actions }
// It may use the helpers below (secY('#prices'), ease, etc.).
// - Lenis is not loaded (scroll is set directly, so it's a pure function of t).
// - CSS transitions/animations are put on the virtual clock through the Web Animations API.
// - <video> elements are paused and seeked to the virtual time.
// - The 3D intro is stripped unless PLAN.intro (then it runs on the virtual clock).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const args = process.argv.slice(2); const planFile = args[0], out = args[1];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const planSrc = fs.readFileSync(planFile, 'utf8');
const meta = new Function('window', planSrc + ';return window.PLAN;')({ document: null });
const KIT = path.resolve(__dirname, '..');
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await br.newContext({ viewport: { width: meta.w, height: meta.h }, deviceScaleFactor: meta.dsf || 1, isMobile: !!meta.mobile, hasTouch: !!meta.mobile, reducedMotion: 'no-preference' });
  const p = await ctx.newPage();
  await p.addInitScript({ path: __dirname + '/vclock2.js' });
  if (!meta.intro) await p.addInitScript(() => { window.__susuIntroReady = true; });
  // offline + deterministic routes
  await p.route('**/*', async (r) => {
    const u = r.request().url();
    if (u.includes('fonts.googleapis.com/css')) return r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(KIT, 'lib/fonts.css'), 'utf8').replace(/url\(\/__fonts\//g, 'url(http://localhost:8811/__fonts/') });
    const m = u.match(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)$/);
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(KIT, 'cdn', m[1])) });
    if (u.endsWith('/js/lenis.min.js')) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (/\/index\.html$/.test(u) && !meta.intro) {
      const res = await r.fetch(); let html = await res.text();
      html = html.replace(/<div class="loader"[\s\S]*?loader__line"><\/span>\s*<\/div>/, '').replace('<script type="module" src="js/intro3d.js" async></script>', '');
      return r.fulfill({ response: res, body: html });
    }
    return r.continue();
  });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8811/index.html' + (meta.query || ''), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(planSrc + `;
    window.__vAnim = () => { const vt = window.__vt(); for (const a of document.getAnimations()) { if (a.__t0 === undefined) a.__t0 = vt; a.pause(); a.currentTime = Math.max(0, vt - a.__t0); } };
    window.__vVideo = async () => { const t = window.__vt() / 1000; const ps = []; document.querySelectorAll('video').forEach((v) => {
      v.pause(); if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
      if (!(v.duration > 0)) return; const want = (t + (+v.dataset.voff || 0)) % v.duration; if (Math.abs(v.currentTime - want) < 0.001) return;
      ps.push(new Promise((res) => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = want; window.__realTimeout(res, 1500); })); }); await Promise.all(ps); };
  `);
  // let the muse engine and three.js footer boot on the virtual clock
  for (let k = 0; k < 20; k++) { await p.evaluate((k) => window.__tick(k * 16), k); await p.waitForTimeout(30); }
  await p.waitForFunction(() => { const m = document.querySelector('muse-story'); return m && m._ready; }, null, { timeout: 60000 }).catch(() => console.log('muse not ready'));
  // preload all videos
  await p.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => new Promise((res) => { v.preload = 'auto'; v.muted = true; v.pause(); if (v.readyState >= 1) return res(); v.addEventListener('loadedmetadata', res, { once: true }); v.load(); window.__realTimeout(res, 8000); }))));
  if (process.env.DEBUG) console.log(await p.evaluate(() => JSON.stringify({ body: document.body.className, H: document.documentElement.scrollHeight, secs: [...document.querySelectorAll('section')].map((s) => [s.id, Math.round(s.getBoundingClientRect().top + scrollY), s.offsetHeight]) })));
  const fps = +opt('fps', 30); fs.mkdirSync(out, { recursive: true });
  let frames = [];
  const list = opt('list');
  if (list) frames = list.split(',').map((t, i) => ({ n: i, t: +t }));
  else { const a = +opt('from', 0), b = +opt('to', meta.dur); for (let n = Math.round(a * fps); n < Math.round(b * fps); n++) frames.push({ n, t: n / fps }); }
  const T = Date.now(); let i = 0; const base = 400; // ms of virtual time already used by boot
  for (const f of frames) {
    const file = `${out}/${String(f.n).padStart(5, '0')}.jpg`;
    await p.evaluate(async ({ t, base }) => {
      const P = window.PLAN; const y = P.y(t);
      if (P.act) await P.act(t);
      window.scrollTo(0, Math.round(y));
      // run two rAF rounds so scroll-driven code settles, then put CSS animations/videos on the clock
      window.__tick(base + t * 1000 - 1); window.__tick(base + t * 1000);
      window.__vAnim(); await window.__vVideo();
      if (P.after) await P.after(t);
    }, { t: f.t, base });
    await p.waitForTimeout(meta.settle || 0);
    await p.screenshot({ path: file, type: 'jpeg', quality: 93 });
    i++; if (i % 30 === 0) console.log(i, '/', frames.length, ((Date.now() - T) / i / 1000).toFixed(2) + 's/f');
  }
  console.log('done', frames.length, ((Date.now() - T) / 1000).toFixed(0) + 's');
  await br.close();
})();
