// Smoke test for the production build. Starts server.js on a free port (or uses APP_URL), drives the app
// in headless Chromium with software WebGL and prints one PASS/FAIL line per check.
//
//   npm run build && npm run test:smoke
//
// Playwright is not a dependency of the app. The test looks for it through NODE_PATH, then in
// /opt/node-tools. Screenshots go to SHOTS_DIR (default test/out). Needs python3 (WAV) and ffprobe.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = process.env.SHOTS_DIR || join(ROOT, 'test', 'out');
const TMP = join(ROOT, 'test', 'out');
mkdirSync(SHOTS, { recursive: true }); mkdirSync(TMP, { recursive: true });

function loadPlaywright() {
  for (const base of [import.meta.url, '/opt/node-tools/']) {
    try { return createRequire(base)('playwright'); } catch { /* next */ }
  }
  throw new Error('playwright not found: set NODE_PATH to a node_modules folder that has it');
}
const { chromium } = loadPlaywright();
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];

// ---- server ----
let server = null, BASE = process.env.APP_URL;
if (!BASE) {
  const port = 4300 + Math.floor(Math.random() * 500);
  server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  BASE = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 100)); }
}

// ---- tiny harness ----
const results = [];
async function check(name, fn) {
  const t0 = Date.now();
  try { const note = await fn(); results.push([true, name, note || '']); console.log('PASS  ' + name + (note ? '  — ' + note : '') + '  (' + (Date.now() - t0) + ' ms)'); }
  catch (e) { results.push([false, name, e.message]); console.log('FAIL  ' + name + '  — ' + e.message.split('\n')[0]); }
}
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const S = (page, expr) => page.evaluate('(() => { const S = window.__studio; return ' + expr + '; })()');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: join(SHOTS, name + '.png') });

// a 12 s WAV (long enough that slow software rendering cannot outlast it): kick-like thumps at 120 BPM over a quiet tone, so the analyser has something to find
const WAV = join(TMP, 'prueba-de-humo.wav');
execFileSync('python3', ['-c', `
import wave, struct, math
sr = 44100; n = sr * 12; out = bytearray()
for i in range(n):
    t = i / sr; b = t % 0.5
    kick = math.sin(2 * math.pi * (50 + 90 * math.exp(-b * 30)) * b) * math.exp(-b * 9)
    hat = math.sin(2 * math.pi * 6500 * t) * math.exp(-((t + 0.25) % 0.5) * 60) * 0.25
    v = max(-1, min(1, kick * 0.8 + math.sin(2 * math.pi * 440 * t) * 0.08 + hat))
    out += struct.pack('<h', int(v * 32000))
w = wave.open(${JSON.stringify(WAV)}, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(bytes(out)); w.close()
`]);

const browser = await chromium.launch({ args: GL_ARGS });
const errors = [];
async function open(viewport, init) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || '')) errors.push('request failed: ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ': ' + r.url()); });
  if (init) await page.addInitScript(init);
  // ?hq: software WebGL is slow, and the app would otherwise halve its resolution before the screenshots
  await page.goto(BASE + '/?hq#' + (process.env.START_CODE || '0K3M9A2'));
  await page.waitForFunction(() => window.__studio && window.__studio.gl !== 'loading', null, { timeout: 90000 });
  return { ctx, page };
}

try {
  // ───────── server ─────────
  await check('server: /health, cache headers, Range', async () => {
    const h = await fetch(BASE + '/health'); assert(h.ok && (await h.json()).status === 'ok', '/health not ok');
    const idx = await fetch(BASE + '/'); assert(idx.headers.get('cache-control') === 'no-cache', 'index.html must be no-cache');
    const sw = await fetch(BASE + '/sw.js'); assert(sw.ok && sw.headers.get('cache-control') === 'no-cache', 'sw.js must be no-cache');
    const asset = /assets\/index-[\w-]+\.js/.exec(await idx.text())[0];
    const a = await fetch(BASE + '/' + asset); assert(/immutable/.test(a.headers.get('cache-control')), 'hashed asset must be immutable');
    const r = await fetch(BASE + '/media/v4109.mp4', { headers: { Range: 'bytes=1000-1999' } });
    assert(r.status === 206 && r.headers.get('content-range').startsWith('bytes 1000-1999/') && (await r.arrayBuffer()).byteLength === 1000, 'Range request not honoured');
    assert(!/media\/.*mp4/.test(await sw.text()), 'service worker must not precache videos');
    return 'index/sw no-cache, ' + asset + ' immutable, 206 for video range';
  });

  // ───────── desktop ─────────
  const { ctx, page } = await open({ width: 1440, height: 900 });

  await check('loads with 3D active and no console errors', async () => {
    assert(await S(page, 'S.gl') === 'on', 'WebGL world did not start: ' + await S(page, 'S.gl'));
    await page.waitForFunction(() => window.__studio.frames > 3, null, { timeout: 30000 });
    assert(await page.locator('#gl').isVisible(), '#gl canvas is not visible');
    assert(await page.locator('#firstrun').isVisible(), 'first-run overlay missing on a fresh profile');
    await sleep(1500);
    assert(errors.length === 0, 'console errors: ' + errors.join(' | '));
    const v = await S(page, 'S.visual');
    return 'gl=on, visual ' + v.code + ' "' + v.name + '" (' + [v.env, v.s3, v.style].join(' / ') + ')';
  });
  await shot(page, '01-desktop-firstrun');

  await check('demo beat plays and the visuals react', async () => {
    await page.click('#fr-play');
    await page.waitForFunction(() => window.__studio.audio.playing && window.__studio.audio.live, null, { timeout: 10000 });
    await sleep(600);
    const beats0 = await S(page, 'S.audio.beats'); const seen = { bass: [], mid: [], high: [], level: [] };
    for (let i = 0; i < 35; i++) { await sleep(100); const a = await S(page, 'S.audio'); for (const k in seen) seen[k].push(a[k]); }
    const a = await S(page, 'S.audio'), lvl = seen.level, range = k => Math.max(...seen[k]) - Math.min(...seen[k]);
    const swing = Math.max(range('bass'), range('mid'), range('high'));
    assert(a.source === 'demo', 'source is ' + a.source);
    assert(Math.max(...lvl) > .05, 'no signal level from the demo');
    assert(swing > .25 && range('level') > .15, 'bands barely move: ' + swing.toFixed(2) + ', level ' + range('level').toFixed(2));
    assert(a.beats - beats0 >= 2, 'beats detected: ' + (a.beats - beats0));
    assert(await page.locator('#firstrun').isHidden(), 'first-run overlay should leave after play');
    const meter = await page.evaluate(async () => { const seen = new Set(); for (let i = 0; i < 20; i++) { seen.add(document.querySelector('#meter i').style.transform); await new Promise(r => setTimeout(r, 60)); } return seen.size; });
    assert(meter > 3, 'level meter is not moving');
    return 'live analyser, band swing ' + swing.toFixed(2) + ', level swing ' + range('level').toFixed(2) + ', ' + (a.beats - beats0) + ' beats in 3.5 s, meter moving';
  });
  await shot(page, '02-desktop-3d-playing');

  await check('new visual works 12 times', async () => {
    const codes = new Set([await S(page, 'S.visual.code')]);
    for (let i = 0; i < 12; i++) {
      if (i % 2) await page.keyboard.press('g'); else await page.click('#btn-gen');
      await sleep(250);
      codes.add(await S(page, 'S.visual.code'));
      assert(await page.locator('#vname').innerText() === await S(page, 'S.visual.name'), 'name label out of sync');
    }
    assert(codes.size === 13, 'expected 13 distinct codes, got ' + codes.size);
    await page.keyboard.press('ArrowLeft'); await sleep(150);
    assert([...codes][11] === await S(page, 'S.visual.code'), 'previous visual did not come back');
    assert(errors.length === 0, 'console errors: ' + errors.join(' | '));
    return '12 new codes (6 by button, 6 by G), history back works';
  });

  await check('browser locks a background, a 3D scene and a style', async () => {
    const pick = async (tab, kind, id) => {
      await page.click('#tab-' + tab);
      const tile = page.locator(`.tile[data-kind="${kind}"][data-id="${id}"]`);
      await tile.scrollIntoViewIfNeeded(); await tile.click(); await sleep(200);
      assert(await tile.getAttribute('aria-pressed') === 'true', id + ' tile not pressed');
      assert((await S(page, 'S.visual'))[kind] === id, kind + ' is ' + (await S(page, 'S.visual'))[kind] + ', wanted ' + id);
    };
    await pick('env', 'env', 'v4231');
    await shot(page, '03-desktop-browser-background');
    await pick('s3', 's3', 'tunnel');
    await pick('style', 'style', 'neon');
    for (let i = 0; i < 4; i++) { await page.click('#btn-gen'); await sleep(200); const v = await S(page, 'S.visual'); assert(v.env === 'v4231' && v.s3 === 'tunnel' && v.style === 'neon', 'lock lost after new visual: ' + JSON.stringify(v)); }
    assert(await page.locator('#tab-env.locked, #tab-s3.locked, #tab-style.locked').count() === 3, 'tabs do not show the locks');
    await sleep(1200); await shot(page, '04-desktop-browser-style');
    await page.click('#tab-s3'); await sleep(900); await shot(page, '05-desktop-browser-3d');
    // let go of the style again by clicking the locked tile
    await page.click('#tab-style'); await page.click('.tile[data-kind="style"][data-id="neon"]');
    assert(await S(page, 'S.lock.style') === 'auto', 'clicking a locked tile should unlock it');
    assert(errors.length === 0, 'console errors: ' + errors.join(' | '));
    return 'env=v4231, 3D=tunnel, style=neon held across 4 new visuals; unlock works';
  });

  await check('favorites and typed codes', async () => {
    const code = await S(page, 'S.visual.code');
    await page.click('#v-fav'); await sleep(400);
    await page.click('#btn-gen'); await sleep(200);
    assert(await S(page, 'S.visual.code') !== code, 'visual did not change');
    await page.click('#tab-favs'); await page.click(`.row-main[data-code="${code}"]`); await sleep(200);
    assert(await S(page, 'S.visual.code') === code, 'favorite did not load');
    assert(await page.evaluate(() => JSON.parse(localStorage.getItem('cs-favs'))[0].thumb.startsWith('data:image/jpeg')), 'favorite has no snapshot');
    await page.fill('#vcode', '0clasuk'); await page.press('#vcode', 'Enter'); await sleep(200);
    assert(await S(page, 'S.visual.code') === '0CLASUK', 'typed code did not load');
    await page.fill('#vcode', 'zzzzzzz'); await page.press('#vcode', 'Enter'); await sleep(150);
    assert(await S(page, 'S.visual.code') === '0CLASUK' && /no existe/.test(await page.locator('#toast').innerText()), 'a bad code should be refused with a message');
    await page.keyboard.press('Escape');
    return 'saved ' + code + ' with a snapshot, reloaded it, typed 0CLASUK, bad code refused';
  });

  await check('a WAV loads into the playlist and plays', async () => {
    await page.setInputFiles('#file', WAV);
    await page.waitForFunction(() => { const a = window.__studio.audio; return a.source === 'songs' && a.tracks === 1 && a.playing; }, null, { timeout: 10000 });
    assert(await page.locator('#track-name').innerText() === 'prueba-de-humo', 'track name: ' + await page.locator('#track-name').innerText());
    await page.click('#tab-songs'); assert(await page.locator('#pane-songs .row').count() === 1, 'queue row missing');
    await sleep(1600);
    const tcur = await page.locator('#t-cur').innerText(), a = await S(page, 'S.audio');
    assert(tcur !== '0:00', 'playback clock did not advance'); assert(await page.locator('#t-dur').innerText() === '0:12', 'duration: ' + await page.locator('#t-dur').innerText());
    assert(a.live && a.level > .02, 'no level from the WAV');
    return 'track "prueba-de-humo" 0:12, clock at ' + tcur + ', level ' + a.level.toFixed(2);
  });

  await check('3 s 9:16 recording downloads a file with video and audio', async () => {
    await page.click('[data-src="demo"]'); await page.waitForFunction(() => window.__studio.audio.source === 'demo' && window.__studio.audio.playing);
    await page.click('[data-ar="9:16"]'); await sleep(400);
    await page.click('#btn-rec');
    await page.waitForSelector('#app.is-rec'); await sleep(1500);
    const size = await S(page, 'S.size'); assert(size[0] === 1080 && size[1] === 1920, 'export size is ' + size.join('×'));
    assert(await page.locator('#rec-hud').isVisible(), 'REC readout missing');
    await shot(page, '06-desktop-recording');
    await sleep(1700);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#btn-rec')]);
    const file = join(TMP, dl.suggestedFilename()); await dl.saveAs(file);
    assert(/^clasuke-.+\.(mp4|webm)$/.test(dl.suggestedFilename()), 'file name: ' + dl.suggestedFilename());
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
    const v = probe.streams.find(s => s.codec_type === 'video'), au = probe.streams.find(s => s.codec_type === 'audio');
    assert(v, 'no video stream'); assert(au, 'no audio stream');
    assert(v.width === 1080 && v.height === 1920, 'video is ' + v.width + '×' + v.height);
    // WebM from MediaRecorder has no duration in the header: measure by decoding
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', file]).toString().trim().split('\n').pop());
    assert(dur > 2.4, 'audio runs only ' + dur + ' s');
    assert(await page.locator('#app.is-rec').count() === 0, 'still in recording state');
    await page.click('[data-ar="free"]');
    return dl.suggestedFilename() + ' · ' + (statSync(file).size / 1024 | 0) + ' kB · ' + v.codec_name + ' ' + v.width + '×' + v.height + ' + ' + au.codec_name + ' · ' + dur.toFixed(1) + ' s';
  });

  await check('command palette', async () => {
    await page.keyboard.press('Control+k'); await page.waitForSelector('#palette:not([hidden])');
    assert(await page.locator('#pal-list li').count() > 15, 'palette is missing actions');
    await shot(page, '07-desktop-palette');
    await page.keyboard.type('0k3m9a2'); await sleep(100);
    assert(/0K3M9A2/.test(await page.locator('#pal-list li').first().innerText()), 'palette does not offer the code');
    await page.keyboard.press('Enter'); await sleep(200);
    assert(await page.locator('#palette').isHidden() && await S(page, 'S.visual.code') === '0K3M9A2', 'palette did not load the code');
    return 'opens on Ctrl+K, lists actions, loads a typed code';
  });

  await check('stream mode hides the UI', async () => {
    await page.keyboard.press('h'); await sleep(500);
    for (const sel of ['.top', '.deck', '.browser']) assert(await page.locator(sel).isHidden(), sel + ' still visible');
    const box = await page.locator('#frame').boundingBox();
    assert(Math.abs(box.width - 1440) < 2 && Math.abs(box.height - 900) < 2, 'stage is ' + box.width + '×' + box.height);
    await sleep(2600); await shot(page, '08-desktop-stream');
    await page.keyboard.press('Escape'); await sleep(300);
    assert(await page.locator('.deck').isVisible(), 'UI did not come back');
    return 'H hides top bar, deck and browser; stage fills 1440×900; Esc brings them back';
  });

  await check('language toggle', async () => {
    assert(await page.locator('#btn-gen span').innerText() === 'NUEVO VISUAL', 'Spanish is not the default: ' + await page.locator('#btn-gen span').innerText());
    await page.click('[data-lang="en"]');
    assert(await page.locator('#btn-gen span').innerText() === 'NEW VISUAL', 'primary button not translated');
    assert(await page.locator('#tab-env span').innerText() === 'SCENE' && await page.evaluate(() => document.documentElement.lang) === 'en', 'tabs / lang attribute not translated');
    assert(await page.locator('.tile[data-id="v4231"] .tile-name').innerText() === 'Neon street', 'tiles not translated');
    const left = await page.evaluate(() => [...document.querySelectorAll('[data-i]')].filter(e => !e.textContent.trim()).length);
    assert(left === 0, left + ' labels are empty in English');
    await shot(page, '09-desktop-english');
    await page.click('[data-lang="es"]');
    assert(await page.locator('#btn-gen span').innerText() === 'NUEVO VISUAL', 'did not switch back');
    return 'ES default → EN → ES, labels, tabs, tiles and <html lang> follow';
  });

  await check('rendering pauses while the tab is hidden', async () => {
    const setHidden = h => page.evaluate(h => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); document.dispatchEvent(new Event('visibilitychange')); }, h);
    await setHidden(true); await sleep(300);
    const f0 = await S(page, 'S.frames'); await sleep(1200); const f1 = await S(page, 'S.frames');
    await setHidden(false); await sleep(1200); const f2 = await S(page, 'S.frames');
    assert(f1 === f0, 'frames kept running while hidden: ' + (f1 - f0)); assert(f2 > f1, 'frames did not resume');
    return 'frame loop stopped (0 frames in 1.2 s), resumed with ' + (f2 - f1) + ' frames';
  });

  await check('PWA: service worker installs and the shell loads offline', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => (await caches.keys()).some(k => k.startsWith('clasuke-')), null, { timeout: 20000 });
    const cached = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
    assert(cached.includes('/') && cached.some(u => /assets\/world-.*\.js/.test(u)) && cached.some(u => u.startsWith('/thumbs/')), 'precache is incomplete: ' + cached.length + ' entries');
    assert(!cached.some(u => u.endsWith('.mp4')), 'a video ended up in the cache');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForFunction(() => window.__studio && window.__studio.gl === 'on', null, { timeout: 60000 });
    assert(await page.locator('#btn-gen').isVisible(), 'app did not render offline');
    await ctx.setOffline(false); errors.length = 0; // offline video fetches are expected to fail
    return cached.length + ' files precached, no video; reload with the network off still starts 3D';
  });

  await check('still no console errors on desktop', async () => { assert(errors.length === 0, errors.join(' | ')); return '0 errors'; });
  await ctx.close();

  // ───────── phone ─────────
  const phone = await open({ width: 390, height: 844 });
  const mp = phone.page;
  await check('phone 390×844: no horizontal overflow', async () => {
    assert(await S(mp, 'S.gl') === 'on', '3D not active on the phone viewport');
    const measure = () => mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, wide: [...document.querySelectorAll('.app *')].filter(e => !e.closest('.frame') && e.getBoundingClientRect().right > innerWidth + .5).length }));
    await sleep(1200); await shot(mp, '10-phone-firstrun');
    let m = await measure(); assert(m.sw <= m.cw && m.wide === 0, 'overflow at start: ' + JSON.stringify(m));
    await mp.click('#fr-play'); await mp.waitForFunction(() => window.__studio.audio.playing);
    await mp.click('#btn-gen'); await sleep(1500); await shot(mp, '11-phone-3d-playing');
    for (const tab of ['env', 's3', 'style', 'songs', 'favs']) {
      await mp.click('#tab-' + tab); await sleep(150); m = await measure();
      assert(m.sw <= m.cw && m.wide === 0, 'overflow on tab ' + tab + ': ' + JSON.stringify(m));
    }
    await mp.click('#tab-s3'); await mp.click('.tile[data-kind="s3"][data-id="orb"]'); await sleep(300);
    assert(await S(mp, 'S.visual.s3') === 'orb', 'tile did not lock on the phone');
    await mp.locator('#tabs').scrollIntoViewIfNeeded(); await mp.evaluate(() => window.scrollBy(0, 330)); await sleep(1200);
    await shot(mp, '12-phone-browser');
    await mp.click('[data-lang="en"]'); m = await measure(); assert(m.sw <= m.cw && m.wide === 0, 'overflow in English: ' + JSON.stringify(m));
    await mp.click('[data-lang="es"]');
    await mp.evaluate(() => window.scrollTo(0, 0));
    await mp.click('[data-ar="9:16"]'); await mp.evaluate(() => window.scrollTo(0, 0));
    await mp.click('#btn-rec'); await mp.waitForSelector('#app.is-rec'); await sleep(1500); await shot(mp, '13-phone-recording');
    const [dl] = await Promise.all([mp.waitForEvent('download', { timeout: 30000 }), mp.click('#btn-rec')]);
    await dl.saveAs(join(TMP, 'phone-' + dl.suggestedFilename()));
    m = await measure(); assert(m.sw <= m.cw && m.wide === 0, 'overflow after recording: ' + JSON.stringify(m));
    assert(errors.length === 0, 'console errors: ' + errors.join(' | '));
    return 'scrollWidth ' + m.sw + ' = clientWidth ' + m.cw + ' on every tab, in both languages and while recording';
  });
  await phone.ctx.close();

  // ───────── no WebGL ─────────
  await check('2D fallback when WebGL is unavailable', async () => {
    const b2 = await chromium.launch({ args: ['--disable-gpu', '--disable-3d-apis'] });
    try {
      const p = await b2.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(BASE + '/'); await p.waitForFunction(() => window.__studio && window.__studio.gl !== 'loading', null, { timeout: 60000 });
      assert(await p.evaluate(() => window.__studio.gl) === 'off', 'expected gl=off');
      await p.waitForFunction(() => window.__studio.frames > 10);
      assert(await p.locator('#stage').isVisible() && await p.locator('#gl').isHidden(), '2D canvas should be showing');
      const lit = await p.evaluate(() => { const c = document.querySelector('#stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n; });
      assert(lit > 20, '2D canvas looks empty'); assert(errs.length === 0, errs.join(' | '));
      await p.click('#btn-gen'); await p.waitForTimeout(1200); await p.screenshot({ path: join(SHOTS, '14-desktop-2d-fallback.png') });
      return 'gl=off, Canvas2D renderer drawing, pickers disabled';
    } finally { await b2.close(); }
  });
} finally {
  await browser.close();
  if (server) server.kill();
}

const failed = results.filter(r => !r[0]).length;
console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed' + (failed ? ', ' + failed + ' FAILED' : ''));
console.log('screenshots: ' + SHOTS);
process.exit(failed ? 1 : 0);
