// Renders the 3D-scene and style thumbnails for the browser rail with the real renderer.
//   1. npm run build && npm start          (in another terminal)
//   2. npm run thumbs                      (writes public/thumbs/s3-*.webp and style-*.webp)
//   3. npm run build                       (so the new pictures are in dist/)
// Needs Playwright with Chromium available to Node (it is not a dependency of the app).
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL_ = process.env.APP_URL || "http://127.0.0.1:3000/";
const OUT = fileURLToPath(new URL('../public/thumbs/', import.meta.url));
const SCENES = ['tunnel', 'orb', 'terrain', 'galaxy', 'shards', 'bars', 'knot'];
const STYLES = ['clean', 'neon', 'vhs', 'manga', 'noir', 'glitch', 'dream', 'pixel', 'thermal', 'kaleido', 'cel', 'crt'];
// which palette each scene is shot in (see PALETTES in src/visual/catalog.js)
const SCENE_PALETTE = { tunnel: 'Tormenta', orb: 'Carmesí', terrain: 'Sakura', galaxy: 'Rayo', shards: 'Hielo', bars: 'Tormenta', knot: 'Carmesí' };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(() => { localStorage.setItem('cs-tag', 'false'); localStorage.setItem('cs-seen', 'true'); });
await page.goto(URL_);
await page.waitForFunction(() => window.__studio && window.__studio.gl === 'on', null, { timeout: 60000 });

/** Finds a code whose seed gives this palette and no 2D layers, with the given locks applied. */
async function shoot(file, lock, palette, w, h, settle = 2200) {
  await page.evaluate(async ({ lock, palette }) => {
    const S = window.__studio;
    for (const k of ['env', 's3', 'style']) S.setLock(k, lock[k]);
    for (let n = 1000; n < 60000; n += 7) {
      S.load(n.toString(36));
      const v = S.visual;
      if (v.palette === palette && v.layers.length === 0) return;
    }
    throw new Error('no seed for ' + palette);
  }, { lock, palette });
  await page.waitForTimeout(settle);
  const data = await page.evaluate(([w, h]) => window.__studio.snapshot(w, h, 'image/webp'), [w, h]);
  writeFileSync(OUT + file, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', file);
}

for (const k of SCENES) await shoot('s3-' + k + '.webp', { env: 'plain', s3: k, style: 'clean' }, SCENE_PALETTE[k], 480, 360);
for (const k of STYLES) await shoot('style-' + k + '.webp', { env: 'h_shanghai', s3: 'knot', style: k }, 'Carmesí', 320, 320);
await browser.close();
