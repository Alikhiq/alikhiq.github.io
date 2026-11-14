/* Real vs Code: the game loop, the screens and the match rules. */
(function () {
  'use strict';
  var T = Hockey.T, clamp = Hockey.clamp, lerp = Hockey.lerp;
  function $(id) { return document.getElementById(id); }

  // ------------------------------------------------------------------ what there is to play
  var ROUNDS = [     // base: how good the opponent is once it has learned its first goal; speed: the fastest the puck can travel
    { look: 'coffee', name: 'COFFEE RUN', base: 0.05, speed: 2.8, text: 'It starts as noise. Every goal you score trains it, and the sharper it gets the better it plays.' },
    { look: 'pc', name: 'LAN NIGHT', base: 0.17, speed: 3.0, text: 'Same deal, quicker hands. It reads the puck earlier this time.' },
    { look: 'arcade', name: 'HOME TABLE', base: 0.29, speed: 3.2, text: 'This one has stood at this exact table before. It starts aiming for the corner you leave open.' },
    { look: 'shades', name: 'RED SHADES', base: 0.41, speed: 3.4, text: 'The puck runs faster now, and it has learned to bank shots off the rails.' },
    { look: 'leopard', name: 'LEOPARD PRINT', base: 0.53, speed: 3.7, text: 'It is smiling for a reason: it carries the puck up to the line before it lets go. Get back to your goal.' },
    { look: 'ghutra', name: 'WHITE GHUTRA', base: 0.64, speed: 4.0, text: 'The last one. By match point it is nearly the full picture, and it plays like it.' }
  ];
  var LAB = ROUNDS.map(function (r) { return { look: r.look, name: r.name }; }).concat([{ look: 'lean', name: 'THE TABLE' }, { look: 'lake', name: 'THE LAKE' }]);
  var WIN = 5;
  var LEARNED = ['noted.', 'that goes in the training set.', 'adjusting weights.', 'loss just dropped. thanks.', 'i saw how you did that.', 'one more like that and i can see you.'];
  var TAUNTS = ['gradient: descended.', 'you taught me that one.', 'predicted.', 'i am mostly blobs and still got there first.', 'was that your best data?', 'converging on your goal.'];
  var WOBBLE = [0.5, 0.09, 0.045, 0.02, 0.008, 0];

  var ICON = {
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>'
  };

  // ------------------------------------------------------------------ state
  var app = $('app'), bg = $('bg'), glc = $('gl'), fg = $('fg');
  var view = { w: 0, h: 0 }, scene = { x: 0, y: 0, w: 0, h: 0 }, dpr = 1, U = 1;
  var man = null, glr = null, table = new Table(), sim = new Hockey.Sim(), brain = new Hockey.Brain(sim);
  var EMB = window.RVC_DATA || null;
  var looks = {}, pending = {};
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = {
    state: 'boot', prev: null, round: 0, me: 0, ai: 0, sprite: null, mode: 'full', time: 0, timers: [],
    tilt: [0, 0], tiltTo: [0, 0], born: 0, drag: null, pointer: null, keys: {}, shake: 0, qScale: 1, slow: 0,
    seq: null, win: false, serveT: 0, idle: 0, hog: 0, fails: {}, labIndex: 0, progress: 0, lastFrame: 0, ready: false, token: 0
  };

  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { } return null; }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function after(s, fn) { G.timers.push({ t: s, fn: fn }); }
  function setState(s) { G.state = s; app.className = 's-' + s + (G.win ? ' won' : ''); }

  // ------------------------------------------------------------------ loading
  function b64buf(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function fetchBuf(url, total, onProgress) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      if (!onProgress || !r.body || !r.body.getReader) return r.arrayBuffer();
      var reader = r.body.getReader(), chunks = [], got = 0;
      function pump() {
        return reader.read().then(function (x) {
          if (x.done) { var out = new Uint8Array(got), o = 0; chunks.forEach(function (c) { out.set(c, o); o += c.length; }); return out.buffer; }
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
      looks[name] = Blobs.decodeLook(name, meta, buf, man); delete pending[name]; return looks[name];
    });
    pending[name] = p; return p;
  }
  function preload(names) {            // quietly, one after another
    var i = 0; (function next() { if (i < names.length) loadLook(names[i++]).then(next, next); })();
  }

  // ------------------------------------------------------------------ layout
  function resize() {
    view.w = window.innerWidth; view.h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    scene.w = Math.min(view.w, Math.round(view.h * 0.5)); scene.h = view.h; scene.x = (view.w - scene.w) / 2; scene.y = 0;
    U = scene.w / 400;
    [bg, glc, fg].forEach(function (c) { c.width = Math.round(view.w * dpr); c.height = Math.round(view.h * dpr); });
    document.documentElement.style.setProperty('--sw', scene.w + 'px');   // on the root, so --u (derived from it there) follows
    table.layout(view, scene, dpr, 0);
    table.backdrop(bg);
    var mid = table.proj(0, T.L * 0.5, 0)[1];
    $('banner').style.top = (mid - 46 * U) + 'px';
    $('caption').style.top = (table.railTopY - 34 * U) + 'px';
    $('hint').style.top = (table.proj(0, T.L * 0.2, 0)[1]) + 'px';
  }
  function bustRect(look) {
    var top = 96 * U, rail = table.railTopY, avail = rail - top;
    var faceH = (look.face[3] - look.face[1]) * look.H, faceCx = (look.face[0] + look.face[2]) / 2 * look.W;
    var head = clamp(avail * 0.47, 0.15 * scene.w, 0.37 * scene.w);
    var s = head / faceH, w = look.W * s, h = look.H * s;
    var x = table.cx - faceCx * s, y = top + 0.02 * scene.w - look.face[1] * look.H * s;
    var need = rail + 0.04 * scene.w;                       // the fade at the bottom hides behind the rail
    if (y + h * 0.93 < need) y = need - h * 0.93;
    return { x: x, y: y, w: w, h: h };
  }
  function fullRect(look) {                                 // title / ending: the whole picture, centred above the words
    var card = document.querySelector(G.state === 'end' ? '#scrEnd .titlecard' : '#scrTitle .titlecard');
    var avail = view.h - (card ? card.offsetHeight : view.h * 0.3) + 26 * U;
    var w = scene.w, h = w * look.H / look.W;
    if (h > avail) { h = avail; w = h * look.W / look.H; }
    return { x: scene.x + (scene.w - w) / 2, y: Math.max(0, (avail - h) / 2), w: w, h: h };
  }
  function labRect(look) {
    var top = 64 * U, bottom = view.h - 196 * U, availH = Math.max(120, bottom - top), availW = scene.w * (look.cut ? 0.98 : 0.94);
    var s = Math.min(availW / look.W, availH / look.H), w = look.W * s, h = look.H * s;
    return { x: scene.x + (scene.w - w) / 2, y: top + (availH - h) / 2, w: w, h: h };
  }
  function spriteRect() {
    var look = G.sprite.look;
    return G.mode === 'bust' ? bustRect(look) : G.mode === 'lab' ? labRect(look) : fullRect(look);
  }

  // ------------------------------------------------------------------ small UI helpers
  function banner(text, color, small, hold) {
    var b = $('banner'), s = b.firstChild;
    s.textContent = text; s.style.color = color;
    b.className = ''; void b.offsetWidth; b.className = (hold ? 'hold' : 'on') + (small ? ' small' : '');
  }
  function clearBanner() { $('banner').className = ''; }
  var capTimer = 0;
  function caption(text, seconds) { var c = $('caption'); c.textContent = text; c.className = 'mono on'; capTimer = seconds || 2.2; }
  function hint(text) { var h = $('hint'); if (text) { h.textContent = text; h.className = 'mono on'; } else h.className = 'mono'; }
  function pips() {
    var a = '', b = '', i;
    for (i = 0; i < WIN; i++) { a += '<b class="' + (i < G.me ? 'on' : '') + '"></b>'; b += '<b class="' + (i >= WIN - G.ai ? 'on' : '') + '"></b>'; }
    $('pipsMe').innerHTML = a; $('pipsAi').innerHTML = b;
  }
  function scores(popped) {
    $('sMe').textContent = G.me; $('sAi').textContent = G.ai; pips();
    if (popped) { var el = $(popped); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
  function readout(prefix) {
    if (!G.sprite) return;
    var st = G.sprite.stats();
    $(prefix + 'Step').textContent = fmt(st.step); $(prefix + 'Loss').textContent = st.loss.toFixed(4); $(prefix + 'Blobs').textContent = fmt(st.blobs);
  }
  function curve() {                                        // the real training loss, with a marker where the picture is now
    var cv = $('tCurve'), c = cv.getContext('2d'), pts = G.sprite.look.curve, w = cv.width, h = cv.height, i;
    c.clearRect(0, 0, w, h);
    if (!pts || pts.length < 2) return;
    var maxS = pts[pts.length - 1][0], lo = Math.log(0.002), hi = Math.log(0.3);
    function px(p) { return [2 + (w - 4) * p[0] / maxS, 3 + (h - 6) * (1 - (Math.log(Math.max(0.002, p[1])) - lo) / (hi - lo))]; }
    c.strokeStyle = 'rgba(217,255,61,0.9)'; c.lineWidth = 1.5; c.beginPath();
    for (i = 0; i < pts.length; i++) { var q = px(pts[i]); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
    c.stroke();
    var step = G.sprite.stats().step, x = 2 + (w - 4) * Math.min(1, step / maxS);
    c.fillStyle = 'rgba(7,7,15,0.72)'; c.fillRect(x, 0, w - x, h);
    c.fillStyle = '#fff'; c.fillRect(x - 0.75, 0, 1.5, h);
  }
  function soundIcon() { $('btnSound').innerHTML = Sfx.isMuted() ? ICON.muted : ICON.sound; }

  // ------------------------------------------------------------------ title, lab, ending
  /* Put a look on screen. Whatever was scheduled for the previous screen is dropped, and if the player
   * moves on before the data arrives, the late arrival is ignored. */
  function showSprite(name, mode, level) {
    var token = ++G.token;
    G.timers.length = 0; G.seq = null; G.drag = null;
    return loadLook(name).then(function (look) {
      if (token !== G.token) return new Promise(function () { });
      G.sprite = new Blobs.Sprite(glr, look); G.mode = mode; G.sprite.setLevel(level || 0);
      G.tilt = [0, 0]; G.tiltTo = [0, 0]; G.born = G.time;
      return look;
    });
  }
  function learn(delay, perLevel) {                         // noise -> finished picture
    var sp = G.sprite; sp.setLevel(0); G.seq = { wait: delay, perLevel: perLevel, started: false };
  }
  function showTitle() {
    G.win = false; clearBanner(); hint(''); sim.live = false;
    setState('title');
    $('btnPlay').textContent = G.progress > 0 && G.progress < ROUNDS.length ? 'CONTINUE · ROUND ' + (G.progress + 1) : 'PLAY';
    showSprite('lean', 'full', 0).then(function (look) {
      $('titleBlobs').textContent = fmt(look.levels[look.levels.length - 1].n);
      learn(0.7, 1.7);
    });
  }
  function showEnding() {
    G.win = false; setState('end');
    var total = 0; ROUNDS.forEach(function (r) { var m = man.looks[r.look]; total += m.levels[m.levels.length - 1].n; });
    $('endText').innerHTML = 'Six looks, <b>' + fmt(total) + '</b> blobs, zero photo files. Everything you just played against was drawn from numbers that began as noise.';
    showSprite('lake', 'full', 0).then(function () { learn(0.6, 1.8); Sfx.win(); });
  }
  function showLab(i) {
    G.win = false; setState('lab'); G.labIndex = i == null ? G.labIndex : i;
    var chips = $('labChips'); chips.innerHTML = '';
    LAB.forEach(function (L, k) {
      var b = document.createElement('button'); b.className = 'chip' + (k === G.labIndex ? ' on' : ''); b.textContent = L.name;
      b.onclick = function () { Sfx.click(); showLab(k); }; chips.appendChild(b);
    });
    var on = chips.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    showSprite(LAB[G.labIndex].look, 'lab', 0).then(function (look) {
      G.sprite.setLevel(look.levels.length - 1); $('labSlider').value = 1000;
    });
  }

  // ------------------------------------------------------------------ a round
  function skill() {
    var s = ROUNDS[G.round].base + 0.085 * Math.max(0, G.me - 1);
    if (G.ai - G.me >= 2) s -= 0.06 * (G.ai - G.me - 1);    // it eases off when it is well ahead
    s -= 0.045 * Math.min(4, G.fails[G.round] || 0);        // and a little more each time it has beaten you this round
    brain.static = G.me === 0; brain.skill = clamp(s, 0.02, 1);
  }
  function startRound(i) {
    G.round = i; G.me = 0; G.ai = 0; G.win = false; G.sprite = null; clearBanner(); hint(''); G.seq = null;
    table.parts.length = 0; table.rings.length = 0; table.trail.length = 0;
    sim.reset('me'); sim.live = false; sim.me.x = sim.me.tx = 0; sim.me.y = sim.me.ty = 0.2;
    scores(); skill();
    var R = ROUNDS[i];
    T.maxPuck = R.speed;
    $('roundKick').textContent = 'ROUND ' + (i + 1) + ' OF ' + ROUNDS.length; $('roundName').textContent = R.name;
    $('introKick').textContent = 'ROUND ' + (i + 1) + ' OF ' + ROUNDS.length; $('introName').textContent = R.name; $('introText').textContent = R.text;
    $('btnGo').disabled = true; $('btnGo').textContent = 'LOADING';
    setState('intro');
    showSprite(R.look, 'bust', 0).then(function () { $('btnGo').disabled = false; $('btnGo').textContent = 'START'; });
    if (i + 1 < ROUNDS.length) preload([ROUNDS[i + 1].look]); else preload(['lake']);
  }
  function serve(who) {
    sim.reset(who); sim.live = false; G.serveT = 0.85; G.idle = 0; G.hog = 0; G.server = who; skill();
    setState('serve');
    if (G.me === WIN - 1 || G.ai === WIN - 1) banner('MATCH POINT', G.me === WIN - 1 ? TableColors.real : TableColors.code, true);
  }
  function goal(by, e) {
    setState('goal'); hint('');
    if (!reduced) G.shake = 1;
    if (navigator.vibrate) { try { navigator.vibrate(by === 'me' ? [30, 40, 60] : 80); } catch (err) { } }
    if (by === 'me') {
      G.me++; scores('sMe'); Sfx.goalReal(); table.goalGlow.me = 1;
      table.spark(e.x, T.L, 46, 'rgba(255,170,60,', 2.2); table.ring(e.x, T.L - 0.05, 'rgba(255,170,60,');
      banner('GOAL', TableColors.real);
      G.sprite.kick(reduced ? 0.4 : 1.1); Sfx.scatter();
      if (G.me >= WIN) { after(1.0, winRound); return; }
      after(0.6, function () {
        G.sprite.morphTo(G.me, 1.7); Sfx.train(1.6);
        caption(G.me === 1 ? 'oh. so that is what i look like.' : pick(LEARNED), 2.4);
      });
      after(2.6, function () { serve('ai'); });
    } else {
      G.ai++; scores('sAi'); Sfx.goalCode(); table.goalGlow.ai = 1;
      table.spark(e.x, 0, 46, 'rgba(90,230,255,', 2.2); table.ring(e.x, 0.05, 'rgba(90,230,255,');
      banner('CODE SCORES', TableColors.code, true);
      G.sprite.flash = 0.55;
      caption(G.me === 0 ? '░▒▓ ?? ▓▒░' : pick(TAUNTS), 2.2);
      if (G.ai >= WIN) { after(1.2, loseRound); return; }
      after(1.9, function () { serve('me'); });
    }
  }
  function winRound() {
    var look = G.sprite.look, last = look.levels[look.levels.length - 1];
    G.win = true; setState('result');
    G.sprite.morphTo(look.levels.length - 1, 2.3); Sfx.train(2.2); after(2.2, Sfx.win);
    G.progress = Math.max(G.progress, G.round + 1); store('rvc.progress', String(G.progress)); G.fails[G.round] = 0;
    var card = $('scrResult').firstElementChild; card.className = 'card low win';
    $('resKick').textContent = 'ROUND ' + (G.round + 1) + ' · ' + ROUNDS[G.round].name + ' · ' + G.me + '–' + G.ai;
    $('resTitle').textContent = 'CONVERGED';
    $('resText').textContent = 'You trained it all the way. That is the finished picture up there, and it is still not a photo. Drag it to turn it, tap it to shake it apart.';
    $('resStats').innerHTML = '<div><span>BLOBS</span><b>' + fmt(last.n) + '</b></div><div><span>STEPS</span><b>' + fmt(last.step) + '</b></div><div><span>LOSS</span><b>' + last.loss.toFixed(4) + '</b></div>';
    $('btnNext').textContent = G.round + 1 < ROUNDS.length ? 'NEXT ROUND' : 'FINISH';
  }
  function loseRound() {
    G.win = false; setState('result'); Sfx.lose(); G.fails[G.round] = (G.fails[G.round] || 0) + 1;
    var card = $('scrResult').firstElementChild; card.className = 'card low lose';
    var st = G.sprite.stats();
    $('resKick').textContent = 'ROUND ' + (G.round + 1) + ' · ' + ROUNDS[G.round].name + ' · ' + G.me + '–' + G.ai;
    $('resTitle').textContent = 'THE CODE WINS';
    $('resText').textContent = G.me === 0 ? 'Beaten by static. It never even found out what it looks like.' : 'It only got to ' + fmt(st.blobs) + ' blobs before it beat you. Score more and you get to see the rest.';
    $('resStats').innerHTML = '<div><span>BLOBS</span><b>' + fmt(st.blobs) + '</b></div><div><span>STEPS</span><b>' + fmt(st.step) + '</b></div><div><span>LOSS</span><b>' + st.loss.toFixed(4) + '</b></div>';
    $('btnNext').textContent = 'REMATCH';
  }
  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'serve' || G.state === 'goal')) { G.prev = G.state; setState('paused'); }
    else if (!on && G.state === 'paused') { setState(G.prev); G.lastFrame = 0; }
  }

  // ------------------------------------------------------------------ input
  function interactive(el) { return el && el.closest && el.closest('button, input, .chips, a'); }
  function toTable(e) {
    var y = e.clientY - (e.pointerType === 'touch' ? 30 * U : 0);
    var p = table.unproj(e.clientX, y);
    sim.me.tx = p[0]; sim.me.ty = p[1]; sim.limit(sim.me, true);
  }
  function inMatch() { return G.state === 'play' || G.state === 'serve' || G.state === 'goal'; }
  function onDown(e) {
    Sfx.unlock();
    if (interactive(e.target)) return;
    if (inMatch()) { G.pointer = e.pointerId; toTable(e); return; }
    if (G.sprite && (G.state === 'title' || G.state === 'lab' || G.state === 'end' || G.state === 'result')) {
      G.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t0: [G.tiltTo[0], G.tiltTo[1]] };
    }
  }
  function onMove(e) {
    if (inMatch()) { if (e.pointerType !== 'touch' || G.pointer === e.pointerId) toTable(e); return; }
    var d = G.drag;
    if (d && d.id === e.pointerId) {
      var dx = e.clientX - d.x, dy = e.clientY - d.y; d.moved = Math.max(d.moved, Math.hypot(dx, dy));
      G.tiltTo = [clamp(dx / scene.w * 0.4, -0.12, 0.12), clamp(dy / scene.w * 0.4, -0.085, 0.085)];
    } else if (e.pointerType === 'mouse' && G.sprite && (G.state === 'title' || G.state === 'end')) {
      G.tiltTo = [clamp((e.clientX - view.w / 2) / scene.w * 0.12, -0.07, 0.07), clamp((e.clientY - view.h * 0.35) / scene.w * 0.1, -0.05, 0.05)];
    }
  }
  function onUp(e) {
    if (G.pointer === e.pointerId) G.pointer = null;
    var d = G.drag;
    if (d && d.id === e.pointerId) {
      if (d.moved < 8 && G.sprite) {                         // a tap: shake the picture apart
        var r = spriteRect();
        if (e.clientX > r.x && e.clientX < r.x + r.w && e.clientY > r.y && e.clientY < r.y + r.h) { G.sprite.kick(reduced ? 0.4 : 1); Sfx.scatter(); }
      }
      G.drag = null; G.tiltTo = [0, 0];
    }
  }
  function onKey(e) {
    var k = e.key;
    if (e.type === 'keydown') {
      Sfx.unlock();
      if (k === 'm' || k === 'M') { toggleSound(); return; }
      if (k === 'Escape' || k === 'p' || k === 'P') { pause(G.state !== 'paused'); return; }
      if ((k === 'Enter' || k === ' ') && !interactive(document.activeElement)) {
        if (G.state === 'title') $('btnPlay').click(); else if (G.state === 'intro') $('btnGo').click(); else if (G.state === 'result') $('btnNext').click();
      }
    }
    G.keys[k] = e.type === 'keydown';
    if (/^Arrow/.test(k) && inMatch()) e.preventDefault();
  }
  function keysMove(dt) {
    var K = G.keys, dx = (K.ArrowRight || K.d || K.D ? 1 : 0) - (K.ArrowLeft || K.a || K.A ? 1 : 0), dy = (K.ArrowUp || K.w || K.W ? 1 : 0) - (K.ArrowDown || K.s || K.S ? 1 : 0);
    if (!dx && !dy) return;
    sim.me.tx = sim.me.x + dx * 2.2 * dt * 6; sim.me.ty = sim.me.y + dy * 2.2 * dt * 6; sim.limit(sim.me, true);
  }
  function toggleSound() { Sfx.setMuted(!Sfx.isMuted()); store('rvc.muted', Sfx.isMuted() ? '1' : '0'); soundIcon(); }

  // ------------------------------------------------------------------ per-frame
  function update(dt) {
    G.time += dt;
    var due = [], i;
    for (i = G.timers.length - 1; i >= 0; i--) { G.timers[i].t -= dt; if (G.timers[i].t <= 0) due.push(G.timers.splice(i, 1)[0]); }
    for (i = due.length - 1; i >= 0; i--) due[i].fn();
    if (capTimer > 0) { capTimer -= dt; if (capTimer <= 0) $('caption').className = 'mono'; }
    var sp = G.sprite;
    if (G.seq && sp) {                                       // a "watch it learn" run in progress
      if (!G.seq.started) { G.seq.wait -= dt; if (G.seq.wait <= 0) { G.seq.started = true; var last = sp.last(); sp.morphTo(last, G.seq.perLevel * last); Sfx.train(Math.min(6, G.seq.perLevel * last)); } }
      else if (!sp.moving()) G.seq = null;
    }
    if (inMatch()) {
      keysMove(dt);
      if (G.state === 'serve') { G.serveT -= dt; if (G.serveT <= 0) { sim.live = true; setState('play'); Sfx.serve(); } }
      brain.update(dt);
      sim.step(dt);
      for (var k = 0; k < sim.events.length; k++) {
        var e = sim.events[k];
        if (e.type === 'hit') { Sfx.hit(e.power); table.spark(e.x, e.y, Math.min(14, 3 + e.power * 4), e.who === 'me' ? 'rgba(255,170,70,' : 'rgba(110,235,255,', 0.5 + e.power * 0.25); G.idle = 0; hint(''); }
        else if (e.type === 'wall') { Sfx.wall(e.power); table.spark(e.x, e.y, Math.min(8, 2 + e.power * 2), 'rgba(220,255,90,', 0.4 + e.power * 0.15); }
        else if (e.type === 'goal') goal(e.by, e);
      }
      sim.events.length = 0;
      if (G.state === 'play') {
        // seven-second rule: if the code cannot get the puck off its own half, the puck is yours
        if (sim.puck.y > T.L / 2) { G.hog += dt; if (G.hog > 7) { G.hog = 0; banner('7 SECONDS · YOUR PUCK', TableColors.rail, true); serve('me'); } } else G.hog = 0;
      }
      if (G.state === 'play') {                              // nudge a player who has not found the puck yet
        var pk = sim.puck;
        if (Math.hypot(pk.vx, pk.vy) < 0.05 && pk.y < T.L / 2) { G.idle += dt; if (G.idle > 1.6) hint(G.pointer == null && !('ontouchstart' in window) ? 'MOVE THE MOUSE · HIT THE PUCK' : 'DRAG TO HIT THE PUCK'); }
        else G.idle = 0;
      }
    }
    table.update(dt, inMatch() ? sim : null);
    if (sp) {
      sp.update(dt);
      var tx, ty;
      if (G.mode === 'bust' && G.state !== 'result') {       // it watches the puck
        var f = clamp(sp.pos() / 2, 0, 1);
        tx = clamp(sim.puck.x * 0.16, -0.075, 0.075) * f + Math.sin(G.time * 0.7) * 0.012;
        ty = clamp((0.55 - sim.puck.y / T.L) * 0.12, -0.05, 0.06) * f + Math.sin(G.time * 0.9 + 1) * 0.006;
      } else {
        tx = G.tiltTo[0] + (G.drag ? 0 : Math.sin(G.time * 0.6) * 0.03); ty = G.tiltTo[1] + (G.drag ? 0 : Math.cos(G.time * 0.47) * 0.012);
      }
      var kf = 1 - Math.exp(-dt * (G.drag ? 18 : 5));
      G.tilt[0] += (tx - G.tilt[0]) * kf; G.tilt[1] += (ty - G.tilt[1]) * kf;
      sp.tilt = G.tilt;
      sp.wobble = lerp(WOBBLE[Math.min(5, sp.level)], WOBBLE[Math.min(5, sp.level + 1)], sp.t) * (sp.look.cut ? 1 : 0.5);
    }
    G.shake = Math.max(0, G.shake - dt * 3.2);
    if (G.state === 'title') { readout('t'); if (sp) curve(); }
    else if (G.state === 'lab') { readout('l'); if (sp && sp.moving()) $('labSlider').value = Math.round(sp.pos() / sp.last() * 1000); }
    else readout('r');
  }
  function render() {
    glr.clear();
    var sp = G.sprite;
    if (sp) {
      var r = spriteRect(), look = sp.look;
      var q = clamp(r.w * dpr / look.W, 0.5, 2) * G.qScale;
      var px = look.W * look.H * q * q; if (px > 1.7e6) q *= Math.sqrt(1.7e6 / px);
      var bob = G.mode === 'bust' ? Math.sin(G.time * 1.3) * 1.5 * U : 0;
      var noisy = clamp(1 - sp.pos() / 2, 0, 1);
      var floor = G.mode === 'bust' ? clamp(1 - (table.railTopY + 5 * U - r.y - bob) / r.h, 0, 1) : -1;
      sp.draw({ x: r.x * dpr, y: (r.y + bob) * dpr, w: r.w * dpr, h: r.h * dpr }, { floor: floor, q: q, alpha: clamp((G.time - G.born) / 0.5, 0, 1), scan: G.mode === 'bust' ? 0.3 * noisy : 0, tint: [0.75, 0.97, 1], mask: look.cut ? clamp(1 - sp.pos(), 0, 1) : 0 });
    }
    if (G.state !== 'title' && G.state !== 'lab' && G.state !== 'end' && G.state !== 'boot') {
      table.draw(fg, { sim: sim, time: G.time, showPuck: G.state !== 'goal' && G.state !== 'result' && G.state !== 'intro', holo: 1, serve: G.state === 'serve' || (G.state === 'play' && G.idle > 0.4) ? 1 : 0 });
    }
    var s = G.shake * G.shake * 7 * U;
    app.style.transform = s > 0.2 ? 'translate(' + ((Math.random() - 0.5) * s).toFixed(1) + 'px,' + ((Math.random() - 0.5) * s).toFixed(1) + 'px)' : '';
  }
  function frame(now) {
    window.requestAnimationFrame(frame);
    if (!G.ready) return;
    var dt = G.lastFrame ? (now - G.lastFrame) / 1000 : 0.016; G.lastFrame = now;
    if (dt > 0.05) G.slow += 2; else if (dt > 0.03) G.slow++; else G.slow = Math.max(0, G.slow - 1);
    if (G.slow > 90 && G.qScale > 0.5) { G.qScale = Math.max(0.5, G.qScale * 0.8); G.slow = 0; }   // weak GPU: draw the blobs smaller
    dt = Math.min(dt, 0.05);
    if (G.state !== 'paused') update(dt);
    render();
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    $('btnPause').innerHTML = ICON.pause;
    if (store('rvc.muted') === '1') Sfx.setMuted(true);
    soundIcon();
    G.progress = parseInt(store('rvc.progress') || '0', 10) || 0;
    window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);
    app.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(true); });
    glc.addEventListener('webglcontextlost', function (e) { e.preventDefault(); G.ready = false; });
    glc.addEventListener('webglcontextrestored', function () { window.location.reload(); });
    function click(id, fn) { $(id).addEventListener('click', function () { Sfx.unlock(); Sfx.click(); fn(); }); }
    click('btnPlay', function () { startRound(G.progress < ROUNDS.length ? G.progress : 0); });
    click('btnLab', function () { showLab(0); });
    click('btnGo', function () { serve('me'); });
    click('btnNext', function () { if (!G.win) startRound(G.round); else if (G.round + 1 < ROUNDS.length) startRound(G.round + 1); else showEnding(); });
    click('btnQuit', showTitle); click('btnExit', showTitle);
    click('btnResume', function () { pause(false); });
    click('btnRestart', function () { startRound(G.round); });
    click('btnPause', function () { pause(true); });
    $('btnSound').addEventListener('click', function () { Sfx.unlock(); toggleSound(); Sfx.click(); });
    click('btnLabBack', showTitle);
    click('btnReplay', function () { learn(0.25, 1.5); });
    click('btnScatter', function () { if (G.sprite) { G.sprite.kick(1.2); Sfx.scatter(); } });
    click('btnAgain', function () { G.progress = 0; store('rvc.progress', '0'); startRound(0); });
    click('btnEndLab', function () { showLab(0); });
    $('labSlider').addEventListener('input', function () { if (G.sprite) { G.seq = null; G.sprite.setPos(this.value / 1000 * G.sprite.last()); } });

    resize();
    window.requestAnimationFrame(frame);
    var getMan = EMB ? Promise.resolve(EMB.manifest) : fetch('data/manifest.json').then(function (r) { return r.json(); });
    getMan.then(function (m) {
      man = m;
      glr = new Blobs.BlobGL(glc, man);
      if (!glr.ok) { setState('fail'); return null; }
      return loadLook('lean', function (f) { $('bootBar').style.width = Math.round(f * 100) + '%'; });
    }).then(function (look) {
      if (!look) return;
      G.ready = true; showTitle();
      preload([ROUNDS[Math.min(G.progress, ROUNDS.length - 1)].look]);
    }).catch(function (err) {
      $('bootMsg').textContent = 'COULD NOT LOAD'; if (window.console) console.error(err);
    });
  }
  // handles for testing from the console: RVC.tick(2) runs two seconds of game time at once
  window.RVC = {
    G: G, sim: sim, brain: brain, table: table, startRound: startRound, showLab: showLab, showEnding: showEnding, showTitle: showTitle, goal: goal, looks: looks,
    tick: function (seconds) { for (var t = 0; t < seconds; t += 1 / 120) update(1 / 120); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
