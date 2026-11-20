// Canvas2D side of a visual: draws the overlay families into an offscreen canvas (with trails, shake,
// zoom and mirroring). With WebGL that canvas becomes a texture; without it, present() composes the
// final picture by itself (flash, vignette, grain, tag): the 2D-only fallback.
import { A } from '../audio/analysis.js';
import { rgba } from './families2d.js';
import { DISPLAY_FONT, BODY_FONT } from './catalog.js';

export function createRenderer2D(outCanvas) {
  const layer = document.createElement('canvas'), g = layer.getContext('2d');
  let out = null, vign = null, noisePat = null, flash = 0;

  function ensureOut() {
    if (out) return out;
    out = outCanvas.getContext('2d', { alpha: false });
    const n = document.createElement('canvas'); n.width = n.height = 192;
    const x = n.getContext('2d'), im = x.createImageData(192, 192);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); noisePat = out.createPattern(n, 'repeat');
    return out;
  }

  return {
    layer, g,
    resize(w, h) { layer.width = w; layer.height = h; vign = null; },
    /** Wipes the layer: transparent when it sits over WebGL, the palette background otherwise. */
    clear(V, overGL) {
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setTransform(1, 0, 0, 1, 0, 0);
      if (overGL) g.clearRect(0, 0, layer.width, layer.height);
      else { g.fillStyle = V ? V.P.bg : '#07050a'; g.fillRect(0, 0, layer.width, layer.height); }
    },
    drawLayers(V, F, overGL) {
      const { W, H, M } = F;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      // fade what is already there: that is the trail
      if (overGL) { g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + (V.layers.length ? V.trail : 1) + ')'; }
      else { g.globalCompositeOperation = 'source-over'; g.fillStyle = rgba(V.P.bg, V.trail); }
      g.fillRect(0, 0, W, H);
      if (!V.layers.length) return;
      g.save();
      if (V.shake && A.beatPulse > .3) { const s = M * .012 * A.beatPulse * F.I; g.translate((Math.random() - .5) * s, (Math.random() - .5) * s); }
      const z = 1 + A.bass * V.zoom * F.I; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
      for (let i = 0; i < V.layers.length; i++) { const L = V.layers[i]; g.globalCompositeOperation = L.blend; g.globalAlpha = 1; L.f.draw(F); }
      g.restore();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      if (V.mirror !== 'none') {
        g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(layer, 0, 0, W / 2, H, 0, 0, W / 2, H); g.restore();
        if (V.mirror === 'quad') { g.save(); g.translate(0, H); g.scale(1, -1); g.drawImage(layer, 0, 0, W, H / 2, 0, 0, W, H / 2); g.restore(); }
      }
    },
    /** 2D-only output. */
    present(V, F, tag, title) {
      const o = ensureOut(), { W, H, M } = F, P = V.P;
      o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
      o.drawImage(layer, 0, 0);
      if (V.flash && A.beat && A.bass > .75) flash = .22 * F.I;
      if (flash > .005) { o.fillStyle = rgba(P.c[0], flash); o.fillRect(0, 0, W, H); flash *= Math.pow(.02, F.dt); }
      if (!vign) { vign = o.createRadialGradient(W / 2, H / 2, M * .3, W / 2, H / 2, Math.hypot(W, H) * .6); vign.addColorStop(0, 'rgba(0,0,0,0)'); vign.addColorStop(1, 'rgba(0,0,0,0.55)'); }
      o.fillStyle = vign; o.fillRect(0, 0, W, H);
      if (V.grain) { o.globalAlpha = .05; const ox = Math.random() * 192, oy = Math.random() * 192; o.save(); o.translate(-ox, -oy); o.fillStyle = noisePat; o.fillRect(0, 0, W + 192, H + 192); o.restore(); o.globalAlpha = 1; }
      if (tag) { // same layout as the WebGL tag in gl/world.js
        const M = F.M * (H > W ? 1.3 : 1), pad = M * .045; o.textBaseline = 'alphabetic';
        o.fillStyle = 'rgba(244,239,233,0.92)'; o.font = '800 ' + Math.round(M * .042) + 'px ' + DISPLAY_FONT; o.fillText('@clasuke', pad, H - pad);
        if (title) { o.fillStyle = 'rgba(244,239,233,0.66)'; o.font = '600 ' + Math.round(M * .022) + 'px ' + BODY_FONT; o.fillText(title, pad, H - pad - M * .058); }
      }
    },
  };
}
