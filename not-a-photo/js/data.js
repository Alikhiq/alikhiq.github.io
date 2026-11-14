/* The pictures.
 *
 * A picture is a list of 2D Gaussian blobs: a position, two radii, a rotation, a colour, a weight and a
 * depth each. It is drawn as the weighted average of every blob that reaches a pixel:
 *
 *     colour(p) = sum_i w_i k_i(p) c_i / sum_i w_i k_i(p)        k_i(p) = max(0, exp(-d2/2) - cut)
 *     alpha(p)  = 1 - exp(-sum_i w_i k_i(p) / tau)
 *
 * which is exactly what the training code (tools/fit.py) optimised. Each picture comes with the saved
 * stages of its own training run, from random noise to the finished thing.
 */
(function (global) {
  'use strict';

  var FLOATS = 10; // x, y, log s1, log s2, theta, r, g, b, w, z

  function decodeLook(name, meta, buf, man) {
    var levels = [], o = 0;
    var pad = man.posPad, lsMin = man.lsMin, lsRange = man.lsMax - man.lsMin;
    for (var li = 0; li < meta.levels.length; li++) {
      var n = meta.levels[li].n;
      var x = new Uint16Array(buf.slice(o, o + 2 * n)); o += 2 * n;
      var y = new Uint16Array(buf.slice(o, o + 2 * n)); o += 2 * n;
      var u8 = new Uint8Array(buf, o, 9 * n); o += 9 * n;
      var a = new Float32Array(n * FLOATS), born = new Uint8Array(n);
      for (var i = 0; i < n; i++) {
        var j = i * FLOATS;
        a[j] = (x[i] / 65535 * (1 + 2 * pad) - pad) * meta.W;
        a[j + 1] = (y[i] / 65535 * (1 + 2 * pad) - pad) * meta.H;
        a[j + 2] = u8[i] / 255 * lsRange + lsMin;
        a[j + 3] = u8[n + i] / 255 * lsRange + lsMin;
        a[j + 4] = u8[2 * n + i] / 256 * Math.PI;
        a[j + 5] = u8[3 * n + i] / 255;
        a[j + 6] = u8[4 * n + i] / 255;
        a[j + 7] = u8[5 * n + i] / 255;
        var w = u8[6 * n + i] / 255;
        a[j + 8] = w * w;
        a[j + 9] = u8[7 * n + i] / 255;
        born[i] = u8[8 * n + i];
      }
      levels.push({ n: n, a: a, born: born, step: meta.levels[li].step, loss: meta.levels[li].loss, psnr: meta.levels[li].psnr });
    }
    return {
      name: name, W: meta.W, H: meta.H, cut: meta.cut, face: meta.face, zPivot: meta.zPivot,
      levels: levels, last: levels.length - 1, maxN: levels[levels.length - 1].n, pairs: {}
    };
  }

  /* The two ends of the step from stage L to L+1, index aligned.
   * Blobs that exist in both are interpolated; blobs born on the way start invisible and small. */
  function pairFor(look, L) {
    if (look.pairs[L]) return look.pairs[L];
    var A = look.levels[L], B = look.levels[L + 1], n = B.n;
    var from = new Float32Array(n * FLOATS);
    for (var i = 0; i < n; i++) {
      var j = i * FLOATS, k;
      if (i < A.n && !B.born[i]) {
        for (k = 0; k < FLOATS; k++) from[j + k] = A.a[j + k];
        var d = B.a[j + 4] - A.a[j + 4];            // rotation: take the short way round
        d -= Math.PI * Math.round(d / Math.PI);
        from[j + 4] = B.a[j + 4] - d;
      } else {
        for (k = 0; k < FLOATS; k++) from[j + k] = B.a[j + k];
        from[j + 2] -= 1.0; from[j + 3] -= 1.0;     // starts small...
        from[j + 8] = 0;                            // ...and invisible
      }
    }
    var keys = Object.keys(look.pairs);              // keep at most 2 cached per picture
    if (keys.length > 1) delete look.pairs[keys[0]];
    return (look.pairs[L] = { from: from, to: B.a, n: n });
  }

  /* numbers for the read-out at a position on the training timeline (0 = noise ... last = finished) */
  function statsAt(look, pos) {
    var L = Math.min(look.last - 1, Math.max(0, Math.floor(pos))), t = Math.min(1, Math.max(0, pos - L));
    var A = look.levels[L], B = look.levels[L + 1];
    return {
      step: Math.round(A.step + (B.step - A.step) * t),
      loss: Math.exp(Math.log(A.loss) + (Math.log(B.loss) - Math.log(A.loss)) * t),
      blobs: Math.round(A.n + (B.n - A.n) * t)
    };
  }

  global.Blobs = { decodeLook: decodeLook, pairFor: pairFor, statsAt: statsAt, FLOATS: FLOATS };
})(window);
