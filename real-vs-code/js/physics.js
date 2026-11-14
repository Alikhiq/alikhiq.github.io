/* Air hockey: the table, the puck, two mallets and the opponent's brain.
 * Table units: width = 1, length = L. The player defends y = 0, the code defends y = L. */
(function (global) {
  'use strict';

  var T = { W: 1.0, L: 1.8, rp: 0.042, rm: 0.07, goalW: 0.44, railH: 0.034, railW: 0.05, maxPuck: 3.1, corner: 0.13 };   // corner: size of the angled rail across each corner

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function gauss() { var u = 0, v = 0; while (u === 0) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

  function Sim() {
    this.puck = { x: 0, y: 0.5, vx: 0, vy: 0, spin: 0 };
    this.me = { x: 0, y: 0.2, vx: 0, vy: 0, tx: 0, ty: 0.2, max: 14 };
    this.ai = { x: 0, y: T.L - 0.2, vx: 0, vy: 0, tx: 0, ty: T.L - 0.2, max: 2 };
    this.live = false; this.events = []; this.lastTouch = null; this.sinceTouch = 0;
  }
  Sim.prototype.reset = function (server) {             // server: 'me' | 'ai'
    var p = this.puck;
    p.x = 0; p.y = server === 'ai' ? T.L * 0.5 + 0.34 : T.L * 0.5 - 0.34; p.vx = 0; p.vy = 0;
    this.ai.x = 0; this.ai.y = T.L - 0.2; this.ai.tx = 0; this.ai.ty = T.L - 0.2; this.ai.vx = this.ai.vy = 0;
    this.lastTouch = null; this.sinceTouch = 0;
  };
  Sim.prototype.limit = function (m, isMe) {
    m.tx = clamp(m.tx, -T.W / 2 + T.rm, T.W / 2 - T.rm);
    m.ty = isMe ? clamp(m.ty, T.rm, T.L / 2 - T.rm) : clamp(m.ty, T.L / 2 + T.rm, T.L - T.rm);
    // keep the mallet off the angled corner rails of its own end
    var dx = T.W / 2 - Math.abs(m.tx), dy = isMe ? m.ty : T.L - m.ty, need = T.corner + 1.4142 * T.rm, lack = need - (dx + dy);
    if (lack > 0) { m.tx -= (m.tx < 0 ? -1 : 1) * lack / 2; m.ty += (isMe ? 1 : -1) * lack / 2; }
  };
  Sim.prototype._mallet = function (m, h) {
    var dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), st = m.max * h, nx, ny;
    if (d <= st || d < 1e-9) { nx = m.tx; ny = m.ty; } else { nx = m.x + dx / d * st; ny = m.y + dy / d * st; }
    var vx = (nx - m.x) / h, vy = (ny - m.y) / h;
    m.vx += (vx - m.vx) * 0.5; m.vy += (vy - m.vy) * 0.5;
    m.x = nx; m.y = ny;
  };
  Sim.prototype._collide = function (m, who) {
    var p = this.puck, dx = p.x - m.x, dy = p.y - m.y, R = T.rp + T.rm, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    var d = Math.sqrt(d2), nx, ny;
    if (d < 1e-6) { nx = 0; ny = who === 'me' ? 1 : -1; } else { nx = dx / d; ny = dy / d; }
    var mvx = clamp(m.vx, -6.5, 6.5), mvy = clamp(m.vy, -6.5, 6.5);
    var vn = (p.vx - mvx) * nx + (p.vy - mvy) * ny;
    if (vn < 0) {
      var j = -(1 + 0.84) * vn;
      p.vx += j * nx; p.vy += j * ny;
      if (-vn > 0.15 && !(this.lastTouch === who && this.sinceTouch < 0.09)) this.events.push({ type: 'hit', who: who, power: -vn, x: p.x - nx * T.rp, y: p.y - ny * T.rp });
      this.lastTouch = who; this.sinceTouch = 0;
    }
    p.x = m.x + nx * (R + 1e-4); p.y = m.y + ny * (R + 1e-4);
  };
  Sim.prototype._walls = function () {
    var p = this.puck, hw = T.W / 2 - T.rp, e = 0.9, sp;
    if (p.x < -hw) { p.x = -hw; if (p.vx < 0) { sp = -p.vx; p.vx = sp * e; if (sp > 0.2) this.events.push({ type: 'wall', power: sp, x: -T.W / 2, y: p.y }); } }
    if (p.x > hw) { p.x = hw; if (p.vx > 0) { sp = p.vx; p.vx = -sp * e; if (sp > 0.2) this.events.push({ type: 'wall', power: sp, x: T.W / 2, y: p.y }); } }
    // the four corners are cut off by angled rails, so a puck cannot get wedged where no mallet can reach it
    for (var cy = 0; cy < 2; cy++) {
      var ddx = T.W / 2 - Math.abs(p.x), ddy = cy ? T.L - p.y : p.y, gap = (ddx + ddy - T.corner) * 0.70711 - T.rp;
      if (gap < 0) {
        var cnx = (p.x < 0 ? 1 : -1) * 0.70711, cny = (cy ? -1 : 1) * 0.70711, cvn = p.vx * cnx + p.vy * cny;
        p.x -= cnx * gap; p.y -= cny * gap;
        if (cvn < 0) { p.vx -= (1 + e) * cvn * cnx; p.vy -= (1 + e) * cvn * cny; if (-cvn > 0.2) this.events.push({ type: 'wall', power: -cvn, x: p.x - cnx * T.rp, y: p.y - cny * T.rp }); }
      }
    }
    var mouth = T.goalW / 2;
    for (var end = 0; end < 2; end++) {
      var wallY = end ? T.L : 0, dir = end ? 1 : -1;            // dir: which way is "out"
      var depth = (p.y - wallY) * dir + T.rp;                    // how far the puck's edge pokes past the end wall
      if (depth <= 0) continue;
      if (Math.abs(p.x) < mouth - T.rp * 0.25) {                 // inside the goal mouth
        if ((p.y - wallY) * dir > T.rp * 0.6) { this.events.push({ type: 'goal', by: end ? 'me' : 'ai', x: p.x, y: wallY }); this.live = false; return; }
        continue;
      }
      if (Math.abs(p.x) < mouth + T.rp) {                        // the goal post
        var px = (p.x < 0 ? -1 : 1) * mouth, ddx = p.x - px, ddy = p.y - wallY, dd = Math.hypot(ddx, ddy);
        if (dd < T.rp && dd > 1e-6) {
          var nx = ddx / dd, ny = ddy / dd, vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= 1.85 * vn * nx; p.vy -= 1.85 * vn * ny; if (-vn > 0.2) this.events.push({ type: 'wall', power: -vn, x: px, y: wallY }); }
          p.x = px + nx * T.rp; p.y = wallY + ny * T.rp;
        }
        if (Math.abs(p.x) < mouth) continue;
      }
      p.y = wallY - dir * T.rp;
      if (p.vy * dir > 0) { sp = Math.abs(p.vy); p.vy = -dir * sp * e; if (sp > 0.2) this.events.push({ type: 'wall', power: sp, x: p.x, y: wallY }); }
    }
  };
  Sim.prototype.step = function (dt) {
    var n = Math.max(1, Math.ceil(dt * 300)), h = dt / n, p = this.puck;
    for (var i = 0; i < n; i++) {
      this._mallet(this.me, h); this._mallet(this.ai, h);
      if (!this.live) continue;
      p.x += p.vx * h; p.y += p.vy * h;
      var f = 1 - 0.16 * h; p.vx *= f; p.vy *= f;
      this._collide(this.me, 'me'); this._collide(this.ai, 'ai');
      this._walls();
      if (!this.live) break;
      var sp = Math.hypot(p.vx, p.vy);
      if (sp > T.maxPuck) { p.vx *= T.maxPuck / sp; p.vy *= T.maxPuck / sp; }
    }
    this.sinceTouch += dt;
  };

  // ------------------------------------------------------------------ the opponent
  /* skill 0..1 sets how fast it moves, how well it reads the puck and how hard it shoots.
   * `static` is the untrained state: it wanders like noise.
   * It only re-reads the table every `react` seconds, so a quick shot can beat it, and every swing
   * takes it away from its goal, so a quick return can too. */
  function Brain(sim) {
    this.sim = sim; this.skill = 0.2; this.static = false; this.custom = null;
    this.plan = 0; this.mode = 'home'; this.blockX = 0; this.blockT = 9; this.aimX = 0; this.bankSide = 0;
    this.swing = 0; this.swingV = 1; this.wander = 0; this.side = 1; this.counter = false; this.ready = 0; this.rush = 0; this.drive = false;
  }
  Brain.prototype.params = function () {
    if (this.custom) return this.custom;
    var s = this.skill;
    return {
      speed: lerp(0.65, 3.0, s), react: lerp(0.42, 0.1, s), err: lerp(0.2, 0.012, s), power: lerp(0.6, 4.4, s),
      wait: lerp(0.45, 0, Math.min(1, s * 1.6)), aim: lerp(0.55, 0.12, s), homeY: T.L - lerp(0.16, 0.26, s), follow: lerp(0.2, 0.75, s),
      tol: lerp(0.04, 0.006, s), bank: s > 0.4 ? (s - 0.4) * 0.7 : 0, counter: s > 0.35 ? (s - 0.35) * 1.4 : 0, smart: lerp(0.05, 0.95, s),
      drive: s > 0.45 ? (s - 0.45) * 1.7 : 0, rush: lerp(1, 1.9, s)
    };
  };
  Brain.prototype.update = function (dt) {
    var sim = this.sim, p = sim.puck, m = sim.ai, P = this.params(), half = T.L / 2;
    this.plan -= dt; this.rush -= dt;
    if (this.static) {                                    // untrained: drift about, sometimes stumble towards the puck
      this.wander -= dt;
      if (this.wander <= 0) {
        this.wander = 0.35 + Math.random() * 0.6;
        var chase = p.y > half && Math.random() < (Math.hypot(p.vx, p.vy) < 0.3 ? 0.65 : 0.3);   // a puck left lying on its side gets noticed sooner
        m.tx = chase ? p.x + gauss() * 0.15 : (Math.random() - 0.5) * 0.8;
        m.ty = chase ? p.y + 0.1 : T.L - 0.12 - Math.random() * 0.55;
      }
      m.max = 0.8; sim.limit(m, false); this.dbg = 'static'; return;
    }
    if (this.swing > 0) {                                 // mid-swing: follow through, then get back
      this.swing -= dt; m.max = this.swingV; sim.limit(m, false);
      var done = Math.hypot(m.tx - m.x, m.ty - m.y) < 0.01 || (!this.drive && sim.lastTouch === 'ai' && sim.sinceTouch > 0.03 && sim.sinceTouch < 0.2);
      if (done) this.swing = 0;
      if (this.swing <= 0) { this.plan = 0; this.rush = 0.6; this.mode = 'home'; }
      else return;
    }
    var puckSpeed = Math.hypot(p.vx, p.vy), onMySide = p.y > half + 0.01;
    if (this.plan <= 0) {                                 // look at the table again
      this.plan = P.react * (0.75 + Math.random() * 0.5);
      var was = this.mode;
      var loose = p.y > m.y - 0.03 && p.y > T.L - 0.45 && puckSpeed > 0.5;     // behind me and still moving: dangerous, do not swing at it
      if (onMySide && sim.live && p.vy < 0.3 && p.vy > -1.3 && !loose) {     // mine to hit: it is not heading for my goal and not already leaving
        this.mode = 'attack';
        if (was !== 'attack') {                           // pick a target: straight at goal, or off a side rail
          var foe = sim.me, open = foe && Math.abs(foe.x) > 0.01 ? (foe.x > 0 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
          this.aimX = Math.random() < P.smart                 // the better it is, the more often it shoots for the corner you left open
            ? open * (T.goalW / 2 - T.rp - 0.02) + gauss() * P.aim * T.goalW * 0.3
            : gauss() * P.aim * T.goalW;
          this.aimX = clamp(this.aimX, -T.goalW * 0.9, T.goalW * 0.9);
          this.bankSide = Math.random() < P.bank ? (Math.random() < 0.5 ? -1 : 1) : 0;
          this.drive = Math.random() < P.drive;
          this.side = m.x >= p.x ? 1 : -1; this.ready = 0;
        }
      } else if (sim.live && onMySide && p.y > m.y - 0.03 && p.y > T.L - 0.45) {
        this.mode = 'cover';                              // it has got in behind me: drop back and seal the near post
      } else if (p.vy >= 0.3 && sim.live) {               // coming my way: get on its line
        this.mode = 'block';
        var lineY = P.homeY, t = (lineY - p.y) / p.vy;
        var x = p.x + p.vx * clamp(t, 0, 3), hw = T.W / 2 - T.rp, span = 2 * hw;
        x = ((x + hw) % (2 * span) + 2 * span) % (2 * span); if (x > span) x = 2 * span - x; x -= hw;   // fold off the side rails
        this.blockX = clamp(x + gauss() * P.err * (0.5 + Math.min(1.2, puckSpeed * 0.45)), -T.goalW / 2 - 0.06, T.goalW / 2 + 0.06);
        this.blockT = t; this.counter = Math.random() < P.counter;
      } else this.mode = 'home';
    }
    var fast = this.rush > 0 ? P.rush : 1;
    m.max = P.speed * fast;
    if (this.mode === 'attack' && onMySide) {
      var deep = p.y > T.L - T.rm - T.rp * 0.5;           // tucked against my own end rail: clear it out sideways
      var gx = this.aimX, dx, dy, dl;
      if (this.bankSide) gx = this.bankSide * (T.W - T.rp * 2) - gx;        // mirror the goal across a side rail
      if (deep) { dx = Math.abs(p.x) > 0.04 ? (p.x > 0 ? 1 : -1) : this.side; dy = -0.15; } else { dx = gx - p.x; dy = -p.y; }
      dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      var back = T.rp + T.rm + 0.035, clear = T.rp + T.rm + 0.022;
      // where to stand: behind the puck on the shot line, or as near to that as the rails allow
      var ax = clamp(p.x - dx * back, -T.W / 2 + T.rm, T.W / 2 - T.rm), ay = clamp(p.y - dy * back, half + T.rm, T.L - T.rm);
      if (Math.hypot(m.x - ax, m.y - ay) < P.tol) {
        this.ready += dt;                                 // lined up; the weaker it is, the longer it takes to pull the trigger
        m.tx = ax; m.ty = ay; this.dbg = 'aim';
        if (this.ready >= (P.wait || 0)) {
          var sx = p.x - m.x, sy = p.y - m.y, sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;
          // a tap sends the puck from where it lies; a drive carries it up to the centre line first, so it arrives sooner
          var reach = 0.2;
          if (this.drive && !deep && sy < -0.5) reach = clamp((p.y - half - T.rm - T.rp) / -sy, 0.2, 0.75);
          m.tx = p.x + sx * reach; m.ty = p.y + sy * reach;
          this.swingV = P.power; m.max = P.power; this.swing = reach / P.power + 0.12; this.ready = 0; this.dbg = 'swing';
        }
      } else {
        m.tx = ax; m.ty = ay; m.max = P.speed * 1.2 * fast; this.dbg = 'approach'; this.ready = Math.max(0, this.ready - dt);
        // would walking straight there knock the puck (probably into my own goal)? then go round it
        var ex = ax - m.x, ey = ay - m.y, el = ex * ex + ey * ey;
        var tt = el > 1e-9 ? clamp(((p.x - m.x) * ex + (p.y - m.y) * ey) / el, 0, 1) : 0;
        var qx = m.x + ex * tt - p.x, qy = m.y + ey * tt - p.y;
        if (qx * qx + qy * qy < clear * clear && Math.hypot(ax - p.x, ay - p.y) >= clear) {
          var ux = m.x - p.x, uy = m.y - p.y, ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
          var vx = -uy, vy = ux; if (vx * (ax - p.x) + vy * (ay - p.y) < 0) { vx = -vx; vy = -vy; }
          var wx = ux * 0.35 + vx, wy = uy * 0.35 + vy, wl = Math.hypot(wx, wy);
          m.tx = p.x + wx / wl * clear * 1.35; m.ty = p.y + wy / wl * clear * 1.35; m.max = P.speed * 0.85; this.dbg = 'round';
        }
      }
    } else if (this.mode === 'block') {
      this.blockT -= dt;
      m.tx = this.blockX; m.ty = P.homeY; this.dbg = 'block';
      var ahead = m.y - p.y, meet = p.vy > 0.05 ? p.x + p.vx * (ahead / p.vy) : p.x;       // where it will cross my line
      if (this.counter && this.blockT < 0.2 && ahead > T.rm + T.rp + 0.02 && ahead < 0.34 && Math.abs(meet - m.x) < T.rm * 0.45) {
        var cx = clamp(gauss() * P.aim * T.goalW, -0.3, 0.3) - p.x, cy = -p.y, cl = Math.hypot(cx, cy) || 1;   // hit it back instead of just stopping it
        m.tx = m.x + cx / cl * 0.22; m.ty = m.y + cy / cl * 0.22; this.swingV = Math.max(P.speed, P.power * 0.8); m.max = this.swingV; this.swing = 0.2; this.drive = false; this.dbg = 'counter';
      }
    } else if (this.mode === 'cover') {
      m.tx = (p.x < 0 ? -1 : 1) * Math.min(Math.abs(p.x), T.goalW / 2 - 0.02); m.ty = T.L - T.rm; m.max = P.speed * 1.3; this.dbg = 'cover';
    } else {
      m.tx = clamp(p.x * P.follow, -T.goalW / 2, T.goalW / 2); m.ty = P.homeY; m.max = P.speed * (this.rush > 0 ? P.rush : 0.85); this.dbg = 'home';
    }
    sim.limit(m, false);
  };

  global.Hockey = { T: T, Sim: Sim, Brain: Brain, clamp: clamp, lerp: lerp };
})(window);
