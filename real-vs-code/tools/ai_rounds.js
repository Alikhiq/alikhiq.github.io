// Round difficulty against a scripted stand-in for a person: it sees the puck late, moves at finite speed,
// lands its hand a little off and rests after each shot. Three levels of player, the game's own round rules.
// Usage: node tools/ai_rounds.js [physics.js] [round bases as JSON] [step per goal] [matches] [puck speeds as JSON]
const fs = require('fs');
global.window = {};
eval(fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'js', 'physics.js'), 'utf8'));
const { T, Sim, Brain, clamp } = window.Hockey;
const BASE = JSON.parse(process.argv[3] || '[0.05,0.17,0.29,0.41,0.53,0.64]'), STEP = +(process.argv[4] || 0.085), N = +(process.argv[5] || 80);
const SPEEDS = JSON.parse(process.argv[6] || '[2.8,3.0,3.2,3.4,3.7,4.0]');
const PLAYERS = {     // delay: how stale their view of the puck is; noise: how far off their hand lands; rest: pause after their own shot
  casual: { delay: 0.30, speed: 2.4, aim: 0.30, power: 3.5, lapse: 0.25, guard: 0.5, noise: 0.065, rest: 0.40 },
  decent: { delay: 0.23, speed: 3.6, aim: 0.20, power: 5.0, lapse: 0.12, guard: 0.6, noise: 0.042, rest: 0.26 },
  sharp:  { delay: 0.17, speed: 5.5, aim: 0.12, power: 6.5, lapse: 0.05, guard: 0.7, noise: 0.026, rest: 0.15 },
};
function makeBot(sim, P) {
  const hist = []; let aimX = 0, state = 'guard', lapseT = 0, swing = 0, off = 0, offT = 0;
  const g = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * Math.random()); };
  return function (dt) {
    offT -= dt; if (offT <= 0) { offT = 0.25 + Math.random() * 0.2; off = g() * P.noise; }
    hist.push({ x: sim.puck.x, y: sim.puck.y, vx: sim.puck.vx, vy: sim.puck.vy });
    const lag = Math.max(1, Math.round(P.delay / dt)); if (hist.length > lag + 1) hist.shift();
    const p = hist[0], m = sim.me;                                   // what the player saw a moment ago
    if (lapseT > 0) { lapseT -= dt; return; }                         // not paying attention
    if (swing > 0) { swing -= dt; m.max = P.power; sim.limit(m, true); if (swing <= 0) lapseT = P.rest * (0.7 + Math.random() * 0.6); return; }
    m.max = P.speed;
    const now = sim.puck;
    if (now.y < T.L / 2 + 0.02 && now.vy < 0.5 && Math.hypot(now.vx, now.vy) < 1.6) {   // it is mine to hit
      if (state !== 'attack') { state = 'attack'; aimX = (Math.random() - 0.5) * 2 * P.aim; if (Math.random() < P.lapse) lapseT = 0.3 + Math.random() * 0.4; }
      const dx = aimX - now.x, dy = T.L - now.y, dl = Math.hypot(dx, dy), back = T.rp + T.rm + 0.03;
      const ax = now.x - dx / dl * back, ay = Math.max(T.rm, now.y - dy / dl * back);
      if (Math.hypot(m.x - ax, m.y - ay) < 0.03) { const sx = now.x - m.x, sy = now.y - m.y, sl = Math.hypot(sx, sy) || 1; m.tx = now.x + sx / sl * 0.3; m.ty = now.y + sy / sl * 0.3; swing = 0.2; }
      else { m.tx = ax; m.ty = ay; }
    } else {                                                          // guard the goal, following where the puck seemed to be
      if (state !== 'guard') { state = 'guard'; if (Math.random() < P.lapse) lapseT = 0.15 + Math.random() * 0.3; }
      let tx = p.x * P.guard;
      if (p.vy < -0.3) { const t = (0.16 - p.y) / p.vy; let x = p.x + p.vx * clamp(t, 0, 2); const hw = T.W / 2 - T.rp, span = 2 * hw; x = ((x + hw) % (2 * span) + 2 * span) % (2 * span); if (x > span) x = 2 * span - x; x -= hw; tx = x; }
      m.tx = clamp(tx, -T.goalW / 2 - 0.05, T.goalW / 2 + 0.05) + off; m.ty = 0.16;
    }
    sim.limit(m, true);
  };
}
function round(base, P) {
  const sim = new Sim(), A = new Brain(sim), bot = makeBot(sim, P);
  let me = 0, ai = 0, t = 0, server = 'me', hog = 0;
  const setSkill = () => { let s = base + STEP * Math.max(0, me - 1); if (ai - me >= 2) s -= 0.06 * (ai - me - 1); A.static = me === 0; A.skill = clamp(s, 0.02, 1); };
  T.maxPuck = SPEEDS[BASE.indexOf(base)] || 3.1;
  const serve = (who) => { server = who; sim.reset(who); sim.me.x = sim.me.tx = 0; sim.me.y = sim.me.ty = 0.2; sim.live = true; hog = 0; setSkill(); };
  serve('me');
  while (me < 5 && ai < 5 && t < 900) {
    const dt = 1 / 60; bot(dt); A.update(dt); sim.step(dt); t += dt;
    for (const e of sim.events) if (e.type === 'goal') { if (e.by === 'me') { me++; serve('ai'); } else { ai++; serve('me'); } }
    sim.events.length = 0;
    if (sim.puck.y > T.L / 2) { hog += dt; if (hog > 7) serve('me'); } else hog = 0;
  }
  return { win: me > ai, me, ai, t };
}
for (const [name, P] of Object.entries(PLAYERS)) {
  let line = name.padEnd(7);
  BASE.forEach((b, i) => {
    let w = 0, gm = 0, ga = 0, tt = 0;
    for (let k = 0; k < N; k++) { const r = round(b, P); w += r.win ? 1 : 0; gm += r.me; ga += r.ai; tt += r.t; }
    line += ` | R${i + 1} ${(100 * w / N).toFixed(0).padStart(3)}% ${(gm / N).toFixed(1)}-${(ga / N).toFixed(1)} ${(tt / N).toFixed(0).padStart(3)}s`;
  });
  console.log(line);
}
