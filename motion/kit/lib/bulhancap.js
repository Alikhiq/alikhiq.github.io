// node lib/bulhancap.js <outdir> [fps=24] [from=0] [to=300] [workers=4] | --stills t1,t2,...
// Captures bulhan.html (1280x720) by calling window.seek(t) for each frame. Needs a static server at the repo root on :8822.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'http://127.0.0.1:8822/motion/kit/' + (process.env.PAGE || 'bulhan.html');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const open = async () => { const p = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(URL); await p.waitForFunction('window.READY'); await p.waitForTimeout(800); return p; };
  if (process.argv[3] === '--stills') {
    const p = await open();
    for (const t of process.argv[4].split(',')) { await p.evaluate(x => seek(x), +t); await p.screenshot({ path: path.join(out, `s${String(t).padStart(5, '0')}.jpg`), quality: 80 }); }
  } else {
    const fps = +(process.argv[3] || 24), from = +(process.argv[4] || 0), to = +(process.argv[5] || 300), nw = +(process.argv[6] || 4);
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps); let next = f0;
    await Promise.all([...Array(nw)].map(async () => { const p = await open();
      while (next < f1) { const f = next++; await p.evaluate(x => seek(x), f / fps); await p.screenshot({ path: path.join(out, String(f).padStart(5, '0') + '.jpg'), quality: 93 }); } }));
  }
  await browser.close();
})();
