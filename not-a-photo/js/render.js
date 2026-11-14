/* Drawing.
 *
 * Every picture stands in the hall as a sheet of blobs. A blob is a small soft-edged ellipse lying in
 * the sheet, pushed forward or back by its depth, so the sheet has real relief and real parallax.
 * A picture is drawn in two passes: all its blobs are added into a floating-point buffer, then that
 * buffer is divided out (weighted average) and laid over the scene. Nothing is a texture: the blobs are
 * evaluated per pixel, so the picture is as sharp as the canvas, at any size.
 */
(function (global) {
  'use strict';
  var FL = Blobs.FLOATS;

  var HASH = [
    'uint hashu(uint x){ x ^= x >> 16; x *= 0x7feb352dU; x ^= x >> 15; x *= 0x846ca68bU; x ^= x >> 16; return x; }',
    'float rnd(uint i, uint k){ return float(hashu(i * 747796405U + k * 2891336453U + 1U) >> 8) / 16777216.0; }'
  ].join('\n');

  var VS_SPLAT = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec2 a_corner;',
    'layout(location=1) in vec4 a_A0; layout(location=2) in vec4 a_A1; layout(location=3) in vec2 a_A2;',
    'layout(location=4) in vec4 a_B0; layout(location=5) in vec4 a_B1; layout(location=6) in vec2 a_B2;',
    'uniform mat4 u_vp;',
    'uniform vec3 u_anchor, u_right, u_up, u_normal, u_cam;',   // anchor: bottom centre of the sheet. right/up: one picture pixel, in metres
    'uniform vec2 u_size;',
    'uniform float u_t, u_spread, u_time, u_flight, u_cloud, u_burst, u_shrink, u_wobble, u_zPivot, u_relief, u_R, u_count;',
    'uniform float u_mirror, u_fall, u_bubble, u_focal, u_px;',
    'out vec2 v_uv; out vec4 v_col; out vec2 v_pos;',
    HASH,
    'void main(){',
    '  uint id = uint(gl_InstanceID);',
    '  float r1 = rnd(id,1U), r2 = rnd(id,2U), r3 = rnd(id,3U), r4 = rnd(id,4U);',
    '  float ti = clamp(u_t * (1.0 + u_spread) - r1 * u_spread, 0.0, 1.0);',
    '  ti = ti * ti * (3.0 - 2.0 * ti);',
    '  vec4 p0 = mix(a_A0, a_B0, ti); vec4 p1 = mix(a_A1, a_B1, ti); vec2 p2 = mix(a_A2, a_B2, ti);',
    '  vec2 mu = p0.xy; vec2 sg = exp(p0.zw); float th = p1.x; float w = p2.x; float z = p2.y;',
    '  float fly = sin(ti * 3.14159265);',
    '  mu += fly * u_flight * (vec2(r2, r3) - 0.5) * (8.0 + 0.5 * length(a_B0.xy - a_A0.xy));',
    '  mu += u_wobble * sg * vec2(sin(u_time * (1.1 + 2.3 * r3) + r2 * 40.0), cos(u_time * (0.9 + 2.1 * r4) + r1 * 40.0));',
    // out of the sheet: the relief of the finished picture, a deep scatter while it is still noise, a kick mid-flight
    '  float zr = 0.32 * tanh((z - u_zPivot) / 0.32);',
    '  float depth = zr * u_relief + (r4 - 0.5) * u_cloud * (1.0 + 0.6 * sin(u_time * (0.3 + r2) + r1 * 30.0)) + fly * u_flight * (r1 - 0.5) * 0.5;',
    '  vec3 P = u_anchor + u_right * (mu.x - u_size.x * 0.5) + u_up * (u_size.y - mu.y) + u_normal * depth;',
    // breaking apart as the camera reaches it
    '  vec3 bd = normalize(vec3(r2 - 0.5, r3 - 0.5, r4 - 0.5) + 1e-4);',
    '  P += (bd * (0.25 + r1) + vec3(0.0, 0.25, 0.0)) * u_burst;',
    // nothing stays in the camera\'s face: blobs slide round it like a bubble
    '  vec3 dc = P - u_cam; float dl = length(dc);',
    '  float bk = clamp(1.0 - dl / u_bubble, 0.0, 1.0);',
    '  P += dc / max(dl, 1e-3) * bk * bk * u_bubble * 0.85;',
    '  float height = P.y;',
    '  P.y *= u_mirror;',
    '  vec4 clip = u_vp * vec4(P, 1.0);',
    '  vec2 s = sg * (1.0 - 0.8 * u_shrink * r3);',
    // keep far, tiny blobs at least half a pixel wide (and proportionally fainter) so they do not sparkle
    '  vec2 spx = s * u_px * u_focal / max(clip.w, 0.05);',
    '  vec2 grow = max(vec2(1.0), 0.5 / max(spx, vec2(1e-4)));',
    '  s *= grow; w /= (grow.x * grow.y);',
    '  float c = cos(th), sn = sin(th);',
    '  vec2 e = a_corner * u_R;',
    '  vec2 off = vec2(c * e.x * s.x - sn * e.y * s.y, sn * e.x * s.x + c * e.y * s.y);',   // picture pixels: x right, y down
    '  vec3 Q = P + u_right * off.x - u_up * off.y * u_mirror;',
    '  gl_Position = u_vp * vec4(Q, 1.0);',
    '  if (w <= 0.0 || float(gl_InstanceID) >= u_count || clip.w < 0.12) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
    '  v_uv = e; v_pos = (mu + off) / u_size;',
    '  v_col = vec4(p1.yzw * mix(1.0, exp(-max(height, 0.0) * u_fall), step(u_mirror, 0.0)), w);',
    '}'
  ].join('\n');

  var FS_SPLAT = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_uv; in vec4 v_col; in vec2 v_pos;',
    'uniform float u_cut, u_clip, u_mask, u_foot; out vec4 o;',
    'void main(){',
    '  float k = exp(-0.5 * dot(v_uv, v_uv)) - u_cut;',
    '  if (k <= 0.0) discard;',
    '  if (u_clip > 0.5 && (v_pos.x < 0.0 || v_pos.x > 1.0 || v_pos.y < 0.0 || v_pos.y > 1.0)) discard;',   // whole photos keep a clean frame
    '  vec2 e = abs(v_pos - 0.5) * 2.0;',
    '  float m = mix(1.0, (1.0 - smoothstep(0.5, 0.98, e.x)) * (1.0 - smoothstep(0.6, 0.98, e.y)), u_mask);',   // noise has no outline yet
    '  m *= mix(1.0, 1.0 - smoothstep(0.965, 1.0, v_pos.y), u_foot);',                                         // cut-outs: tidy lower edge
    '  float g = v_col.a * k * m;',
    '  o = vec4(v_col.rgb * g, g);',
    '}'
  ].join('\n');

  var VS_FULL = [
    '#version 300 es',
    'precision highp float;',
    'out vec2 v_ndc;',
    'void main(){ vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0); v_ndc = p; gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  var FS_RESOLVE = [
    '#version 300 es',
    'precision highp float;',
    'uniform sampler2D u_acc; uniform float u_tau, u_opaque, u_alpha, u_gain, u_add; out vec4 o;',
    'void main(){',
    '  vec4 acc = texelFetch(u_acc, ivec2(gl_FragCoord.xy), 0);',
    '  float sw = acc.a; if (sw < 1e-5) discard;',
    '  vec3 rgb = acc.rgb / sw;',
    '  float a = mix(1.0 - exp(-sw / u_tau), min(1.0, sw * 400.0), u_opaque) * u_alpha;',
    '  o = vec4(rgb * a * u_gain, a * (1.0 - u_add));',
    '}'
  ].join('\n');

  /* the hall itself: a dark floor running to the horizon, two rails, sleepers between them */
  var FS_HALL = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_ndc;',
    'uniform vec3 u_cam, u_fwd, u_right, u_up; uniform float u_tan, u_aspect, u_rail, u_time, u_end; uniform vec4 u_lp[8]; uniform vec4 u_lc[8]; out vec4 o;',
    'void main(){',
    '  vec3 ray = normalize(u_fwd + u_right * v_ndc.x * u_tan * u_aspect + u_up * v_ndc.y * u_tan);',
    '  vec3 col = vec3(0.010, 0.011, 0.026);',
    '  col += vec3(0.020, 0.040, 0.130) * exp(-abs(ray.y) * 7.0);',                    // glow at the horizon
    '  col += vec3(0.030, 0.012, 0.050) * exp(-abs(ray.y - 0.25) * 3.0) * 0.5;',
    '  if (ray.y < -0.0004) {',
    '    float t = -u_cam.y / ray.y; vec3 p = u_cam + ray * t;',
    '    float fog = exp(-t * 0.028);',
    '    float ax = fwidth(p.x), az = fwidth(p.z);',
    '    float dx = abs(abs(p.x) - u_rail);',
    '    float core = exp(-pow(dx / max(0.02, ax * 0.8), 2.0));',
    '    col += vec3(0.85, 1.0, 0.24) * (core * 2.4 + exp(-dx * 4.5) * 0.085) * fog * step(u_end, p.z);',
    '    float dz = abs(mod(p.z + 1.0, 2.0) - 1.0);',
    '    float sl = exp(-pow(dz / max(0.012, az * 0.8), 2.0)) * step(abs(p.x), u_rail) * step(u_end, p.z);',
    '    col += vec3(0.20, 0.36, 1.0) * sl * 0.30 * fog;',
    '    float mx = abs(p.x);',
    '    col += vec3(0.08, 0.12, 0.42) * exp(-pow(mx / max(0.010, ax * 0.8), 2.0)) * 0.5 * fog * step(u_end, p.z);',   // centre line
    '    col += vec3(0.012, 0.020, 0.070) * pow(1.0 - abs(ray.y), 5.0) * fog;',                                          // sheen
    '    for (int i = 0; i < 8; i++) {',                                                                                  // each picture lights the floor in its own colour
    '      vec2 q = (p.xz - u_lp[i].xz) / u_lp[i].w; q.y *= 1.6;',
    '      col += u_lc[i].rgb * u_lc[i].a * exp(-dot(q, q)) * fog;',
    '    }',
    '  }',
    '  o = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* neon tubes: lines in the world, drawn as ribbons that always face the camera */
  var VS_LINE = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec3 a_p0; layout(location=1) in vec3 a_p1; layout(location=2) in vec3 a_col; layout(location=3) in vec4 a_par;',
    'uniform mat4 u_vp; uniform vec2 u_view; uniform float u_focal; uniform float u_glow[10];',
    'out vec3 v_col; out float v_side;',
    'void main(){',
    '  vec4 c0 = u_vp * vec4(a_p0, 1.0), c1 = u_vp * vec4(a_p1, 1.0);',
    '  if (c0.w < 0.3 || c1.w < 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
    '  vec2 s0 = c0.xy / c0.w * u_view * 0.5, s1 = c1.xy / c1.w * u_view * 0.5;',
    '  vec2 dir = normalize(s1 - s0 + vec2(1e-5)), nrm = vec2(-dir.y, dir.x);',
    '  vec4 c = mix(c0, c1, a_par.y);',
    '  float wpx = max(1.1, a_par.z * u_focal / c.w) * 3.5;',
    '  vec2 sp = mix(s0, s1, a_par.y) + nrm * a_par.x * wpx + dir * (a_par.y * 2.0 - 1.0) * wpx * 0.3;',
    '  gl_Position = vec4(sp / (u_view * 0.5) * c.w, c.z, c.w);',
    '  v_side = a_par.x * 3.5;',
    '  v_col = a_col * u_glow[int(a_par.w + 0.5)] * exp(-c.w * 0.022);',
    '}'
  ].join('\n');
  var FS_LINE = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 v_col; in float v_side; out vec4 o;',
    'void main(){ float d = abs(v_side); o = vec4(v_col * (exp(-d * d) * 2.4 + exp(-d * 1.3) * 0.22) + vec3(1.0) * exp(-d * d * 6.0) * 0.6 * length(v_col), 0.0); }'
  ].join('\n');

  /* dust: small blobs adrift in the air, wrapped into a box that travels with the camera */
  var VS_DUST = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec4 a_seed;',
    'uniform mat4 u_vp; uniform vec3 u_cam; uniform float u_time, u_focal, u_dpr;',
    'out vec4 v_col;',
    'void main(){',
    '  vec3 box = vec3(22.0, 7.5, 46.0);',
    '  vec3 p = a_seed.xyz * box;',
    '  p += vec3(sin(u_time * 0.11 + a_seed.w * 40.0), sin(u_time * 0.07 + a_seed.w * 17.0) * 0.6, u_time * 0.05) * 1.3;',
    '  p.x = mod(p.x - u_cam.x + box.x * 0.5, box.x) - box.x * 0.5 + u_cam.x;',
    '  p.y = mod(p.y, box.y) + 0.05;',
    '  p.z = u_cam.z + 3.0 - mod(u_cam.z + 3.0 - p.z, box.z);',
    '  vec4 c = u_vp * vec4(p, 1.0);',
    '  gl_Position = c;',
    '  float sz = (0.012 + 0.03 * a_seed.w * a_seed.w) * u_focal / max(c.w, 0.2);',
    '  gl_PointSize = clamp(sz, 1.5 * u_dpr, 60.0 * u_dpr);',
    '  float tw = 0.55 + 0.45 * sin(u_time * (0.6 + a_seed.w * 2.0) + a_seed.x * 80.0);',
    '  vec3 tint = mix(vec3(0.30, 0.55, 1.0), mix(vec3(0.85, 1.0, 0.3), vec3(1.0, 0.45, 0.75), fract(a_seed.w * 7.0)), step(0.72, fract(a_seed.w * 13.0)));',
    '  float near = smoothstep(0.4, 2.5, c.w);',
    '  v_col = vec4(tint * tw * 0.16 * near * exp(-c.w * 0.03) * min(1.0, sz / (1.5 * u_dpr)), 1.0);',
    '}'
  ].join('\n');
  var FS_DUST = [
    '#version 300 es',
    'precision highp float;',
    'in vec4 v_col; out vec4 o;',
    'void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float k = exp(-dot(d, d) * 3.2) - 0.04; if (k <= 0.0) discard; o = vec4(v_col.rgb * k, 0.0); }'
  ].join('\n');

  var FS_BRIGHT = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_ndc; uniform sampler2D u_tex; uniform vec2 u_texel; out vec4 o;',
    'void main(){',
    '  vec2 uv = v_ndc * 0.5 + 0.5;',                       // four bilinear taps = a 4x4 box: a clean quarter-size copy
    '  vec3 c = (texture(u_tex, uv + u_texel * vec2(-1.0, -1.0)).rgb + texture(u_tex, uv + u_texel * vec2(1.0, -1.0)).rgb',
    '          + texture(u_tex, uv + u_texel * vec2(-1.0, 1.0)).rgb + texture(u_tex, uv + u_texel * vec2(1.0, 1.0)).rgb) * 0.25;',
    '  float l = max(c.r, max(c.g, c.b)); o = vec4(c * smoothstep(0.62, 1.25, l), 1.0);',
    '}'
  ].join('\n');
  var FS_BLUR = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_ndc; uniform sampler2D u_tex; uniform vec2 u_dir; out vec4 o;',
    'void main(){',
    '  vec2 uv = v_ndc * 0.5 + 0.5; vec3 c = texture(u_tex, uv).rgb * 0.227027;',
    '  c += (texture(u_tex, uv + u_dir * 1.384615).rgb + texture(u_tex, uv - u_dir * 1.384615).rgb) * 0.316216;',
    '  c += (texture(u_tex, uv + u_dir * 3.230769).rgb + texture(u_tex, uv - u_dir * 3.230769).rgb) * 0.070270;',
    '  o = vec4(c, 1.0);',
    '}'
  ].join('\n');
  var FS_FINAL = [
    '#version 300 es',
    'precision highp float;',
    'in vec2 v_ndc; uniform sampler2D u_scene, u_b1, u_b2; uniform float u_time, u_fade, u_aspect; out vec4 o;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'void main(){',
    '  vec2 uv = v_ndc * 0.5 + 0.5;',
    '  vec3 c = texture(u_scene, uv).rgb;',
    '  c += texture(u_b1, uv).rgb * 0.55 + texture(u_b2, uv).rgb * 0.75;',
    '  float v = dot(v_ndc * vec2(min(u_aspect, 1.6) / 1.6, 1.0), v_ndc * vec2(min(u_aspect, 1.6) / 1.6, 1.0));',
    '  c *= 1.0 - 0.34 * smoothstep(0.35, 1.9, v);',
    '  c += (h(gl_FragCoord.xy + fract(u_time) * 91.7) - 0.5) * 0.018;',
    '  o = vec4(clamp(c, 0.0, 1.0) * u_fade, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').slice(0, 4).join('\n'));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  // ------------------------------------------------------------------ camera maths
  function camera(cam, w, h) {
    var f = cam.fwd, r = cam.right, u = cam.up, c = cam.pos, t = Math.tan(cam.fovY / 2), a = w / h, n = 0.1, far = 400;
    var V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
      -(r[0] * c[0] + r[1] * c[1] + r[2] * c[2]), -(u[0] * c[0] + u[1] * c[1] + u[2] * c[2]), f[0] * c[0] + f[1] * c[1] + f[2] * c[2], 1];
    var P = [1 / (a * t), 0, 0, 0, 0, 1 / t, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0];
    var m = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += P[k * 4 + j] * V[i * 4 + k]; m[i * 4 + j] = s; }
    cam.vp = m; cam.tan = t; cam.aspect = a; cam.focal = h / 2 / t; cam.w = w; cam.h = h;
    return cam;
  }
  /* world point -> [pixel x, pixel y (from the top), depth]; depth <= 0 means behind the camera */
  function project(cam, x, y, z) {
    var m = cam.vp, cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    var cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    return [(cx / cw * 0.5 + 0.5) * cam.w, (0.5 - cy / cw * 0.5) * cam.h, cw];
  }

  // ------------------------------------------------------------------ renderer
  function Renderer(canvas, man) {
    this.canvas = canvas; this.ok = false; this.why = '';
    this.R = man.R; this.cut = Math.exp(-0.5 * man.R * man.R); this.tau = man.tau;
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) { this.why = 'no WebGL 2'; return; }
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) { this.why = 'no float render targets'; return; }
    try {
      this.pSplat = program(gl, VS_SPLAT, FS_SPLAT); this.pResolve = program(gl, VS_FULL, FS_RESOLVE);
      this.pHall = program(gl, VS_FULL, FS_HALL); this.pLine = program(gl, VS_LINE, FS_LINE); this.pDust = program(gl, VS_DUST, FS_DUST);
      this.pBright = program(gl, VS_FULL, FS_BRIGHT); this.pBlur = program(gl, VS_FULL, FS_BLUR); this.pFinal = program(gl, VS_FULL, FS_FINAL);
    } catch (e) { this.why = String(e.message || e); if (global.console) console.warn(e); return; }
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), 8192);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vaoNone = gl.createVertexArray();
    this.scene = this._tex(); this.acc = this._tex(); this.b1a = this._tex(); this.b1b = this._tex(); this.b2a = this._tex(); this.b2b = this._tex();
    this.w = 0; this.h = 0; this.looks = {}; this.frags = 0;
    // dust
    var n = 2600, d = new Float32Array(n * 4), i;
    for (i = 0; i < n * 4; i++) d[i] = Math.random();
    this.dustN = n; this.vaoDust = gl.createVertexArray(); gl.bindVertexArray(this.vaoDust);
    var db = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, db); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    this.ok = true;
  }
  Renderer.prototype._tex = function () { var gl = this.gl; return { tex: gl.createTexture(), fbo: gl.createFramebuffer(), w: 0, h: 0 }; };
  Renderer.prototype._size = function (t, w, h, mips) {
    var gl = this.gl; if (t.w === w && t.h === h) return true;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); t.w = w; t.h = h; return ok;
  };
  Renderer.prototype.resize = function (w, h) {
    if (w === this.w && h === this.h) return true;
    this.canvas.width = w; this.canvas.height = h; this.w = w; this.h = h;
    var ok = this._size(this.scene, w, h, false) && this._size(this.acc, w, h, false);
    var q = Math.max(1, Math.round(w / 4)), r = Math.max(1, Math.round(h / 4));
    this._size(this.b1a, q, r); this._size(this.b1b, q, r);
    q = Math.max(1, Math.round(w / 10)); r = Math.max(1, Math.round(h / 10));
    this._size(this.b2a, q, r); this._size(this.b2b, q, r);
    return ok;
  };

  // ---- per-picture GPU buffers
  Renderer.prototype._attribs = function (vao, bufA, bufB) {
    var gl = this.gl, st = FL * 4;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function inst(buf, base) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      var sizes = [4, 4, 2], offs = [0, 16, 32];
      for (var i = 0; i < 3; i++) { gl.enableVertexAttribArray(base + i); gl.vertexAttribPointer(base + i, sizes[i], gl.FLOAT, false, st, offs[i]); gl.vertexAttribDivisor(base + i, 1); }
    }
    inst(bufA, 1); inst(bufB, 4);
    gl.bindVertexArray(null);
  };
  Renderer.prototype._look = function (look) {
    var g = this.looks[look.name];
    if (g) return g;
    var gl = this.gl;
    g = { bufA: gl.createBuffer(), bufB: gl.createBuffer(), vao: gl.createVertexArray(), L: -1, n: 0, bufR: gl.createBuffer(), vaoR: gl.createVertexArray(), nR: 0 };
    gl.bindBuffer(gl.ARRAY_BUFFER, g.bufA); gl.bufferData(gl.ARRAY_BUFFER, look.maxN * FL * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.bufB); gl.bufferData(gl.ARRAY_BUFFER, look.maxN * FL * 4, gl.DYNAMIC_DRAW);
    this._attribs(g.vao, g.bufA, g.bufB);
    var lr = look.levels[Math.min(look.last, look.cut ? 3 : 2)];      // the floor shows a rough, early stage: a blurred reflection for free
    gl.bindBuffer(gl.ARRAY_BUFFER, g.bufR); gl.bufferData(gl.ARRAY_BUFFER, lr.a, gl.STATIC_DRAW); g.nR = lr.n;
    this._attribs(g.vaoR, g.bufR, g.bufR);
    return (this.looks[look.name] = g);
  };
  Renderer.prototype._pair = function (look, g, L) {
    if (g.L === L) return;
    var gl = this.gl, p = Blobs.pairFor(look, L);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.bufA); gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.from, 0, p.n * FL);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.bufB); gl.bufferSubData(gl.ARRAY_BUFFER, 0, p.to, 0, p.n * FL);
    g.L = L; g.n = p.n;
  };

  // ---- neon
  Renderer.prototype.setLines = function (lines) {            // [{a:[x,y,z], b:[x,y,z], color:[r,g,b], width, group}]
    var gl = this.gl, n = lines.length, v = new Float32Array(n * 4 * 13), ix = new Uint16Array(n * 6), i, k, o = 0;
    for (i = 0; i < n; i++) {
      var l = lines[i];
      for (k = 0; k < 4; k++) {
        v.set(l.a, o); v.set(l.b, o + 3); v.set(l.color, o + 6);
        v[o + 9] = k & 1 ? 1 : -1; v[o + 10] = k >> 1; v[o + 11] = l.width; v[o + 12] = l.group; o += 13;
      }
      ix.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    }
    this.vaoLine = gl.createVertexArray(); gl.bindVertexArray(this.vaoLine);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    var sizes = [3, 3, 3, 4], offs = [0, 12, 24, 36];
    for (i = 0; i < 4; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, sizes[i], gl.FLOAT, false, 52, offs[i]); }
    var e = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, e); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  };
  Renderer.prototype.lines = function (cam, first, count, glow) {
    var gl = this.gl, p = this.pLine;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo); gl.viewport(0, 0, this.w, this.h);
    gl.disable(gl.SCISSOR_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(p.p); gl.uniformMatrix4fv(p.u.u_vp, false, cam.vp); gl.uniform2f(p.u.u_view, this.w, this.h);
    gl.uniform1f(p.u.u_focal, cam.focal); gl.uniform1fv(p.u.u_glow, glow);
    gl.bindVertexArray(this.vaoLine); gl.drawElements(gl.TRIANGLES, count * 6, gl.UNSIGNED_SHORT, first * 12); gl.bindVertexArray(null);
  };

  // ---- frame
  Renderer.prototype.begin = function (cam, o) {
    var gl = this.gl, p = this.pHall;
    this.frags = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo); gl.viewport(0, 0, this.w, this.h);
    gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
    gl.useProgram(p.p);
    gl.uniform3fv(p.u.u_cam, cam.pos); gl.uniform3fv(p.u.u_fwd, cam.fwd); gl.uniform3fv(p.u.u_right, cam.right); gl.uniform3fv(p.u.u_up, cam.up);
    gl.uniform1f(p.u.u_tan, cam.tan); gl.uniform1f(p.u.u_aspect, cam.aspect); gl.uniform1f(p.u.u_rail, o.rail); gl.uniform1f(p.u.u_time, o.time); gl.uniform1f(p.u.u_end, o.end);
    gl.uniform4fv(p.u.u_lp, o.lp); gl.uniform4fv(p.u.u_lc, o.lc);
    gl.bindVertexArray(this.vaoNone); gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* One picture. pc: {look, anchor, right, normal, H, pos (0..last on the training timeline), cloud, burst, shrink, alpha,
   *                   gain, wobble, relief, time}. mirror: draw its reflection in the floor instead. */
  Renderer.prototype.piece = function (cam, pc, mirror) {
    var gl = this.gl, look = pc.look, g = this._look(look), s = this.pSplat, r = this.pResolve;
    var px = pc.H / look.H, Wm = look.W * px, i;
    // where is it on screen?
    var marg = 0.3 + pc.cloud * 0.35 + pc.burst * 1.6, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, full = false;
    for (i = 0; i < 8; i++) {
      var lx = (i & 1 ? 1 : -1) * (Wm / 2 + marg), ly = i & 2 ? pc.H + marg : -marg, lz = (i & 4 ? 1 : -1) * (pc.relief + pc.cloud * 0.9 + pc.burst * 1.4 + 0.2);
      var wx = pc.anchor[0] + pc.right[0] * lx + pc.normal[0] * lz, wy = (pc.anchor[1] + ly) * (mirror ? -1 : 1), wz = pc.anchor[2] + pc.right[2] * lx + pc.normal[2] * lz;
      var q = project(cam, wx, wy, wz);
      if (q[2] < 2.6) { full = true; break; }
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
    }
    if (full) { x0 = 0; y0 = 0; x1 = this.w; y1 = this.h; }
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(this.w, Math.ceil(x1) + 2); y1 = Math.min(this.h, Math.ceil(y1) + 2);
    if (x1 <= x0 || y1 <= y0) return false;
    var L = Math.min(look.last - 1, Math.max(0, Math.floor(pc.pos))), t = Math.min(1, Math.max(0, pc.pos - L)), vao, n;
    if (mirror) { vao = g.vaoR; n = g.nR; } else { this._pair(look, g, L); vao = g.vao; n = g.n; }
    // 1: add every blob into the float buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.acc.fbo); gl.viewport(0, 0, this.w, this.h);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(x0, this.h - y1, x1 - x0, y1 - y0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(s.p);
    gl.uniformMatrix4fv(s.u.u_vp, false, cam.vp);
    gl.uniform3fv(s.u.u_anchor, pc.anchor); gl.uniform3f(s.u.u_right, pc.right[0] * px, pc.right[1] * px, pc.right[2] * px); gl.uniform3f(s.u.u_up, 0, px, 0);
    gl.uniform3fv(s.u.u_normal, pc.normal); gl.uniform3fv(s.u.u_cam, mirror ? [cam.pos[0], -cam.pos[1] - 50, cam.pos[2]] : cam.pos);
    gl.uniform2f(s.u.u_size, look.W, look.H);
    gl.uniform1f(s.u.u_t, mirror ? 1 : t); gl.uniform1f(s.u.u_spread, 1.2); gl.uniform1f(s.u.u_time, pc.time); gl.uniform1f(s.u.u_flight, mirror ? 0 : 1);
    gl.uniform1f(s.u.u_cloud, pc.cloud); gl.uniform1f(s.u.u_burst, pc.burst); gl.uniform1f(s.u.u_shrink, pc.shrink); gl.uniform1f(s.u.u_wobble, mirror ? 0 : pc.wobble);
    gl.uniform1f(s.u.u_zPivot, look.zPivot); gl.uniform1f(s.u.u_relief, pc.relief); gl.uniform1f(s.u.u_R, this.R); gl.uniform1f(s.u.u_count, n);
    gl.uniform1f(s.u.u_mirror, mirror ? -1 : 1); gl.uniform1f(s.u.u_fall, 0.42); gl.uniform1f(s.u.u_bubble, 2.3);
    gl.uniform1f(s.u.u_focal, cam.focal); gl.uniform1f(s.u.u_px, px);
    gl.uniform1f(s.u.u_cut, this.cut); gl.uniform1f(s.u.u_clip, look.cut ? 0 : 1);
    gl.uniform1f(s.u.u_mask, look.cut ? Math.min(1, Math.max(0, 1 - pc.pos)) : 0); gl.uniform1f(s.u.u_foot, look.cut ? 1 : 0);
    gl.bindVertexArray(vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.bindVertexArray(null);
    // 2: divide out and lay it over the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    if (mirror) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(r.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.acc.tex); gl.uniform1i(r.u.u_acc, 0);
    gl.uniform1f(r.u.u_tau, this.tau); gl.uniform1f(r.u.u_opaque, look.cut ? 0 : 1);
    gl.uniform1f(r.u.u_alpha, pc.alpha); gl.uniform1f(r.u.u_gain, pc.gain * (mirror ? 0.3 : 1)); gl.uniform1f(r.u.u_add, mirror ? 1 : 0);
    gl.bindVertexArray(this.vaoNone); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
    return true;
  };

  Renderer.prototype.dust = function (cam, time, dpr) {
    var gl = this.gl, p = this.pDust;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo); gl.viewport(0, 0, this.w, this.h);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(p.p); gl.uniformMatrix4fv(p.u.u_vp, false, cam.vp); gl.uniform3fv(p.u.u_cam, cam.pos);
    gl.uniform1f(p.u.u_time, time); gl.uniform1f(p.u.u_focal, cam.focal); gl.uniform1f(p.u.u_dpr, dpr);
    gl.bindVertexArray(this.vaoDust); gl.drawArrays(gl.POINTS, 0, this.dustN); gl.bindVertexArray(null);
  };

  Renderer.prototype._pass = function (prog, dst, w, h) {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst); gl.viewport(0, 0, w, h); gl.useProgram(prog.p);
  };
  /* glow, vignette, grain: scene -> canvas */
  Renderer.prototype.end = function (cam, time, fade) {
    var gl = this.gl, b = this.pBlur;
    gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
    gl.bindVertexArray(this.vaoNone);
    this._pass(this.pBright, this.b1a.fbo, this.b1a.w, this.b1a.h);
    gl.uniform1i(this.pBright.u.u_tex, 0); gl.uniform2f(this.pBright.u.u_texel, 1 / this.w, 1 / this.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    var self = this;
    function blur(src, dst, dx, dy) {
      self._pass(b, dst.fbo, dst.w, dst.h); gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(b.u.u_tex, 0); gl.uniform2f(b.u.u_dir, dx / src.w, dy / src.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    blur(this.b1a, this.b1b, 1, 0); blur(this.b1b, this.b1a, 0, 1);
    blur(this.b1a, this.b2a, 1.5, 0); blur(this.b2a, this.b2b, 0, 1.5); blur(this.b2b, this.b2a, 1.5, 0); blur(this.b2a, this.b2b, 0, 1.5);
    var f = this.pFinal;
    this._pass(f, null, this.w, this.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scene.tex); gl.uniform1i(f.u.u_scene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.b1a.tex); gl.uniform1i(f.u.u_b1, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.b2b.tex); gl.uniform1i(f.u.u_b2, 2);
    gl.uniform1f(f.u.u_time, time); gl.uniform1f(f.u.u_fade, fade); gl.uniform1f(f.u.u_aspect, cam.aspect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  };

  global.Render = { Renderer: Renderer, camera: camera, project: project };
})(window);
