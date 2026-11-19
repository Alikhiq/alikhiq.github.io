// Built-in demo beat: dark half-time trap at 140 BPM, synthesised with Web Audio. No samples.
const BPM = 140, SIX = 60 / BPM / 4;
const KICK = [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0];
const KICK2 = [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,1,0,0];
const HAT = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1];
const PROG = [{ root: 36, pad: [60, 63, 67] }, { root: 32, pad: [56, 60, 63] }, { root: 29, pad: [53, 56, 60] }, { root: 31, pad: [55, 59, 62] }];
const BELL = [[0, 75], [3, 72], [6, 79], [10, 75], [12, 70]];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/** @param {AudioContext} ac @param {AudioNode} out */
export function createDemo(ac, out) {
  const noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const drive = new Float32Array(256);
  for (let i = 0; i < 256; i++) drive[i] = Math.tanh((i / 128 - 1) * 2.2);
  let timer = null, step = 0, nextT = 0;

  function envG(gn, at, a, pk, dur) { gn.gain.setValueAtTime(.0001, at); gn.gain.exponentialRampToValueAtTime(pk, at + a); gn.gain.exponentialRampToValueAtTime(.0001, at + a + dur); }
  function kick(at) {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.frequency.setValueAtTime(160, at); o.frequency.exponentialRampToValueAtTime(42, at + .1);
    envG(gn, at, .002, 1, .3); o.connect(gn); gn.connect(out); o.start(at); o.stop(at + .4);
  }
  function n808(at, midi, len, slideFrom) {
    const o = ac.createOscillator(), sh = ac.createWaveShaper(), gn = ac.createGain();
    sh.curve = drive; o.type = 'sine';
    if (slideFrom) { o.frequency.setValueAtTime(mtof(slideFrom), at); o.frequency.exponentialRampToValueAtTime(mtof(midi), at + .09); }
    else o.frequency.setValueAtTime(mtof(midi), at);
    gn.gain.setValueAtTime(.0001, at); gn.gain.exponentialRampToValueAtTime(.7, at + .005);
    gn.gain.setValueAtTime(.7, at + len * .6); gn.gain.exponentialRampToValueAtTime(.0001, at + len);
    o.connect(sh); sh.connect(gn); gn.connect(out); o.start(at); o.stop(at + len + .05);
  }
  function noiseHit(at, type, fr, pk, dur) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = fr; envG(gn, at, .002, pk, dur);
    s.connect(f); f.connect(gn); gn.connect(out); s.start(at); s.stop(at + dur + .05);
  }
  function clap(at) { noiseHit(at, 'bandpass', 1500, .5, .05); noiseHit(at + .012, 'bandpass', 1500, .5, .05); noiseHit(at + .024, 'bandpass', 1500, .5, .05); noiseHit(at + .03, 'bandpass', 1300, .45, .22); }
  function hat(at, v) { noiseHit(at, 'highpass', 8000, v, .035); }
  function pad(at, notes, len) {
    const f = ac.createBiquadFilter(), gn = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 1;
    gn.gain.setValueAtTime(.0001, at); gn.gain.linearRampToValueAtTime(.045, at + .25);
    gn.gain.setValueAtTime(.045, at + len * .85); gn.gain.exponentialRampToValueAtTime(.0001, at + len);
    f.connect(gn); gn.connect(out);
    for (const m of notes) for (const dt of [-7, 7]) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(f); o.start(at); o.stop(at + len + .05);
    }
  }
  function bell(at, midi) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), gn = ac.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = mtof(midi); o2.frequency.value = mtof(midi + 12);
    envG(gn, at, .004, .12, .7); o.connect(gn); o2.connect(gn); gn.connect(out);
    o.start(at); o2.start(at); o.stop(at + .8); o2.stop(at + .8);
  }
  function schedStep(s, at) {
    const i = s % 16, bar = Math.floor(s / 16) % 4, P = PROG[bar], kp = bar % 2 ? KICK2 : KICK;
    if (kp[i]) { kick(at); n808(at, P.root, i === 10 ? SIX * 5 : SIX * 7, i === 10 && bar === 3 ? P.root + 7 : 0); }
    if (i === 8) clap(at);
    if (HAT[i]) hat(at, i % 4 === 0 ? .2 : .11);
    if (bar === 3 && i >= 12) { hat(at + SIX / 3, .09); hat(at + SIX * 2 / 3, .09); }
    if (i === 0) pad(at, P.pad, SIX * 16);
    for (const [st, m] of BELL) if (st === i && bar !== 2) bell(at, m - (bar === 1 ? 3 : 0));
  }
  // look-ahead scheduler; wide enough to survive background-tab timer throttling for a while
  function scheduler() { while (nextT < ac.currentTime + .25) { schedStep(step, nextT); nextT += SIX; step = (step + 1) % 64; } }

  return {
    start() { this.stop(); step = 0; nextT = ac.currentTime + .06; timer = setInterval(scheduler, 25); scheduler(); },
    stop() { if (timer) { clearInterval(timer); timer = null; } },
    get running() { return timer != null; },
  };
}
