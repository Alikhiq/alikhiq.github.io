// Mo Tint location map: real OpenStreetMap geometry (© OpenStreetMap contributors, ODbL) drawn as a brand
// motion graphic — bay-black ground, steel buildings, galvanized streets, gold interstates, the shop lit gold
// with a dropping pin, landmark chips, and a long camera pull-back. Deterministic; classic script -> window.MTKMAP.
(function () {
  const W = 1080, H = 1920;
  const C = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = C(x); return x * x * (3 - 2 * x); };
  const outE = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * C(x)));
  const outBack = (x) => { x = C(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const ROAD = { // [color, width m, min px, z-order]
    svc: ['#2A2C27', 5, 0.8], min: ['#3B3D36', 8, 1.0], ter: ['#64665E', 10, 1.4], sec: ['#8E9088', 12, 1.8],
    pri: ['#B9BAB2', 14, 2.2], link: ['rgba(246,202,75,.55)', 9, 1.4], mw: ['#F6CA4B', 22, 3.0] };
  let D = null;
  async function load() { D = await (await fetch('/assets/mtk/map-trabue.json')).json();
    let sx = 0, sy = 0, n = 0; for (let i = 0; i < D.shop.length; i += 2) { sx += D.shop[i]; sy += D.shop[i + 1]; n++; } window.MTKMAP.shopC = [sx / n, sy / n]; }
  function create() {
    const cv = document.createElement('canvas'); const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.id = 'mapcv';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv, g };
  }
  // cam: {x, y (m, map centre), s (px per m), r (rad), sy (screen y of centre)}; a: animation state
  function render(M, cam, a) {
    const g = M.g; g.save(); g.clearRect(0, 0, W, H);
    g.fillStyle = '#0A0B09'; g.fillRect(0, 0, W, H);
    const cos = Math.cos(cam.r), sin = Math.sin(cam.r);
    const tx = (x, y) => { const dx = (x - cam.x) * cam.s, dy = (y - cam.y) * cam.s; return [W / 2 + dx * cos - dy * sin, cam.sy + dx * sin + dy * cos]; };
    g.save(); g.translate(W / 2, cam.sy); g.rotate(cam.r); g.scale(cam.s, cam.s); g.translate(-cam.x, -cam.y);
    const path = (f) => { g.beginPath(); g.moveTo(f[0], f[1]); for (let i = 2; i < f.length; i += 2) g.lineTo(f[i], f[i + 1]); };
    // parking + buildings
    g.globalAlpha = a.bld;
    g.fillStyle = 'rgba(48,51,46,.55)'; D.park.forEach((f) => { path(f); g.closePath(); g.fill(); });
    g.fillStyle = '#16180F'; g.strokeStyle = 'rgba(200,201,193,.22)'; g.lineWidth = 1 / cam.s;
    D.bld.forEach((f) => { path(f); g.closePath(); g.fill(); g.stroke(); });
    // roads, minor first
    g.lineCap = 'round'; g.lineJoin = 'round';
    ['svc', 'min', 'ter', 'sec', 'pri', 'link', 'mw'].forEach((k, i) => {
      const [col, wm, minpx] = ROAD[k]; g.globalAlpha = C(a.roads * 7 - i * 0.7);
      g.strokeStyle = col; g.lineWidth = Math.max(wm, minpx / cam.s);
      D.roads[k].forEach((f) => { path(f); g.stroke(); });
    });
    // the shop: gold, breathing glow
    g.globalAlpha = 1;
    if (D.shop) { const gl = 0.5 + 0.5 * Math.sin(a.t * 3.2);
      for (let k = 3; k >= 1; k--) { path(D.shop); g.closePath(); g.strokeStyle = `rgba(246,202,75,${(0.12 * gl * a.shop).toFixed(3)})`; g.lineWidth = (k * 7) / cam.s; g.stroke(); }
      path(D.shop); g.closePath(); g.fillStyle = `rgba(246,202,75,${(0.92 * a.shop).toFixed(3)})`; g.fill(); }
    g.restore();
    // pin + ripples at the shop
    const SC = window.MTKMAP.shopC || [0, 0]; const [px, py] = tx(SC[0], SC[1]);
    if (a.pin > 0) {
      for (let k = 0; k < 3; k++) { const ph = ((a.t * 0.8 + k / 3) % 1); g.strokeStyle = `rgba(246,202,75,${(0.55 * (1 - ph) * a.pin).toFixed(3)})`; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(px, py, 18 + ph * 90, (18 + ph * 90) * 0.55, 0, 0, 7); g.stroke(); }
      const drop = (1 - outBack(a.pin)) * -260, hy = py - 34 + drop;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(px, py + 2, 16 * a.pin, 6 * a.pin, 0, 0, 7); g.fill();
      g.fillStyle = '#F6CA4B'; g.beginPath(); g.moveTo(px, py + drop); g.bezierCurveTo(px - 30, hy + 18, px - 30, hy - 30, px, hy - 30); g.bezierCurveTo(px + 30, hy - 30, px + 30, hy + 18, px, py + drop); g.fill();
      g.fillStyle = '#0A0B09'; g.beginPath(); g.arc(px, hy - 6, 10, 0, 7); g.fill();
    }
    // labels
    g.textBaseline = 'middle';
    const chip = (x, y, text, al, o = {}) => { if (al <= 0.01) return; g.save(); g.globalAlpha = al; g.font = `600 ${o.fs || 24}px "IBM Plex Mono", monospace`;
      const sp = o.fs ? 0 : 3; const tw = g.measureText(text).width + sp * text.length; const bx = o.left ? Math.max(28, x - (tw + 32) - o.left) : x + (o.dx ?? 24), by = y + (o.dy ?? -40);
      g.strokeStyle = o.gold ? 'rgba(246,202,75,.9)' : 'rgba(200,201,193,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(o.left ? bx + tw + 32 : bx, by + 20); g.stroke();
      g.fillStyle = o.gold ? '#F6CA4B' : 'rgba(10,11,9,.88)'; g.fillRect(bx, by, tw + 32, 40); g.fillStyle = o.gold ? '#F6CA4B' : '#C8C9C1'; g.fillRect(bx, by, 5, 40);
      g.fillStyle = o.gold ? '#0A0B09' : '#F2EFE5'; let cx = bx + 18; for (const ch of text) { g.fillText(ch, cx, by + 21); cx += g.measureText(ch).width + sp; }
      g.fillStyle = o.gold ? '#0A0B09' : '#C8C9C1'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.restore(); };
    const road = (key, al) => { const L = D.lbl[key]; if (!L || al <= 0.01) return; const [x, y] = tx(L[0], L[1]);
      g.save(); g.globalAlpha = al; g.translate(x, y); g.rotate((L[2] * Math.PI) / 180 + cam.r); g.font = '600 22px "IBM Plex Mono", monospace';
      const isMw = key.startsWith('I-'); g.fillStyle = isMw ? '#F6CA4B' : '#E4E2D8'; g.strokeStyle = 'rgba(10,11,9,.9)'; g.lineWidth = 6;
      let w = 0; for (const ch of key) w += g.measureText(ch).width + 4; let cx = -w / 2;
      for (const ch of key) { g.strokeText(ch, cx, -14); g.fillText(ch, cx, -14); cx += g.measureText(ch).width + 4; } g.restore(); };
    const P = D.poi; const at = (k) => tx(P[k][0], P[k][1]);
    if (P.enterprise) { const [x, y] = at('enterprise'); chip(x, y, 'ENTERPRISE', a.ent, { dx: -250, dy: 50 }); }
    road('TRABUE RD', a.trabue);
    if (P.walmart) { const [x, y] = at('walmart'); chip(x, y, 'WALMART SUPERCENTER', a.wal, { left: 30, dy: -100 }); }
    if (P.ups) { const [x, y] = at('ups'); chip(x, y, 'UPS COLUMBUS HUB', a.ups, { dx: -330, dy: 60 }); }
    road('I-70', a.mw); road('I-270', a.mw); road('HILLIARD-ROME RD', a.mw * 0.8);
    if (a.pin > 0.6) chip(px, py - 70, 'MO TINT', C((a.pin - 0.6) / 0.3), { gold: true, dx: 40, dy: -120, fs: 30 });
    // grade: dark top + bottom bands for the type, vignette, attribution
    let gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, 'rgba(10,11,9,.96)'); gr.addColorStop(0.62, 'rgba(10,11,9,.7)'); gr.addColorStop(1, 'rgba(10,11,9,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, 640);
    gr = g.createLinearGradient(0, H - 420, 0, H); gr.addColorStop(0, 'rgba(10,11,9,0)'); gr.addColorStop(1, 'rgba(10,11,9,.95)'); g.fillStyle = gr; g.fillRect(0, H - 420, W, 420);
    gr = g.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.55; g.fillStyle = '#C8C9C1'; g.font = '400 16px "IBM Plex Mono", monospace'; g.textAlign = 'right'; g.fillText('© OpenStreetMap contributors', W - 28, H - 24); g.textAlign = 'left';
    g.restore();
  }
  window.MTKMAP = { load, create, render };
})();
