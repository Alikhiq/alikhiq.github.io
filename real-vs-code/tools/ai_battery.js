// How good is the opponent at each skill? Fire a standard battery of shots at it and count how many get
// past; then let it attack a mostly open net and see how often and how hard it scores.
// Usage: node tools/ai_battery.js
const fs = require('fs');
global.window = {};
eval(fs.readFileSync(require('path').join(__dirname, '..', 'js', 'physics.js'), 'utf8'));
const { T, Sim, Brain, clamp } = window.Hockey;
function shots(skill, n, speed, bankFrac) {
  let saved = 0, goals = 0, own = 0;
  for (let i = 0; i < n; i++) {
    const sim = new Sim(), A = new Brain(sim); A.skill = skill;
    sim.me.tx = 0; sim.me.ty = 0.1; sim.me.x = 0; sim.me.y = 0.1;
    // let the brain settle with the puck sitting on the player's side
    sim.puck.x = (Math.random() - 0.5) * 0.7; sim.puck.y = 0.35 + Math.random() * 0.45; sim.puck.vx = 0; sim.puck.vy = 0; sim.live = true;
    for (let k = 0; k < 60; k++) { A.update(1 / 60); sim.step(1 / 60); } sim.events.length = 0;
    // shoot: straight at a random point in the mouth, or banked off a side rail
    let gx = (Math.random() - 0.5) * (T.goalW - 2 * T.rp) * 0.95;
    if (Math.random() < bankFrac) gx = (Math.random() < 0.5 ? -1 : 1) * (T.W - 2 * T.rp) - gx;
    const dx = gx - sim.puck.x, dy = T.L - sim.puck.y, dl = Math.hypot(dx, dy);
    sim.puck.vx = dx / dl * speed; sim.puck.vy = dy / dl * speed;
    let done = false, t = 0, touched = false;
    while (!done && t < 2.5) {
      A.update(1 / 60); sim.step(1 / 60); t += 1 / 60;
      for (const e of sim.events) { if (e.type === 'hit' && e.who === 'ai') touched = true; if (e.type === 'goal') { done = true; if (e.by === 'me') { goals++; } } }
      sim.events.length = 0;
      if (sim.puck.vy < 0 && sim.puck.y < T.L * 0.5) done = true;
    }
  }
  return goals / n;
}
function attack(skill, n) {                       // puck dropped on its side, defender parked off to one side
  let scored = 0, time = 0, own = 0, spd = 0, count = 0;
  for (let i = 0; i < n; i++) {
    const sim = new Sim(), A = new Brain(sim); A.skill = skill;
    sim.me.tx = sim.me.x = (Math.random() < 0.5 ? -1 : 1) * 0.3; sim.me.ty = sim.me.y = 0.1;
    sim.puck.x = (Math.random() - 0.5) * 0.7; sim.puck.y = T.L / 2 + 0.1 + Math.random() * 0.7; sim.puck.vx = (Math.random() - 0.5) * 0.6; sim.puck.vy = (Math.random() - 0.5) * 0.6; sim.live = true;
    let t = 0, done = false;
    while (!done && t < 8) {
      A.update(1 / 60); sim.step(1 / 60); t += 1 / 60;
      for (const e of sim.events) { if (e.type === 'hit' && e.who === 'ai' && A.dbg === 'swing') { spd += Math.hypot(sim.puck.vx, sim.puck.vy); count++; } if (e.type === 'goal') { done = true; if (e.by === 'ai') scored++; else own++; } }
      sim.events.length = 0;
    }
    time += t;
  }
  return { scored: scored / n, own: own / n, avgT: time / n, shotSpeed: spd / Math.max(1, count) };
}
console.log('skill | goals conceded: slow straight / fast straight / fast mixed bank | attack: scores, own goals, time, shot speed');
for (const s of [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) {
  const a = attack(s, 300);
  console.log(`${s.toFixed(2)}  | ${(100 * shots(s, 400, 1.8, 0)).toFixed(0).padStart(3)}%  ${(100 * shots(s, 400, 3.0, 0)).toFixed(0).padStart(3)}%  ${(100 * shots(s, 400, 3.0, 0.5)).toFixed(0).padStart(3)}%   | ${(100 * a.scored).toFixed(0).padStart(3)}%  own ${(100 * a.own).toFixed(1)}%  ${a.avgT.toFixed(1)}s  v=${a.shotSpeed.toFixed(2)}`);
}
