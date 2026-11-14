/* The room and the table, drawn in code: a camera looking down the table from the player's end. */
(function (global) {
  'use strict';
  var T = Hockey.T;
  var CAM = { phi: 52 * Math.PI / 180, hz: 1.9, dy: 0.55 };
  var CP = Math.cos(CAM.phi), SP = Math.sin(CAM.phi);
  var COL = {
    rail: '#d9ff3d', railDark: '#93b81c', railGlow: 'rgba(200,255,40,', surfFar: '#0d0d86', surfNear: '#2323ee',
    line: 'rgba(196,190,255,', puck: '#ff4f9a', puckTop: '#ffc2dc', real: '#ff8a1f', realTop: '#ffd09a',
    code: '#4fe3ff', codeTop: '#d6f8ff'
  };

  function Table() {
    this.F = 1; this.cx = 0; this.cy = 0; this.scene = null; this.dpr = 1;
    this.stat = document.createElement('canvas');
    this.parts = []; this.rings = []; this.trail = [];
    this.goalGlow = { me: 0, ai: 0 };
  }

  Table.prototype.layout = function (view, scene, dpr, safeBottom) {
    this.view = view; this.scene = scene; this.dpr = dpr;
    var zn = CAM.dy * CP + CAM.hz * SP, ynr = (CAM.dy * SP - CAM.hz * CP) / zn;
    this.F = 0.9 * scene.w * zn;
    this.cx = scene.x + scene.w / 2;
    var nearY = scene.y + scene.h - Math.max(0.135 * scene.w, safeBottom + 0.1 * scene.w);
    this.cy = nearY + this.F * ynr;
    this.nearY = nearY;
    this.farY = this.proj(0, T.L, 0)[1];
    this.railTopY = this.proj(0, T.L + T.railW, T.railH)[1];
    this.stat.width = Math.round(view.w * dpr); this.stat.height = Math.round(view.h * dpr);
    this._static();
  };

  /* world (X across, Y down the table, Z up) -> screen px, plus px-per-unit scale at that depth */
  Table.prototype.proj = function (X, Y, Z) {
    var vy = Y + CAM.dy, vz = Z - CAM.hz;
    var zc = vy * CP - vz * SP, yc = vy * SP + vz * CP, s = this.F / zc;
    return [this.cx + X * s, this.cy - yc * s, s];
  };
  /* screen px -> point on the table surface */
  Table.prototype.unproj = function (sx, sy) {
    var a = (sx - this.cx) / this.F, b = -(sy - this.cy) / this.F, den = SP - b * CP;
    if (den < 0.05) den = 0.05;
    var t = CAM.hz / den;
    return [t * a, -CAM.dy + t * (b * SP + CP)];
  };

  Table.prototype._poly = function (c, pts) {
    c.beginPath();
    for (var i = 0; i < pts.length; i++) { var p = this.proj(pts[i][0], pts[i][1], pts[i][2] || 0); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
    c.closePath();
  };
  Table.prototype._line = function (c, a, b) {
    var p = this.proj(a[0], a[1], a[2] || 0), q = this.proj(b[0], b[1], b[2] || 0);
    c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
  };
  Table.prototype._arc = function (c, X, Y, r, a0, a1, Z) {
    c.beginPath();
    var n = 40;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * i / n, p = this.proj(X + Math.cos(a) * r, Y + Math.sin(a) * r, Z || 0);
      if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]);
    }
  };

  // ------------------------------------------------------------------ static layer (rebuilt on resize)
  Table.prototype._static = function () {
    var c = this.stat.getContext('2d'), d = this.dpr, self = this, hw = T.W / 2, L = T.L, rw = T.railW, rh = T.railH, g = T.goalW / 2;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, this.view.w, this.view.h);
    var u = this.scene.w / 400;                       // 1 "design pixel"
    var i, p, q;

    // cabinet front, below the near rail
    var bl = this.proj(-hw - rw, -rw, 0), br = this.proj(hw + rw, -rw, 0), bl2 = this.proj(-hw - rw, -rw, -0.42), br2 = this.proj(hw + rw, -rw, -0.42);
    var grd = c.createLinearGradient(0, bl[1], 0, this.view.h);
    grd.addColorStop(0, '#11123f'); grd.addColorStop(1, '#05051a');
    c.fillStyle = grd; c.beginPath(); c.moveTo(bl[0], bl[1]); c.lineTo(br[0], br[1]); c.lineTo(br2[0], this.view.h + 4); c.lineTo(bl2[0], this.view.h + 4); c.closePath(); c.fill();
    c.save(); c.clip();
    var rnd = mulberry(7);
    for (i = 0; i < 7; i++) {                         // spark bursts on the cabinet
      var bx = bl[0] + (br[0] - bl[0]) * (0.08 + 0.84 * rnd()), by = bl[1] + (this.view.h - bl[1]) * (0.25 + 0.7 * rnd()), rr = (18 + rnd() * 30) * u;
      for (var k = 0; k < 16; k++) {
        var an = rnd() * 6.283, l0 = rr * (0.15 + rnd() * 0.3), l1 = rr * (0.6 + rnd() * 0.6);
        c.strokeStyle = rnd() < 0.5 ? 'rgba(255,150,30,0.75)' : 'rgba(220,255,60,0.7)'; c.lineWidth = (0.8 + rnd() * 1.4) * u;
        c.beginPath(); c.moveTo(bx + Math.cos(an) * l0, by + Math.sin(an) * l0); c.lineTo(bx + Math.cos(an) * l1, by + Math.sin(an) * l1); c.stroke();
      }
    }
    for (i = 0; i < 260; i++) { c.fillStyle = 'rgba(190,200,255,' + (0.1 + rnd() * 0.35) + ')'; c.fillRect(bl[0] + (br[0] - bl[0]) * rnd(), bl[1] + (this.view.h - bl[1]) * rnd(), (0.6 + rnd() * 1.6) * u, (0.6 + rnd() * 1.2) * u); }
    c.restore();

    // playing surface
    var top = this.proj(0, L, 0)[1], bot = this.proj(0, 0, 0)[1];
    grd = c.createLinearGradient(0, top, 0, bot);
    grd.addColorStop(0, COL.surfFar); grd.addColorStop(0.55, '#1a1acb'); grd.addColorStop(1, COL.surfNear);
    c.fillStyle = grd; this._poly(c, [[-hw, 0], [hw, 0], [hw, L], [-hw, L]]); c.fill();
    c.save(); this._poly(c, [[-hw, 0], [hw, 0], [hw, L], [-hw, L]]); c.clip();
    var mid = this.proj(0, L * 0.42, 0);
    grd = c.createRadialGradient(mid[0], mid[1], 0, mid[0], mid[1], this.scene.w * 0.55);
    grd.addColorStop(0, 'rgba(120,120,255,0.38)'); grd.addColorStop(1, 'rgba(60,60,255,0)');
    c.fillStyle = grd; c.fillRect(0, top, this.view.w, bot - top);
    c.fillStyle = 'rgba(10,10,60,0.55)';              // air holes
    for (var gy = 0.045; gy < L; gy += 0.06) for (var gx = -hw + 0.04; gx < hw; gx += 0.06) {
      p = this.proj(gx, gy, 0); c.beginPath(); c.ellipse(p[0], p[1], 0.0042 * p[2], 0.0027 * p[2], 0, 0, 6.283); c.fill();
    }
    // markings
    c.lineCap = 'round';
    function glowStroke(w, a) { c.strokeStyle = COL.line + (a * 0.35) + ')'; c.lineWidth = w * 3.2; c.stroke(); c.strokeStyle = COL.line + a + ')'; c.lineWidth = w; c.stroke(); }
    this._line(c, [-hw, L / 2], [hw, L / 2]); glowStroke(2.2 * u, 0.75);
    this._arc(c, 0, L / 2, 0.2, 0, 6.2832); glowStroke(2 * u, 0.7);
    this._arc(c, 0, 0, 0.3, 0, Math.PI); glowStroke(1.8 * u, 0.6);
    this._arc(c, 0, L, 0.3, Math.PI, 2 * Math.PI); glowStroke(1.6 * u, 0.6);
    p = this.proj(0, L / 2, 0); c.fillStyle = COL.line + '0.8)'; c.beginPath(); c.ellipse(p[0], p[1], 0.014 * p[2], 0.009 * p[2], 0, 0, 6.283); c.fill();
    // big faint letters on each half
    c.restore();

    // rails -------------------------------------------------------------
    function face(pts, fill) { self._poly(c, pts); c.fillStyle = fill; c.fill(); }
    // inner walls (side + far), darker
    face([[-hw, 0, 0], [-hw, L, 0], [-hw, L, rh], [-hw, 0, rh]], COL.railDark);
    face([[hw, 0, 0], [hw, L, 0], [hw, L, rh], [hw, 0, rh]], COL.railDark);
    face([[-hw, L, 0], [-g, L, 0], [-g, L, rh], [-hw, L, rh]], '#a9d323');
    face([[g, L, 0], [hw, L, 0], [hw, L, rh], [g, L, rh]], '#a9d323');
    face([[-g, L, 0], [g, L, 0], [g, L, rh], [-g, L, rh]], '#030312');        // far goal mouth
    // tops
    c.shadowColor = 'rgba(205,255,50,0.9)'; c.shadowBlur = 16 * u;
    face([[-hw - rw, -rw, rh], [-hw, -rw, rh], [-hw, L + rw, rh], [-hw - rw, L + rw, rh]], COL.rail);
    face([[hw, -rw, rh], [hw + rw, -rw, rh], [hw + rw, L + rw, rh], [hw, L + rw, rh]], COL.rail);
    face([[-hw, L, rh], [-g, L, rh], [-g, L + rw, rh], [-hw, L + rw, rh]], COL.rail);
    face([[g, L, rh], [hw, L, rh], [hw, L + rw, rh], [g, L + rw, rh]], COL.rail);
    face([[-hw, -rw, rh], [-g, -rw, rh], [-g, 0, rh], [-hw, 0, rh]], COL.rail);
    face([[g, -rw, rh], [hw, -rw, rh], [hw, 0, rh], [g, 0, rh]], COL.rail);
    c.shadowBlur = 0;
    // near rail front face
    face([[-hw - rw, -rw, 0], [-g, -rw, 0], [-g, -rw, rh], [-hw - rw, -rw, rh]], '#b7e02a');
    face([[g, -rw, 0], [hw + rw, -rw, 0], [hw + rw, -rw, rh], [g, -rw, rh]], '#b7e02a');
    // goal slots: dark, with a lit lip
    face([[-g, L, rh], [g, L, rh], [g, L + rw, rh], [-g, L + rw, rh]], '#0a0a22');
    face([[-g, -rw, rh], [g, -rw, rh], [g, 0, rh], [-g, 0, rh]], '#07071c');
    face([[-g, -rw, 0], [g, -rw, 0], [g, -rw, rh], [-g, -rw, rh]], '#04040f');
    c.lineWidth = 1.6 * u; c.strokeStyle = COL.code; c.shadowColor = COL.code; c.shadowBlur = 10 * u;
    this._line(c, [-g, L, 0.002], [g, L, 0.002]); c.stroke();
    c.strokeStyle = COL.real; c.shadowColor = COL.real;
    this._line(c, [-g, 0, 0.002], [g, 0, 0.002]); c.stroke();
    c.shadowBlur = 0;
    // angled rails across the four corners
    var cc = T.corner;
    [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(function (k) {
      var sx = k[0], far = k[1], wy = far ? L : 0, iy = far ? L - cc : cc, ox = sx * hw, ix = sx * (hw - cc);
      if (far) face([[ix, wy, 0], [ox, iy, 0], [ox, iy, rh], [ix, wy, rh]], '#a9d323');           // inner wall, seen from the player's end
      c.shadowColor = 'rgba(205,255,50,0.9)'; c.shadowBlur = 8 * u;
      face([[ix, wy, rh], [ox, iy, rh], [ox, wy, rh]], COL.rail);
      c.shadowBlur = 0;
    });
    // highlight along rail tops
    c.strokeStyle = 'rgba(255,255,220,0.55)'; c.lineWidth = 1 * u;
    this._line(c, [-hw - rw * 0.5, -rw, rh], [-hw - rw * 0.5, L + rw, rh]); c.stroke();
    this._line(c, [hw + rw * 0.5, -rw, rh], [hw + rw * 0.5, L + rw, rh]); c.stroke();
  };

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ------------------------------------------------------------------ the room behind
  Table.prototype.backdrop = function (canvas) {
    var c = canvas.getContext('2d'), d = this.dpr, vw = this.view.w, vh = this.view.h, sc = this.scene, u = sc.w / 400;
    c.setTransform(d, 0, 0, d, 0, 0);
    var floorY = this.proj(0, T.L + 0.9, -0.42)[1];
    var grd = c.createLinearGradient(0, 0, 0, vh);
    grd.addColorStop(0, '#0c0d13'); grd.addColorStop(0.5, '#15171f'); grd.addColorStop(1, '#0a0b12');
    c.fillStyle = grd; c.fillRect(0, 0, vw, vh);
    // painted block wall
    var bh = 30 * u, bw = 64 * u, row = 0, x, y;
    c.strokeStyle = 'rgba(0,0,0,0.42)'; c.lineWidth = 1.2 * u;
    for (y = floorY % bh - bh; y < floorY; y += bh, row++) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(vw, y); c.stroke();
      for (x = this.cx % bw - bw + (row % 2 ? bw / 2 : 0); x < vw; x += bw) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + bh); c.stroke(); }
    }
    c.strokeStyle = 'rgba(255,255,255,0.028)';
    for (y = floorY % bh - bh + 1.5 * u; y < floorY; y += bh) { c.beginPath(); c.moveTo(0, y); c.lineTo(vw, y); c.stroke(); }
    // teal wall on the right, like the real room
    var tx = Math.min(vw, sc.x + sc.w * 1.06);
    if (tx < vw) { grd = c.createLinearGradient(tx, 0, vw, 0); grd.addColorStop(0, '#0b4d78'); grd.addColorStop(1, '#083656'); c.fillStyle = grd; c.fillRect(tx, 0, vw - tx, floorY); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(tx, 0, 3 * u, floorY); }
    // two neon tubes
    var tubeTop = Math.max(sc.y + 0.2 * sc.w, 0), tubeH = Math.max(40, this.farY - tubeTop - 0.04 * sc.w), tw = 0.085 * sc.w;
    for (var s = -1; s <= 1; s += 2) {
      var txc = this.cx + s * sc.w * 0.36;
      grd = c.createRadialGradient(txc, tubeTop + tubeH / 2, 0, txc, tubeTop + tubeH / 2, tubeH * 0.75);
      grd.addColorStop(0, 'rgba(40,90,255,0.42)'); grd.addColorStop(1, 'rgba(40,90,255,0)');
      c.fillStyle = grd; c.fillRect(txc - tubeH, tubeTop - tubeH * 0.4, tubeH * 2, tubeH * 1.8);
      c.lineJoin = 'round';
      c.shadowColor = '#3b7bff'; c.shadowBlur = 22 * u; c.strokeStyle = '#3f86ff'; c.lineWidth = 5 * u;
      rrect(c, txc - tw / 2, tubeTop, tw, tubeH, tw * 0.3); c.stroke();
      c.shadowBlur = 6 * u; c.strokeStyle = '#cfe4ff'; c.lineWidth = 1.6 * u;
      rrect(c, txc - tw / 2, tubeTop, tw, tubeH, tw * 0.3); c.stroke();
      c.shadowBlur = 0;
    }
    // floor: carpet lit blue from under the table
    grd = c.createLinearGradient(0, floorY, 0, vh);
    grd.addColorStop(0, '#0a0b2e'); grd.addColorStop(1, '#101070');
    c.fillStyle = grd; c.fillRect(0, floorY, vw, vh - floorY);
    grd = c.createRadialGradient(this.cx, this.nearY, 0, this.cx, this.nearY, sc.w * 1.1);
    grd.addColorStop(0, 'rgba(50,60,255,0.55)'); grd.addColorStop(1, 'rgba(30,30,200,0)');
    c.fillStyle = grd; c.fillRect(0, floorY, vw, vh - floorY);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, floorY - 2 * u, vw, 3 * u);
    // vignette
    grd = c.createRadialGradient(this.cx, vh * 0.45, sc.w * 0.3, this.cx, vh * 0.5, Math.max(vw, vh) * 0.8);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.62)');
    c.fillStyle = grd; c.fillRect(0, 0, vw, vh);
  };
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // ------------------------------------------------------------------ effects
  Table.prototype.spark = function (X, Y, n, color, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = (0.3 + Math.random()) * (power || 1);
      this.parts.push({ x: X, y: Y, z: 0.02, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.4 + Math.random() * 1.4 * (power || 1), life: 0.35 + Math.random() * 0.4, t: 0, color: color });
    }
    if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
  };
  Table.prototype.ring = function (X, Y, color) { this.rings.push({ x: X, y: Y, t: 0, color: color }); };

  Table.prototype.update = function (dt, sim) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i]; p.t += dt;
      if (p.t > p.life) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 4.5 * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.4; }
    }
    for (i = this.rings.length - 1; i >= 0; i--) { this.rings[i].t += dt; if (this.rings[i].t > 0.7) this.rings.splice(i, 1); }
    this.goalGlow.me = Math.max(0, this.goalGlow.me - dt * 1.2); this.goalGlow.ai = Math.max(0, this.goalGlow.ai - dt * 1.2);
    if (sim && sim.live) {
      var sp = Math.hypot(sim.puck.vx, sim.puck.vy);
      this.trail.push({ x: sim.puck.x, y: sim.puck.y, a: Math.min(1, sp / 2) });
      if (this.trail.length > 9) this.trail.shift();
    } else if (this.trail.length) this.trail.shift();
  };

  Table.prototype._disc = function (c, X, Y, r, z0, z1, side, top) {
    var a = this.proj(X, Y, z0), b = this.proj(X, Y, z1);
    var up = this.proj(X, Y + r, z0)[1], dn = this.proj(X, Y - r, z0)[1];
    var rx0 = r * a[2], ry0 = (dn - up) / 2, rx1 = r * b[2], ry1 = ry0 * b[2] / a[2];
    c.fillStyle = side;
    c.beginPath(); c.ellipse(a[0], a[1], rx0, ry0, 0, 0, Math.PI); c.lineTo(b[0] - rx1, b[1]); c.ellipse(b[0], b[1], rx1, ry1, 0, Math.PI, 0, true); c.closePath(); c.fill();
    c.fillStyle = top; c.beginPath(); c.ellipse(b[0], b[1], rx1, ry1, 0, 0, 6.2832); c.fill();
    return [b[0], b[1], rx1, ry1];
  };
  Table.prototype._glow = function (c, X, Y, r, color, alpha) {
    var p = this.proj(X, Y, 0), up = this.proj(X, Y + r, 0)[1], dn = this.proj(X, Y - r, 0)[1], rx = r * p[2], ry = (dn - up) / 2;
    c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, rx * 0.3, 0, 0, rx);
    g.addColorStop(0, color + alpha + ')'); g.addColorStop(1, color + '0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 6.2832); c.fill(); c.restore();
  };
  Table.prototype._mallet = function (c, m, col, colTop, glow) {
    this._glow(c, m.x, m.y, T.rm * 2.1, glow, 0.5);
    c.fillStyle = 'rgba(0,0,30,0.45)'; var s = this.proj(m.x + 0.012, m.y - 0.012, 0);
    c.beginPath(); c.ellipse(s[0], s[1], T.rm * s[2] * 1.03, T.rm * s[2] * 0.66, 0, 0, 6.2832); c.fill();
    var t = this._disc(c, m.x, m.y, T.rm, 0, 0.03, col, colTop);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = Math.max(1, t[2] * 0.06);
    c.beginPath(); c.ellipse(t[0], t[1], t[2] * 0.82, t[3] * 0.82, 0, 0, 6.2832); c.stroke();
    var k = this._disc(c, m.x, m.y, T.rm * 0.46, 0.03, 0.085, col, colTop);
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(k[0] - k[2] * 0.25, k[1] - k[3] * 0.3, k[2] * 0.3, k[3] * 0.28, 0, 0, 6.2832); c.fill();
  };

  /* everything that moves; o: {sim, time, showPuck, holo (0..1 strength of the projector glow), serve (0..1)} */
  Table.prototype.draw = function (canvas, o) {
    var c = canvas.getContext('2d'), d = this.dpr, sim = o.sim, i, p, u = this.scene.w / 400;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(this.stat, 0, 0);
    c.setTransform(d, 0, 0, d, 0, 0);
    var hw = T.W / 2, g = T.goalW / 2;

    // projector light where the code stands
    if (o.holo > 0) {
      var a = this.proj(-hw - T.railW, T.L + T.railW, T.railH), b = this.proj(hw + T.railW, T.L + T.railW, T.railH);
      var mx = (a[0] + b[0]) / 2, rx = (b[0] - a[0]) * 0.62, ry = 0.2 * this.scene.w, pulse = 0.85 + 0.15 * Math.sin(o.time * 3.1);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.translate(mx, a[1]); c.scale(1, ry / rx);
      var gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, 'rgba(90,215,255,' + (0.42 * o.holo * pulse) + ')'); gr.addColorStop(0.5, 'rgba(70,150,255,' + (0.14 * o.holo) + ')'); gr.addColorStop(1, 'rgba(70,150,255,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, rx, Math.PI, 2 * Math.PI); c.closePath(); c.fill();
      c.restore();
      c.strokeStyle = 'rgba(190,245,255,' + (0.9 * o.holo) + ')'; c.lineWidth = 2 * u; c.shadowColor = COL.code; c.shadowBlur = 12 * u;
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.shadowBlur = 0;
    }
    // goal flashes
    var gl = this.goalGlow;
    if (gl.me > 0 || gl.ai > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      if (gl.me > 0) { c.fillStyle = 'rgba(255,150,40,' + gl.me * 0.55 + ')'; this._poly(c, [[-hw, T.L / 2], [hw, T.L / 2], [hw, T.L], [-hw, T.L]]); c.fill(); }
      if (gl.ai > 0) { c.fillStyle = 'rgba(80,230,255,' + gl.ai * 0.5 + ')'; this._poly(c, [[-hw, 0], [hw, 0], [hw, T.L / 2], [-hw, T.L / 2]]); c.fill(); }
      c.restore();
    }
    for (i = 0; i < this.rings.length; i++) {
      var r = this.rings[i], k = r.t / 0.7;
      c.strokeStyle = r.color + (1 - k) * 0.9 + ')'; c.lineWidth = (4 - 3 * k) * u;
      this._arc(c, r.x, r.y, 0.05 + k * 0.45, 0, 6.2832); c.stroke();
    }
    if (!sim) return;
    // draw order: far things first
    var items = [{ y: sim.ai.y, k: 'ai' }, { y: sim.me.y, k: 'me' }];
    if (o.showPuck) items.push({ y: sim.puck.y, k: 'puck' });
    items.sort(function (x, y) { return y.y - x.y; });
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.k === 'ai') { c.globalAlpha = o.aiAlpha == null ? 1 : o.aiAlpha; this._mallet(c, sim.ai, COL.code, COL.codeTop, 'rgba(80,230,255,'); c.globalAlpha = 1; }
      else if (it.k === 'me') this._mallet(c, sim.me, COL.real, COL.realTop, 'rgba(255,140,40,');
      else {
        for (var j = 0; j < this.trail.length; j++) {
          var tr = this.trail[j], f = (j + 1) / this.trail.length;
          this._glow(c, tr.x, tr.y, T.rp * (0.6 + 0.5 * f), 'rgba(255,80,160,', 0.5 * f * tr.a);
        }
        var pk = sim.puck;
        this._glow(c, pk.x, pk.y, T.rp * 2.4, 'rgba(255,80,160,', 0.6);
        var t = this._disc(c, pk.x, pk.y, T.rp, 0, 0.014, '#d92c75', COL.puck);
        c.fillStyle = COL.puckTop; c.beginPath(); c.ellipse(t[0], t[1], t[2] * 0.55, t[3] * 0.55, 0, 0, 6.2832); c.fill();
        if (o.serve > 0) {                              // "your serve" pulse
          c.strokeStyle = 'rgba(255,255,255,' + (0.7 * o.serve) + ')'; c.lineWidth = 2 * u;
          this._arc(c, pk.x, pk.y, T.rp * (1.6 + 0.6 * Math.sin(o.time * 6)), 0, 6.2832); c.stroke();
        }
      }
    }
    // sparks
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i]; var q = this.proj(p.x, p.y, p.z), al = 1 - p.t / p.life;
      c.fillStyle = p.color + al + ')'; var sz = Math.max(1, 0.008 * q[2] * (0.5 + al));
      c.beginPath(); c.arc(q[0], q[1], sz, 0, 6.2832); c.fill();
    }
    c.restore();
  };

  global.Table = Table; global.TableColors = COL;
})(window);
