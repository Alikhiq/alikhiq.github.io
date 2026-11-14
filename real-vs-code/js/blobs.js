/* Blob renderer.
 *
 * A "look" is a person rebuilt from 2D Gaussian blobs: a position, two radii, a rotation, a colour,
 * a weight and a depth each. The image is the weighted average of every blob that reaches a pixel:
 *
 *     colour(p) = sum_i w_i k_i(p) c_i / sum_i w_i k_i(p)        k_i(p) = max(0, exp(-d2/2) - cut)
 *     alpha(p)  = 1 - exp(-sum_i w_i k_i(p) / tau)
 *
 * That is exactly what the training code (tools/fit.py) optimised, so what is drawn here is the
 * trained picture and nothing else. The sums are order independent: blobs are drawn additively into
 * a float framebuffer and divided out in a second pass.
 */
(function (global) {
  'use strict';

  var FLOATS = 10; // x, y, log s1, log s2, theta, r, g, b, w, z

  // ------------------------------------------------------------------ decoding
  function decodeLook(name, meta, buf, man) {
    var levels = [], o = 0;
    var pad = man.posPad, lsMin = man.lsMin, lsRange = man.lsMax - man.lsMin;
    for (var li = 0; li < meta.levels.length; li++) {
      var n = meta.levels[li].n;
      var x = new Uint16Array(buf.slice(o, o + 2 * n)); o += 2 * n;
      var y = new Uint16Array(buf.slice(o, o + 2 * n)); o += 2 * n;
      var u8 = new Uint8Array(buf, o, 9 * n); o += 9 * n;
      var a = new Float32Array(n * FLOATS), born = new Uint8Array(n);
      for (var i = 0; i < n; i++) {
        var j = i * FLOATS;
        a[j] = (x[i] / 65535 * (1 + 2 * pad) - pad) * meta.W;
        a[j + 1] = (y[i] / 65535 * (1 + 2 * pad) - pad) * meta.H;
        a[j + 2] = u8[i] / 255 * lsRange + lsMin;
        a[j + 3] = u8[n + i] / 255 * lsRange + lsMin;
        a[j + 4] = u8[2 * n + i] / 256 * Math.PI;
        a[j + 5] = u8[3 * n + i] / 255;
        a[j + 6] = u8[4 * n + i] / 255;
        a[j + 7] = u8[5 * n + i] / 255;
        var w = u8[6 * n + i] / 255;
        a[j + 8] = w * w;
        a[j + 9] = u8[7 * n + i] / 255;
        born[i] = u8[8 * n + i];
      }
      levels.push({ n: n, a: a, born: born, step: meta.levels[li].step, loss: meta.levels[li].loss, psnr: meta.levels[li].psnr });
    }
    return {
      name: name, W: meta.W, H: meta.H, cut: meta.cut, face: meta.face, zPivot: meta.zPivot,
      curve: meta.curve, levels: levels, maxN: levels[levels.length - 1].n, pairs: {}
    };
  }

  /* The two ends of the step from level L to L+1, index aligned.
   * Blobs that exist in both are interpolated; blobs born on the way start invisible and small. */
  function pairFor(look, L) {
    if (look.pairs[L]) return look.pairs[L];
    var A = look.levels[L], B = look.levels[L + 1], n = B.n;
    var from = new Float32Array(n * FLOATS);
    for (var i = 0; i < n; i++) {
      var j = i * FLOATS, k;
      if (i < A.n && !B.born[i]) {
        for (k = 0; k < FLOATS; k++) from[j + k] = A.a[j + k];
        var d = B.a[j + 4] - A.a[j + 4];            // rotation: take the short way round
        d -= Math.PI * Math.round(d / Math.PI);
        from[j + 4] = B.a[j + 4] - d;
      } else {
        for (k = 0; k < FLOATS; k++) from[j + k] = B.a[j + k];
        from[j + 2] -= 1.0; from[j + 3] -= 1.0;     // starts small...
        from[j + 8] = 0;                            // ...and invisible
      }
    }
    var keys = Object.keys(look.pairs);              // keep at most 3 cached
    if (keys.length > 2) delete look.pairs[keys[0]];
    return (look.pairs[L] = { from: from, to: B.a, n: n });
  }

  // ------------------------------------------------------------------ shaders
  var VS_SPLAT = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec2 a_corner;',
    'layout(location=1) in vec4 a_A0; layout(location=2) in vec4 a_A1; layout(location=3) in vec2 a_A2;',
    'layout(location=4) in vec4 a_B0; layout(location=5) in vec4 a_B1; layout(location=6) in vec2 a_B2;',
    'uniform vec2 u_size; uniform float u_q, u_t, u_spread, u_chaos, u_wobble, u_time, u_zPivot, u_R, u_flight, u_count;',
    'uniform vec2 u_tilt;',
    'out vec2 v_uv; out vec4 v_col;',
    'uint hashu(uint x){ x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }',
    'float rnd(uint i, uint k){ return float(hashu(i * 747796405U + k * 2891336453U + 1U) >> 8) / 16777216.0; }',
    'void main(){',
    '  uint id = uint(gl_InstanceID);',
    '  float r1 = rnd(id,1U), r2 = rnd(id,2U), r3 = rnd(id,3U), r4 = rnd(id,4U);',
    '  float ti = clamp(u_t * (1.0 + u_spread) - r1 * u_spread, 0.0, 1.0);',
    '  ti = ti * ti * (3.0 - 2.0 * ti);',
    '  vec4 p0 = mix(a_A0, a_B0, ti); vec4 p1 = mix(a_A1, a_B1, ti); vec2 p2 = mix(a_A2, a_B2, ti);',
    '  vec2 mu = p0.xy; vec2 sg = exp(p0.zw); float th = p1.x; float w = p2.x; float z = p2.y;',
    '  float fly = sin(ti * 3.14159265);',
    '  mu += fly * u_flight * (vec2(r2, r3) - 0.5) * (8.0 + 0.5 * length(a_B0.xy - a_A0.xy));',
    '  float ang = r2 * 6.2831853 + u_time * (r3 - 0.5) * 1.6;',
    '  mu += u_chaos * vec2(cos(ang), sin(ang)) * u_size.x * (0.05 + 0.55 * r4 * r4);',
    '  mu += u_wobble * sg * vec2(sin(u_time * (1.1 + 2.3 * r3) + r2 * 40.0), cos(u_time * (0.9 + 2.1 * r4) + r1 * 40.0));',
    '  float zr = 0.32 * tanh((z - u_zPivot) / 0.32);',          // depth relative to the face, softly limited
    '  mu += zr * u_tilt;',
    '  vec2 s = sg * u_q;',
    '  float aa = 0.09 * max(0.0, 1.0 - u_q * u_q);',          // keep tiny blobs stable when drawn below training size
    '  vec2 s2 = sqrt(s * s + aa);',
    '  w *= (s.x * s.y) / (s2.x * s2.y);',
    '  float c = cos(th), sn = sin(th);',
    '  vec2 e = a_corner * u_R;',
    '  vec2 off = vec2(c * e.x * s2.x - sn * e.y * s2.y, sn * e.x * s2.x + c * e.y * s2.y);',
    '  vec2 clip = (mu * u_q + off) / (u_size * u_q) * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  if (w <= 0.0 || float(gl_InstanceID) >= u_count) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
    '  v_uv = e; v_col = vec4(p1.yzw, w);',
    '}'
  ].join('\n');

  var FS_SPLAT = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_uv; in vec4 v_col; uniform float u_cut; out vec4 o;',
    'void main(){',
    '  float k = exp(-0.5 * dot(v_uv, v_uv)) - u_cut;',
    '  if (k <= 0.0) discard;',
    '  float g = v_col.a * k;',
    '  o = vec4(v_col.rgb * g, g);',
    '}'
  ].join('\n');

  var VS_QUAD = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec2 a_corner; uniform vec4 u_rect; uniform vec2 u_view; out vec2 v_tex;',
    'void main(){',
    '  vec2 t = a_corner * 0.5 + 0.5;',
    '  vec2 px = u_rect.xy + vec2(t.x, 1.0 - t.y) * u_rect.zw;',
    '  gl_Position = vec4(px.x / u_view.x * 2.0 - 1.0, 1.0 - px.y / u_view.y * 2.0, 0.0, 1.0);',
    '  v_tex = t;',
    '}'
  ].join('\n');

  var FS_RESOLVE = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_tex; uniform sampler2D u_acc; uniform float u_tau, u_alpha, u_opaque, u_flash, u_scan, u_time, u_mask, u_floor;',
    'uniform vec3 u_tint; out vec4 o;',
    'void main(){',
    '  vec4 acc = texture(u_acc, v_tex);',
    '  float sw = acc.a;',
    '  vec3 rgb = acc.rgb / max(sw, 1e-5);',
    '  float a = 1.0 - exp(-sw / u_tau);',
    '  a = mix(a * smoothstep(0.0, 0.035, v_tex.y), step(1e-5, sw) * min(1.0, sw * 400.0), u_opaque);',   // cut-outs: clean bottom edge
    '  vec2 e = abs(v_tex - 0.5) * 2.0;',                      // untrained noise has no outline yet: soften the slab's edges
    '  a *= mix(1.0, (1.0 - smoothstep(0.5, 0.98, e.x)) * (1.0 - smoothstep(0.62, 0.98, e.y)), u_mask);',
    '  a *= smoothstep(u_floor - 0.012, u_floor + 0.03, v_tex.y);',   // the projection ends at the table edge
    '  rgb = mix(rgb, u_tint, u_flash);',
    '  float line = 1.0 - u_scan * (0.5 + 0.5 * sin(v_tex.y * 900.0 - u_time * 6.0)) * 0.35;',
    '  o = vec4(rgb * line, 1.0) * a * u_alpha;',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  // ------------------------------------------------------------------ GL renderer
  function BlobGL(canvas, man) {
    this.canvas = canvas; this.man = man; this.ok = false;
    this.R = man.R; this.cut = Math.exp(-0.5 * man.R * man.R); this.tau = man.tau;
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return;
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return;
    try {
      this.splat = program(gl, VS_SPLAT, FS_SPLAT);
      this.resolve = program(gl, VS_QUAD, FS_RESOLVE);
    } catch (e) { if (global.console) console.warn('blob shaders failed', e); return; }
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.bufA = gl.createBuffer(); this.bufB = gl.createBuffer(); this.cap = 0;
    this.vao = gl.createVertexArray();
    this.vaoQuad = gl.createVertexArray();
    gl.bindVertexArray(this.vaoQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.tex = gl.createTexture(); this.fbo = gl.createFramebuffer(); this.fw = 0; this.fh = 0;
    this.ok = this._target(64, 64);
    this.frags = 0;
  }

  BlobGL.prototype._target = function (w, h) {
    var gl = this.gl;
    if (w === this.fw && h === this.fh) return true;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fw = w; this.fh = h;
    return ok;
  };

  BlobGL.prototype._attribs = function () {
    var gl = this.gl, st = FLOATS * 4, self = this;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function inst(buf, base) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      var sizes = [4, 4, 2], offs = [0, 16, 32];
      for (var i = 0; i < 3; i++) {
        gl.enableVertexAttribArray(base + i); gl.vertexAttribPointer(base + i, sizes[i], gl.FLOAT, false, st, offs[i]);
        gl.vertexAttribDivisor(base + i, 1);
      }
    }
    inst(self.bufA, 1); inst(self.bufB, 4);
    gl.bindVertexArray(null);
  };

  /* Upload the two ends of a morph. `from` and `to` are Float32Array(n * 10). */
  BlobGL.prototype.upload = function (from, to, n) {
    var gl = this.gl;
    if (n > this.cap) {
      this.cap = Math.ceil(n * 1.1);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufA); gl.bufferData(gl.ARRAY_BUFFER, this.cap * FLOATS * 4, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufB); gl.bufferData(gl.ARRAY_BUFFER, this.cap * FLOATS * 4, gl.DYNAMIC_DRAW);
      this._attribs();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufA); gl.bufferSubData(gl.ARRAY_BUFFER, 0, from, 0, n * FLOATS);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, to, 0, n * FLOATS);
    this.n = n;
  };

  /* Draw the blobs into the float buffer.  o: {W,H,q,t,spread,chaos,wobble,time,tilt:[x,y],zPivot,flight,count} */
  BlobGL.prototype.render = function (o) {
    var gl = this.gl, s = this.splat;
    var fw = Math.max(8, Math.round(o.W * o.q)), fh = Math.max(8, Math.round(o.H * o.q));
    this._target(fw, fh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, fw, fh);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(s.p);
    gl.uniform2f(s.u.u_size, o.W, o.H); gl.uniform1f(s.u.u_q, fw / o.W);
    gl.uniform1f(s.u.u_t, o.t || 0); gl.uniform1f(s.u.u_spread, o.spread || 0);
    gl.uniform1f(s.u.u_chaos, o.chaos || 0); gl.uniform1f(s.u.u_wobble, o.wobble || 0);
    gl.uniform1f(s.u.u_time, o.time || 0); gl.uniform1f(s.u.u_zPivot, o.zPivot || 0);
    gl.uniform1f(s.u.u_flight, o.flight || 0);
    gl.uniform1f(s.u.u_count, o.count == null ? this.n : o.count);
    gl.uniform2f(s.u.u_tilt, o.tilt ? o.tilt[0] : 0, o.tilt ? o.tilt[1] : 0);
    gl.uniform1f(s.u.u_R, this.R); gl.uniform1f(s.u.u_cut, this.cut);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  BlobGL.prototype.clear = function () {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  };

  /* Divide out the weights and put the picture on the canvas. rect in canvas pixels. */
  BlobGL.prototype.present = function (rect, o) {
    var gl = this.gl, r = this.resolve; o = o || {};
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(r.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(r.u.u_acc, 0);
    gl.uniform4f(r.u.u_rect, rect.x, rect.y, rect.w, rect.h);
    gl.uniform2f(r.u.u_view, this.canvas.width, this.canvas.height);
    gl.uniform1f(r.u.u_tau, this.tau); gl.uniform1f(r.u.u_alpha, o.alpha == null ? 1 : o.alpha);
    gl.uniform1f(r.u.u_opaque, o.opaque ? 1 : 0); gl.uniform1f(r.u.u_flash, o.flash || 0);
    gl.uniform1f(r.u.u_scan, o.scan || 0); gl.uniform1f(r.u.u_time, o.time || 0); gl.uniform1f(r.u.u_mask, o.mask || 0); gl.uniform1f(r.u.u_floor, o.floor == null ? -1 : o.floor);
    var t = o.tint || [1, 1, 1]; gl.uniform3f(r.u.u_tint, t[0], t[1], t[2]);
    gl.bindVertexArray(this.vaoQuad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };

  // ------------------------------------------------------------------ a look on screen
  /* Holds one look, which training level it is showing and where it is in a morph between two. */
  function Sprite(glr, look) {
    this.glr = glr; this.look = look;
    this.level = 0; this.t = 0; this.pairL = -1;
    this.target = 0; this.speed = 0;
    this.chaos = 0; this.chaosV = 0; this.wobble = 0; this.tilt = [0, 0]; this.flash = 0;
    this.time = 0; this.q = 1;
    this.setLevel(0);
  }
  Sprite.prototype.last = function () { return this.look.levels.length - 1; };
  /* position on the training timeline: 0 = noise ... last = fully trained (fractions are mid-morph) */
  Sprite.prototype.pos = function () { return this.level + this.t; };
  Sprite.prototype._bind = function (L) {
    L = Math.max(0, Math.min(this.last() - 1, L));
    if (this.pairL !== L || this.glr.owner !== this) {
      var p = pairFor(this.look, L);
      this.glr.upload(p.from, p.to, p.n); this.pairL = L; this.glr.owner = this;
    }
    return L;
  };
  Sprite.prototype.setPos = function (v) {
    v = Math.max(0, Math.min(this.last(), v));
    var L = Math.min(this.last() - 1, Math.floor(v));
    this.level = L; this.t = v - L; this.target = v;
  };
  Sprite.prototype.setLevel = function (L) { this.setPos(L); };
  Sprite.prototype.morphTo = function (v, seconds) {
    this.target = Math.max(0, Math.min(this.last(), v));
    this.speed = Math.abs(this.target - this.pos()) / Math.max(0.01, seconds);
  };
  Sprite.prototype.moving = function () { return Math.abs(this.target - this.pos()) > 1e-4; };
  Sprite.prototype.kick = function (amount) { this.chaosV += amount * 9; };
  Sprite.prototype.update = function (dt) {
    this.time += dt;
    var p = this.pos();
    if (p !== this.target) {
      var d = this.target - p, stepv = this.speed * dt;
      p = Math.abs(d) <= stepv ? this.target : p + Math.sign(d) * stepv;
      var L = Math.min(this.last() - 1, Math.floor(p)); this.level = L; this.t = p - L;
    }
    // scatter is a damped spring back to zero
    this.chaosV += (-this.chaos * 60 - this.chaosV * 9) * dt;
    this.chaos = Math.max(0, this.chaos + this.chaosV * dt);
    if (this.chaos === 0 && this.chaosV < 0) this.chaosV = 0;
    this.flash = Math.max(0, this.flash - dt * 3);
  };
  /* numbers for the read-out, interpolated along the morph */
  Sprite.prototype.stats = function () {
    var A = this.look.levels[this.level], B = this.look.levels[Math.min(this.last(), this.level + 1)], t = this.t;
    return {
      step: Math.round(A.step + (B.step - A.step) * t),
      loss: Math.exp(Math.log(A.loss) + (Math.log(B.loss) - Math.log(A.loss)) * t),
      blobs: Math.round(A.n + (B.n - A.n) * t)
    };
  };
  Sprite.prototype.draw = function (rect, o) {
    o = o || {};
    var L = this._bind(this.level), look = this.look;
    var q = o.q || this.q;
    this.glr.render({
      W: look.W, H: look.H, q: q, t: this.t, spread: o.spread == null ? 1.2 : o.spread,
      chaos: this.chaos + (o.chaos || 0), wobble: o.wobble == null ? this.wobble : o.wobble, time: this.time,
      tilt: [this.tilt[0] * look.W, this.tilt[1] * look.W], zPivot: look.zPivot, flight: o.flight == null ? 1 : o.flight
    });
    this.glr.present(rect, { alpha: o.alpha, opaque: !look.cut, flash: this.flash + (o.flash || 0), tint: o.tint, scan: o.scan, time: this.time, mask: o.mask, floor: o.floor });
    return L;
  };

  global.Blobs = { decodeLook: decodeLook, pairFor: pairFor, BlobGL: BlobGL, Sprite: Sprite, FLOATS: FLOATS };
})(window);
