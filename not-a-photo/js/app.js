/* Not a Photo: loading, moving through the hall, the controls, render size and stills. */
(function () {
  'use strict';
  var W = World, P = W.PIECES, clamp = W.clamp, smooth = W.smooth;
  function $(id) { return document.getElementById(id); }

  var ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    shot: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };

  var app = $('app'), canvas = $('view');
  var EMB = window.NAP_DATA || null;
  var man = null, R = null, ranges = null, looks = {}, pending = {}, downloads = null;
  if (window.claude && window.claude.use) window.claude.use('downloads').then(function (d) { downloads = d; }, function () { });
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = {
    s: 0, target: 0, tour: false, yaw: 0, pitch: 0, yawT: 0, pitchT: 0, shiftX: 0, shiftXT: 0, shiftY: 0, shiftYT: 0,
    time: 0, last: 0, ready: false, mode: 'auto', auto: 1, slow: 0, fast: 0, hold: 0, bare: false, ended: false,
    drag: null, keys: {}, scrub: false, fade: 0, moved: false, shooting: false, done: {}, cur: -1, readyAt: 0, autoDone: false
  };

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { } return null; }

  // ------------------------------------------------------------------ sound: a low drone, a chime when a picture resolves
  var Sound = (function () {
    var ctx = null, out = null, on = false, drone = null;
    function make() {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try {
        ctx = new AC(); out = ctx.createGain(); out.gain.value = 0;
        var comp = ctx.createDynamicsCompressor(); out.connect(comp); comp.connect(ctx.destination);
        var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240; f.Q.value = 0.6; f.connect(out);
        var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
        [55, 55.4, 82.4, 110.3].forEach(function (hz, i) {
          var o = ctx.createOscillator(), g = ctx.createGain(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = hz; g.gain.value = i < 2 ? 0.16 : 0.09; o.connect(g); g.connect(f); o.start();
        });
        drone = f;
      } catch (e) { ctx = null; return false; }
      return true;
    }
    function set(v) {
      on = v;
      if (v && !ctx && !make()) { on = false; return; }
      if (!ctx) return;
      if (v && ctx.state === 'suspended') ctx.resume();
      out.gain.setTargetAtTime(v ? 0.5 : 0, ctx.currentTime, 0.4);
    }
    function chime(i) {                                   // a picture has finished training
      if (!on || !ctx) return;
      var scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3], base = scale[i % scale.length], t = ctx.currentTime;
      [1, 1.5, 2, 3].forEach(function (m, k) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = base * m;
        g.gain.setValueAtTime(0.0001, t + k * 0.06); g.gain.exponentialRampToValueAtTime(0.11 / (k + 1), t + k * 0.06 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.06 + 2.6);
        o.connect(g); g.connect(out); o.start(t + k * 0.06); o.stop(t + k * 0.06 + 2.8);
      });
    }
    return { set: set, chime: chime, isOn: function () { return on; } };
  })();

  // ------------------------------------------------------------------ loading
  function b64buf(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function fetchBuf(url, total, onProgress) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      if (!onProgress || !r.body || !r.body.getReader) return r.arrayBuffer();
      var reader = r.body.getReader(), chunks = [], got = 0;
      function pump() {
        return reader.read().then(function (x) {
          if (x.done) { var o = new Uint8Array(got), k = 0; chunks.forEach(function (c) { o.set(c, k); k += c.length; }); return o.buffer; }
          chunks.push(x.value); got += x.value.length; onProgress(Math.min(1, got / total)); return pump();
        });
      }
      return pump();
    });
  }
  function loadLook(name, onProgress) {
    if (looks[name]) return Promise.resolve(looks[name]);
    if (pending[name]) return pending[name];
    var meta = man.looks[name];
    var p = (EMB ? Promise.resolve(b64buf(EMB.bins[name])) : fetchBuf('data/' + meta.file, meta.bytes, onProgress)).then(function (buf) {
      looks[name] = Blobs.decodeLook(name, meta, buf, man); delete pending[name];
      var fin = looks[name].levels[looks[name].last].a, r = 0, g = 0, b = 0, sw = 0, j;      // the picture's average colour, for its light on the floor
      for (j = 0; j < fin.length; j += Blobs.FLOATS) { var ww = fin[j + 8] * Math.exp(fin[j + 2] + fin[j + 3]); r += fin[j + 5] * ww; g += fin[j + 6] * ww; b += fin[j + 7] * ww; sw += ww; }
      var mx = Math.max(r, g, b) || 1, avg = [r / mx, g / mx, b / mx];
      P.forEach(function (pc) { if (pc.key === name) pc.avg = avg; });
      P.forEach(function (pc) { if (pc.key === name) pc.look = looks[name]; });
      return looks[name];
    });
    pending[name] = p; return p;
  }

  // ------------------------------------------------------------------ render size
  /* AUTO draws at the screen's own pixel count (up to 4K) and backs off if the GPU cannot keep up.
   * 4K and 8K draw at exactly that, whatever the screen is. */
  function wantSize(mode, capture) {
    var cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight), long = Math.max(cw, ch), dprN = window.devicePixelRatio || 1, want;
    if (mode === '8k') want = 7680; else if (mode === '4k') want = 3840; else want = Math.min(long * dprN, 3840) * (capture ? 1 : S.auto);
    want = Math.max(320, Math.min(want, R.maxSize));
    var k = want / long;
    return [Math.max(2, Math.round(cw * k)), Math.max(2, Math.round(ch * k))];
  }
  function applySize() {
    var sz = wantSize(S.mode);
    if (sz[0] !== R.w || sz[1] !== R.h) {
      if (!R.resize(sz[0], sz[1]) && S.mode !== 'auto') { S.mode = 'auto'; quality(); R.resize.apply(R, wantSize('auto')); }   // too big for this GPU
      $('res').textContent = fmt(R.w) + ' × ' + fmt(R.h);
    }
  }
  function quality() {
    $('btnQuality').textContent = S.mode.toUpperCase(); $('resMode').textContent = S.mode.toUpperCase();
    $('btnQuality').classList.toggle('on', S.mode !== 'auto');
  }

  // ------------------------------------------------------------------ one frame
  function draw(time) {
    var fr = W.frame({ s: S.s, yaw: S.yaw, pitch: S.pitch, shiftX: S.shiftX, shiftY: S.shiftY, time: time, aspect: R.w / R.h });
    var cam = Render.camera(fr.cam, R.w, R.h), i, p;
    R.begin(cam, { rail: W.RAIL, time: time, end: P[P.length - 1].z, lp: fr.lp, lc: fr.lc });
    for (i = P.length - 1; i >= 0; i--) { p = P[i]; if (p.visible && p.look && p.d < 46 && p.alpha > 0.02) R.piece(cam, p, true); }
    for (i = P.length - 1; i >= 0; i--) {
      p = P[i];
      if (p.d > -4) R.lines(cam, ranges[i][0], ranges[i][1], fr.glow);
      if (p.visible && p.look) R.piece(cam, p, false);
    }
    R.dust(cam, time, R.h / Math.max(1, window.innerHeight));
    R.end(cam, time, S.fade);
    return { fr: fr, cam: cam };
  }

  var tags = [];
  function ui(o) {
    var fr = o.fr, cam = o.cam, k = window.innerWidth / R.w, i, p;
    for (i = 0; i < P.length; i++) {                        // name plates on the gates
      p = P[i]; var el = tags[i], show = p === fr.current && p.d > 2.2 && p.d < 44;
      if (show) {
        var q = Render.project(cam, -p.gateW, p.gateH + 0.16, p.z);
        show = q[2] > 0.5 && q[1] * k > 40;                  // not when the top of the gate is off screen
        if (show) { el.style.transform = 'translate(' + (q[0] * k).toFixed(1) + 'px,' + (q[1] * k - 14).toFixed(1) + 'px)'; el.style.opacity = (smooth(44, 30, p.d) * smooth(2.2, 5, p.d) * 0.95).toFixed(2); }
      }
      if (!show) el.style.opacity = '0';
      if (p.pos >= p.last - 0.001 && !S.done[i]) { S.done[i] = true; Sound.chime(i); }
      if (p.pos < p.last * 0.5) S.done[i] = false;
    }
    var c = fr.current;
    if (c.index !== S.cur) { S.cur = c.index; $('nowIdx').textContent = ('0' + (c.index + 1)).slice(-2) + ' / 0' + P.length; $('nowName').textContent = c.name; }
    if (c.look) { var st = Blobs.statsAt(c.look, c.pos); $('nStep').textContent = fmt(st.step); $('nLoss').textContent = st.loss.toFixed(4); $('nBlobs').textContent = fmt(st.blobs); }
    var f = S.s / W.END;
    $('fill').style.width = (f * 100).toFixed(2) + '%'; $('rail').setAttribute('aria-valuenow', Math.round(f * 100));
    var ticks = $('ticks').children; for (i = 0; i < ticks.length; i++) ticks[i].className = P[i].d < (P[i].final ? W.END * 0 + 7.2 : 0.2) ? 'done' : '';
    $('intro').classList.toggle('on', S.s < 3.2 && !S.ended);
    $('now').classList.toggle('on', S.s >= 3.2 && !S.ended);
    $('outro').classList.toggle('on', S.ended);
  }

  function tick(now) {
    window.requestAnimationFrame(tick);
    if (!S.ready || S.shooting) return;
    var raw = S.last ? (now - S.last) / 1000 : 0.016; S.last = now;
    var dt = Math.min(raw, 0.05);
    S.time += dt; S.fade = Math.min(1, S.fade + dt * 0.8);
    if (!S.autoDone && now - S.readyAt > 1400) {           // nobody has touched anything: start walking on our own
      S.autoDone = true; if (!reduced && !S.moved && S.s < 0.5 && !S.drag) setTour(true);
    }
    // moving
    var K = S.keys, dir = (K.ArrowUp || K.w || K.W ? 1 : 0) - (K.ArrowDown || K.s || K.S ? 1 : 0);
    if (dir) { S.tour = false; S.target += dir * 4.2 * dt; }
    if (S.tour) {
      S.s += W.tourSpeed(S.s) * dt; S.target = S.s;
      if (S.s >= W.END - 0.04) { S.s = S.target = W.END; S.tour = false; tourIcon(); }
    } else {
      S.target = clamp(S.target, 0, W.END);
      S.s += (S.target - S.s) * (1 - Math.exp(-dt * (S.scrub ? 9 : 4.5)));
    }
    var ended = S.s >= W.END - 0.25; if (ended !== S.ended) { S.ended = ended; }
    // looking
    var look = (K.ArrowRight || K.d || K.D ? 1 : 0) - (K.ArrowLeft || K.a || K.A ? 1 : 0);
    if (look) S.yawT = clamp(S.yawT - look * 1.2 * dt, -0.6, 0.6);
    var e = 1 - Math.exp(-dt * 5);
    S.yaw += (S.yawT - S.yaw) * e; S.pitch += (S.pitchT - S.pitch) * e; S.shiftX += (S.shiftXT - S.shiftX) * e; S.shiftY += (S.shiftYT - S.shiftY) * e;
    // render size, backing off in AUTO if frames are slow
    if (S.mode === 'auto') {
      S.hold -= dt;
      if (raw > 0.03) { S.slow++; S.fast = 0; } else if (raw < 0.0125) { S.fast++; S.slow = Math.max(0, S.slow - 1); } else { S.fast = 0; S.slow = Math.max(0, S.slow - 1); }
      if (S.slow > 45 && S.auto > 0.4 && S.hold <= 0) { S.auto = Math.max(0.4, S.auto * 0.82); S.slow = 0; S.hold = 2.5; }
      else if (S.fast > 400 && S.auto < 1 && S.hold <= 0) { S.auto = Math.min(1, S.auto * 1.12); S.fast = 0; S.hold = 6; }
    }
    applySize();
    ui(draw(S.time));
  }

  // ------------------------------------------------------------------ stills
  /* Draw the current view once at 4K (or 8K), hand it over as a PNG, then go back to normal. */
  function still() {
    if (!S.ready || S.shooting) return;
    S.shooting = true;
    var mode = S.mode === '8k' ? '8k' : '4k', back = [R.w, R.h], sz = wantSize(mode, true);
    if (!R.resize(sz[0], sz[1])) { sz = wantSize('4k', true); if (!R.resize(sz[0], sz[1])) { R.resize(back[0], back[1]); S.shooting = false; return; } }
    draw(S.time);
    var w = R.w, h = R.h;
    canvas.toBlob(function (blob) {
      R.resize(back[0], back[1]); S.shooting = false; S.last = 0;
      if (!blob) return;
      var url = URL.createObjectURL(blob), img = $('shotImg');
      if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      img.dataset.url = url; img.src = url;
      S.still = { blob: blob, url: url, name: 'not-a-photo-' + w + 'x' + h + '.png' };
      $('shotInfo').textContent = fmt(w) + ' × ' + fmt(h) + ' PNG · ' + (blob.size / 1048576).toFixed(1) + ' MB';
      $('shotSave').disabled = false; $('shotSave').textContent = 'SAVE PNG';
      $('shot').classList.add('on');
    }, 'image/png');
  }

  // ------------------------------------------------------------------ controls
  function tourIcon() { $('btnTour').innerHTML = S.tour ? ICON.pause : ICON.play; $('btnTour').classList.toggle('on', S.tour); }
  function setTour(on) {
    if (on && S.s >= W.END - 0.3) { S.s = S.target = 0; S.done = {}; }
    S.tour = on; tourIcon();
  }
  function jump(i) { var p = P[i]; S.tour = false; tourIcon(); S.target = clamp(p.final ? W.END : -p.z - 5.6, 0, W.END); S.scrub = true; window.setTimeout(function () { S.scrub = false; }, 900); }
  function soundIcon() { $('btnSound').innerHTML = Sound.isOn() ? ICON.sound : ICON.muted; $('btnSound').classList.toggle('on', Sound.isOn()); }
  function interactive(el) { return el && el.closest && el.closest('button, a, #rail, #shot'); }
  function railAt(e) { var r = $('rail').getBoundingClientRect(); S.tour = false; tourIcon(); S.target = clamp((e.clientX - r.left) / r.width, 0, 1) * W.END; }

  function bind() {
    $('btnShot').innerHTML = ICON.shot; $('btnFull').innerHTML = ICON.full; tourIcon(); soundIcon(); quality();
    P.forEach(function (p, i) {
      var t = document.createElement('div'); t.className = 'tag'; t.innerHTML = '<i>' + ('0' + (i + 1)).slice(-2) + '</i>' + p.name; t.style.opacity = '0';
      $('labels').appendChild(t); tags.push(t);
      var k = document.createElement('span'); k.style.left = (clamp((p.final ? W.END : -p.z) / W.END, 0, 1) * 100) + '%'; $('ticks').appendChild(k);
    });
    window.addEventListener('wheel', function (e) {
      if (interactive(e.target) && !e.target.closest('#rail')) return;
      e.preventDefault(); S.tour = false; S.moved = true; tourIcon();
      var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      S.target = clamp(S.target + d * 0.011, 0, W.END);
    }, { passive: false });
    app.addEventListener('pointerdown', function (e) {
      if (interactive(e.target)) return;
      S.moved = true;
      S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, s0: S.target, yaw0: S.yawT, pitch0: S.pitchT, touch: e.pointerType !== 'mouse' };
    });
    window.addEventListener('pointermove', function (e) {
      var d = S.drag, w = window.innerWidth, h = window.innerHeight;
      if (d && d.id === e.pointerId) {
        var dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (d.touch) {                                       // swipe up to walk on, sideways to look
          if (Math.abs(dy) > 6) { S.tour = false; tourIcon(); }
          S.target = clamp(d.s0 - dy * 0.034, 0, W.END); S.yawT = clamp(d.yaw0 + dx / w * 0.9, -0.5, 0.5);
        } else { S.yawT = clamp(d.yaw0 + dx / w * 1.4, -0.7, 0.7); S.pitchT = clamp(d.pitch0 + dy / h * 0.8, -0.35, 0.35); }
      } else if (e.pointerType === 'mouse' && !d) {          // the view leans a little towards the cursor
        var nx = e.clientX / w * 2 - 1, ny = e.clientY / h * 2 - 1;
        S.yawT = -nx * 0.11; S.pitchT = -ny * 0.06; S.shiftXT = nx * 0.32; S.shiftYT = -ny * 0.14;
      }
    });
    function up(e) { if (S.drag && S.drag.id === e.pointerId) { if (S.drag.touch) S.yawT = 0; S.drag = null; } }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', function (e) {
      var k = e.key; S.moved = true;
      if (k === ' ') { e.preventDefault(); setTour(!S.tour); }
      else if (k === 'h' || k === 'H') { S.bare = !S.bare; app.classList.toggle('bare', S.bare); }
      else if (k === 'f' || k === 'F') full();
      else if (k === 'c' || k === 'C') still();
      else if (k === 'q' || k === 'Q') $('btnQuality').click();
      else if (k === 'm' || k === 'M') $('btnSound').click();
      else if (k === 'Home') { S.tour = false; tourIcon(); S.target = 0; }
      else if (k === 'End') { S.tour = false; tourIcon(); S.target = W.END; }
      else if (k === 'Escape') { $('shot').classList.remove('on'); if (S.bare) { S.bare = false; app.classList.remove('bare'); } }
      else if (k >= '1' && k <= '8') jump(+k - 1);
      if (/^Arrow/.test(k)) e.preventDefault();
      S.keys[k] = true;
    });
    window.addEventListener('keyup', function (e) { S.keys[e.key] = false; });
    function full() { var el = document.documentElement; try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () { }); } catch (err) { } }
    $('btnStart').addEventListener('click', function () { Sound.set(true); soundIcon(); setTour(true); });
    $('btnAgain').addEventListener('click', function () { setTour(true); });
    $('btnTour').addEventListener('click', function () { setTour(!S.tour); });
    $('btnSound').addEventListener('click', function () { Sound.set(!Sound.isOn()); soundIcon(); });
    $('btnFull').addEventListener('click', full);
    $('btnShot').addEventListener('click', still);
    $('shotClose').addEventListener('click', function () { $('shot').classList.remove('on'); });
    $('shotSave').addEventListener('click', function () {
      var st = S.still, btn = this; if (!st) return;
      if (downloads) {                                       // inside the Claude viewer: it asks the viewer, then saves
        btn.disabled = true;
        downloads.save({ filename: st.name, data: st.blob }).then(function () { btn.textContent = 'SAVED'; }, function (e) {
          btn.disabled = false;
          var c = e && e.code;
          $('shotInfo').textContent = c === 'declined' ? 'Not saved.' : c === 'rate_limited' ? 'A save is already waiting for an answer.' : 'Saving is not available here. Press and hold, or right-click, the picture to save it.';
        });
      } else {                                               // anywhere else: an ordinary download
        var a = document.createElement('a'); a.href = st.url; a.download = st.name; document.body.appendChild(a); a.click(); a.remove();
      }
    });
    $('btnQuality').addEventListener('click', function () {
      var order = R.maxSize >= 7680 ? ['auto', '4k', '8k'] : ['auto', '4k'];
      S.mode = order[(order.indexOf(S.mode) + 1) % order.length]; S.auto = 1; S.slow = 0; quality();
    });
    var rail = $('rail');
    rail.addEventListener('pointerdown', function (e) { S.scrub = true; rail.setPointerCapture(e.pointerId); railAt(e); });
    rail.addEventListener('pointermove', function (e) { if (S.scrub && e.buttons) railAt(e); });
    rail.addEventListener('pointerup', function () { S.scrub = false; });
    rail.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { S.tour = false; tourIcon(); S.target = clamp(S.target + (e.key === 'ArrowRight' ? 4 : -4), 0, W.END); e.stopPropagation(); e.preventDefault(); } });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); S.ready = false; });
    canvas.addEventListener('webglcontextrestored', function () { window.location.reload(); });
    document.addEventListener('visibilitychange', function () { S.last = 0; });
    if ('ontouchstart' in window) $('howto').textContent = 'or swipe up to walk';
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    var getMan = EMB ? Promise.resolve(EMB.manifest) : fetch('data/manifest.json').then(function (r) { return r.json(); });
    getMan.then(function (m) {
      man = m;
      R = new Render.Renderer(canvas, man);
      if (!R.ok) { app.className = 'failed'; return null; }
      var total = 0;
      P.forEach(function (p) { W.attach(p, man.looks[p.key]); var lv = man.looks[p.key].levels; total += lv[lv.length - 1].n; });
      $('total').textContent = fmt(total); $('total2').textContent = fmt(total);
      var L = W.lines(); ranges = L.ranges; R.setLines(L.lines);
      bind();
      return loadLook(P[0].key, function (f) { $('bootBar').style.width = Math.round(f * 100) + '%'; });
    }).then(function (look) {
      if (!look) return;
      R.resize.apply(R, wantSize('auto')); $('res').textContent = fmt(R.w) + ' × ' + fmt(R.h);
      app.className = ''; S.ready = true;
      var i = 1; (function next() { if (i < P.length) loadLook(P[i++].key).then(next, next); })();   // the rest, in the order you meet them
      S.readyAt = performance.now();
    }).catch(function (err) { $('bootMsg').textContent = 'COULD NOT LOAD'; if (window.console) console.error(err); });
    window.requestAnimationFrame(tick);
  }
  // handles for testing from the console
  window.NAP = { S: S, P: P, still: still, setTour: setTour, jump: jump, renderer: function () { return R; }, frame: function (t) { applySize(); return draw(t == null ? S.time : t); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
