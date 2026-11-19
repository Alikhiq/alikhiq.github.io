// Per-frame audio features. `A` is one shared object that every visual reads; nothing here allocates per frame.
// With no live audio a synthetic pulse fills the same fields, so visuals never freeze.
import { emit } from '../core/bus.js';

export const A = {
  bass: 0, mid: 0, high: 0, level: 0,
  beat: false, beatPulse: 0, beats: 0,
  spec: new Uint8Array(1024), wave: new Float32Array(2048),
  live: false,
};

const band = new Uint8Array(1024);
const peak = { bass: .3, mid: .3, high: .3 }, floor = { bass: 0, mid: 0, high: 0 };
const prevLow = new Float32Array(16);
let fluxAvg = 0, lastBeat = 0, idlePhase = 0;

function bandAvg(hzPerBin, lo, hi) {
  const a = Math.max(1, Math.floor(lo / hzPerBin)), b = Math.min(band.length - 1, Math.ceil(hi / hzPerBin));
  let s = 0;
  for (let i = a; i <= b; i++) s += band[i];
  return s / ((b - a + 1) * 255);
}
/**
 * One band, 0..1. Mostly "how far above its own recent floor" (so a held 808 or pad does not pin the
 * value at 1 and the hits on top still read), plus a little absolute level against the falling peak.
 */
function norm(key, v, dt, minPeak, dyn) {
  peak[key] = Math.max(peak[key] * Math.pow(.92, dt), v, minPeak);
  floor[key] += (v - floor[key]) * (v < floor[key] ? Math.min(1, dt * 12) : Math.min(1, dt * .6));
  const lo = floor[key] * .9, span = Math.max(.05, peak[key] - lo);
  const x = dyn * (v - lo) / span + (1 - dyn) * v / peak[key];
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * @param {number} dt seconds since the last frame
 * @param {number} now seconds
 * @param {{an: AnalyserNode, band: AnalyserNode}|null} live analysers to read, or null for the idle signal
 * @param {number} sampleRate
 */
export function analyse(dt, now, live, sampleRate) {
  A.beat = false; A.live = !!live;
  if (live) {
    live.an.getByteFrequencyData(A.spec); live.an.getFloatTimeDomainData(A.wave);
    live.band.getByteFrequencyData(band);
    const hz = sampleRate / live.band.fftSize;
    const bass = bandAvg(hz, 30, 160), mid = bandAvg(hz, 250, 2000), high = bandAvg(hz, 3000, 12000);
    let e = 0; const w = A.wave;
    for (let i = 0; i < w.length; i += 4) e += w[i] * w[i];
    const lvl = Math.sqrt(e / (w.length / 4));
    A.bass += (norm('bass', bass, dt, .12, .7) - A.bass) * .55; A.mid += (norm('mid', mid, dt, .08, .5) - A.mid) * .4; A.high += (norm('high', high, dt, .05, .3) - A.high) * .5;
    A.level += (Math.min(1, lvl * 3) - A.level) * .3;
    // beat: positive spectral flux on the lowest bins against its running average
    let flux = 0;
    for (let i = 1; i < 16; i++) { const v = band[i], d = v - prevLow[i]; if (d > 0) flux += d; prevLow[i] = v; }
    flux /= 15 * 255;
    if (flux > fluxAvg * 1.8 + .02 && bass > .1 && now - lastBeat > .2) { A.beat = true; lastBeat = now; }
    fluxAvg += (flux - fluxAvg) * Math.min(1, dt * 2.5);
  } else {
    const per = 60 / 92, prev = idlePhase;
    idlePhase = (now % per) / per; if (idlePhase < prev) A.beat = true;
    A.bass = Math.exp(-idlePhase * 5) * .85; A.mid = .35 + .15 * Math.sin(now * 1.3);
    A.high = .25 + .2 * Math.pow(Math.sin(now * 3.1), 2); A.level = .3 + A.bass * .3;
    const spec = A.spec, wave = A.wave;
    for (let i = 0; i < spec.length; i++) {
      const v = 210 * Math.exp(-i / 40) * (.35 + A.bass * .65) + 110 * Math.exp(-Math.pow((i - 120) / 70, 2)) * (.4 + A.mid)
        + 60 * (.5 + .5 * Math.sin(i * .09 + now * 2)) * Math.exp(-i / 260) * (.5 + A.high);
      spec[i] = v > 255 ? 255 : v;
    }
    for (let i = 0; i < wave.length; i++) wave[i] = Math.sin(i * .021 + now * 5) * .28 * (.5 + A.bass) + Math.sin(i * .113 + now * 9) * .08 * A.high;
  }
  if (A.beat) { A.beats++; A.beatPulse = 1; emit('beat', A.beats); }
  else A.beatPulse = Math.max(0, A.beatPulse - dt * 4);
}
