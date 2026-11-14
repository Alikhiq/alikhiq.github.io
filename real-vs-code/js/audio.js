/* Sound, synthesised on the fly with Web Audio. No audio files. */
(function (global) {
  'use strict';
  var ctx = null, master = null, muted = false, noiseBuf = null, unlocked = false;   // browsers only allow sound after a tap or key press

  function ensure() {
    if (ctx) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      var n = ctx.sampleRate, d;
      noiseBuf = ctx.createBuffer(1, n, n); d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function unlock() { unlocked = true; if (ensure() && ctx.state === 'suspended') ctx.resume(); }
  function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.02); }

  function tone(type, f0, f1, dur, vol, when) {
    if (!unlocked || muted || !ensure()) return;
    var t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(freq, q, dur, vol, when, type) {
    if (!unlocked || muted || !ensure()) return;
    var t = ctx.currentTime + (when || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  var Sfx = {
    unlock: unlock, setMuted: setMuted, isMuted: function () { return muted; },
    hit: function (power) {                 // mallet on puck
      var v = Math.min(1, 0.25 + power * 0.3);
      noise(2600 + Math.random() * 600, 1.2, 0.05, 0.5 * v);
      tone('triangle', 210 + power * 30, 120, 0.07, 0.5 * v);
    },
    wall: function (power) {                // puck on rail
      var v = Math.min(1, 0.15 + power * 0.25);
      noise(1500 + Math.random() * 300, 2.5, 0.035, 0.35 * v);
      tone('sine', 330, 250, 0.04, 0.22 * v);
    },
    goalReal: function () {                 // you scored
      [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone('square', f, f, 0.16, 0.16, i * 0.07); });
      noise(5000, 0.7, 0.5, 0.22, 0, 'highpass');
    },
    goalCode: function () {                 // it scored
      [330, 262, 196, 147].forEach(function (f, i) { tone('sawtooth', f, f * 0.97, 0.2, 0.15, i * 0.1); });
      noise(300, 1, 0.35, 0.3, 0, 'lowpass');
    },
    train: function (seconds) {             // blobs learning: a rising stream of blips
      var n = Math.max(6, Math.round(seconds * 16));
      for (var i = 0; i < n; i++) {
        var f = 320 * Math.pow(2, (i / n) * 2.2 + Math.random() * 0.08);
        tone(i % 3 ? 'sine' : 'triangle', f, f * 1.02, 0.05, 0.07, i * (seconds / n));
      }
    },
    scatter: function () { noise(900, 0.6, 0.3, 0.3, 0, 'bandpass'); tone('sawtooth', 160, 60, 0.25, 0.2); },
    click: function () { tone('sine', 880, 660, 0.05, 0.14); },
    serve: function () { tone('sine', 660, 660, 0.08, 0.14); tone('sine', 990, 990, 0.12, 0.14, 0.1); },
    win: function () {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach(function (f, i) { tone('triangle', f, f, 0.5, 0.15, i * 0.09); });
    },
    lose: function () { [392, 349.2, 311.1, 261.6].forEach(function (f, i) { tone('triangle', f, f, 0.4, 0.14, i * 0.16); }); }
  };
  global.Sfx = Sfx;
})(window);
