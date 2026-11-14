/* The hall: eight pictures standing in a row, a gate of blue neon round each, and one straight path
 * through all of them. How far you are from a picture is how far along its training it is: from the
 * far end of the hall it is still noise, by the time you reach it it is finished, and as you step
 * through it the blobs part around you. */
(function (global) {
  'use strict';

  var GAP = 16, START = 14, RAIL = 2.35;
  var PIECES = [
    { key: 'lean', name: 'THE TABLE', H: 4.8, y: 0, far: 13.6, near: 6.4 },
    { key: 'coffee', name: 'COFFEE RUN', H: 3.15, y: 0.28 },
    { key: 'pc', name: 'LAN NIGHT', H: 3.15, y: 0.28 },
    { key: 'arcade', name: 'HOME TABLE', H: 3.15, y: 0.28 },
    { key: 'shades', name: 'RED SHADES', H: 3.15, y: 0.28 },
    { key: 'leopard', name: 'LEOPARD PRINT', H: 3.15, y: 0.28 },
    { key: 'ghutra', name: 'WHITE GHUTRA', H: 3.15, y: 0.28 },
    { key: 'lake', name: 'THE LAKE', H: 6.2, y: 0, far: 26, near: 10, final: true }
  ];
  var STOP = 6.9;                                   // how far from the last picture the path ends
  var WOBBLE = [0.5, 0.09, 0.045, 0.02, 0.008, 0, 0];
  PIECES.forEach(function (p, i) {
    p.index = i; p.z = -(START + GAP * Math.min(i, PIECES.length - 2)) - (p.final ? 26 : 0);
    p.far = p.far || 13.5; p.near = p.near || 5.8; p.pos = 0; p.d = 99; p.look = null; p.x = 0; p.W = p.H * 0.75;
    p.last = 5; p.cut = !!p.y; p.faceY = p.y + p.H * 0.75; p.gateW = p.y ? 2.15 : p.W / 2 + 0.35; p.gateH = p.y ? 4.2 : p.H + 0.35;
  });
  var END = -PIECES[PIECES.length - 1].z - STOP;    // length of the path, in metres

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  /* size and place a picture from its entry in the manifest (the blobs themselves can arrive later, as p.look) */
  function attach(p, meta) {
    p.W = p.H * meta.W / meta.H; p.last = meta.levels.length - 1; p.cut = meta.cut;
    var f = meta.face;
    p.faceY = p.y + p.H * (1 - (f[1] + f[3]) / 2);
    p.x = meta.cut ? -((f[0] + f[2]) / 2 - 0.5) * p.W : 0;     // cut-outs stand with the face on the centre line
    p.gateW = meta.cut ? 2.15 : p.W / 2 + 0.35; p.gateH = meta.cut ? 4.2 : p.H + 0.35;
  }

  /* neon: a gate round every picture, and a bar of light on the floor beneath the floating ones */
  function lines() {
    var out = [], ranges = [];
    PIECES.forEach(function (p, i) {
      var w = p.gateW, h = p.gateH, z = p.z, blue = [0.2, 0.42, 1.0], first = out.length;
      out.push({ a: [-w, 0, z], b: [-w, h, z], color: blue, width: 0.032, group: i });
      out.push({ a: [w, 0, z], b: [w, h, z], color: blue, width: 0.032, group: i });
      out.push({ a: [-w, h, z], b: [w, h, z], color: blue, width: 0.032, group: i });
      if (p.y) out.push({ a: [-w * 0.62, 0.012, z], b: [w * 0.62, 0.012, z], color: [0.25, 0.85, 1.0], width: 0.02, group: i });
      else out.push({ a: [-w, 0.012, z], b: [w, 0.012, z], color: [0.2, 0.42, 1.0], width: 0.02, group: i });
      ranges.push([first, out.length - first]);
    });
    return { lines: out, ranges: ranges };
  }

  /* how fast the tour moves at path position s: it slows right down in front of each picture */
  function tourSpeed(s) {
    var z = -s, next = null, i;
    for (i = 0; i < PIECES.length; i++) if (PIECES[i].z < z - 0.05) { next = PIECES[i]; break; }
    if (!next) return 0;
    var d = z - next.z;
    if (next.final) return 2.7 * clamp((d - STOP) / 9, 0.04, 1);
    var dwell = smooth(10.2, 6.9, d) * (1 - smooth(3.4, 2.1, d));
    return 2.7 + (0.72 - 2.7) * dwell;
  }

  /* one frame: where the camera is, and what state every picture is in.  v: {s, yaw, pitch, shiftX, shiftY, time, aspect} */
  function frame(v) {
    var s = clamp(v.s, 0, END), z = -s, i, p;
    var edge = smooth(0, 6, s) * (1 - smooth(END - 14, END - 2, s));
    var eyeY = 2.05 + 1.0 * smooth(END - 22, END - 4, s);
    var aside = v.aspect > 1.2 ? smooth(END - 12, END, s) : 0;        // wide screens: the last picture moves right of centre, clear of the closing words
    var pos = [0.4 * Math.sin(s * 0.19) * edge - 1.25 * aside + v.shiftX, eyeY + 0.03 * Math.sin(v.time * 0.7) + v.shiftY, z];
    var next = null, current = null;
    for (i = 0; i < PIECES.length; i++) {
      p = PIECES[i]; p.d = z - p.z;
      if (p.d > 0.1 && !next) next = p;
    }
    current = next || PIECES[PIECES.length - 1];
    // look ahead down the hall, tipping up towards the face of whatever is coming
    var lookY = eyeY, lookX = 0;
    if (next) { var w = smooth(12, 5.5, next.d); lookY = eyeY + (next.faceY * 0.55 + (next.y + next.H * 0.5) * 0.45 - eyeY) * w * (next.final ? 1 : 0.8); lookX = pos[0] * 0.5 - 0.35 * aside; }
    var f = norm([lookX - pos[0], lookY - pos[1], -9]);
    var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    f = [f[0] * cy + f[2] * sy, f[1], -f[0] * sy + f[2] * cy];
    f = norm([f[0] * cp, f[1] * cp + sp, f[2] * cp]);
    var right = norm(cross(f, [0, 1, 0])), up = cross(right, f);
    var fov = (v.aspect >= 1 ? 52 : 52 + (1 - v.aspect) * 34) * Math.PI / 180;
    var cam = { pos: pos, fwd: f, right: right, up: up, fovY: fov };
    // pictures
    var glow = new Float32Array(10), lp = new Float32Array(32), lc = new Float32Array(32);
    for (i = 0; i < PIECES.length; i++) {
      p = PIECES[i];
      var last = p.last, d = p.d;
      p.pos = last * clamp((p.far - d) / (p.far - p.near), 0, 1);
      var raw = p.pos / last, L = Math.min(last, Math.floor(p.pos)), t = p.pos - L;
      p.cloud = (p.y ? 1.5 : 2.2) * clamp(1 - p.pos / 1.25, 0, 1);
      p.wobble = (WOBBLE[L] + (WOBBLE[L + 1] - WOBBLE[L]) * t) * (p.cut ? 1 : 0.5);
      var through = p.final ? 0 : smooth(2.9, 0.25, d);
      p.burst = through * through * 1.7; p.shrink = through;
      p.alpha = p.final ? 1 : clamp((d - 0.12) / 1.1, 0, 1);
      p.gain = Math.exp(-Math.max(0, d - 13) * 0.02);
      p.relief = 0.2 * p.W;
      p.time = v.time + i * 3.1;
      p.anchor = [p.x, p.y + (p.y ? 0.035 * Math.sin(v.time * 0.8 + i * 1.7) : 0), p.z];
      p.right = [1, 0, 0]; p.normal = [0, 0, 1];
      p.visible = d > 0.12 && d < 96;
      glow[i] = p.visible || d < -0.5 ? (0.5 + 1.0 * raw) * (0.9 + 0.1 * Math.sin(v.time * 2.3 + i)) : 0.5;
      if (d < 0.12 && d > -3) glow[i] = 1.6 * smooth(-3, 0.12, d) + 0.4;
      var c = p.avg || [0.3, 0.4, 1.0], k = (0.06 + 0.3 * raw) * p.alpha * (p.final ? 1.4 : 1);
      lp.set([p.x, 0, p.z + (p.final ? 1.4 : 0.9), p.final ? 4.2 : 2.3], i * 4);
      lc.set([c[0], c[1], c[2], k], i * 4);
    }
    return { cam: cam, glow: glow, lp: lp, lc: lc, current: current, s: s };
  }

  global.World = { PIECES: PIECES, END: END, RAIL: RAIL, attach: attach, lines: lines, tourSpeed: tourSpeed, frame: frame, clamp: clamp, smooth: smooth };
})(window);
