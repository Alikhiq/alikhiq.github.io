// node shoot.js [deck-prefix] : screenshots every .s slide of each deck to out/<deck>/NN.jpg (1080x1350)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const dir = path.join(__dirname, 'decks'); const only = process.argv[2] || '';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.html') && f.startsWith(only)).sort()) {
    await p.goto('file://' + path.join(dir, f), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const out = path.join(__dirname, 'out', f.replace('.html', '')); fs.mkdirSync(out, { recursive: true });
    const ss = await p.$$('section.s');
    for (let i = 0; i < ss.length; i++) await ss[i].screenshot({ path: path.join(out, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 93 });
    console.log(f, ss.length);
  }
  await b.close();
})();
