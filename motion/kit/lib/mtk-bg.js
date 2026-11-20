// Mo Tint environment shader: a dark studio cyclorama with drifting volumetric haze, and per-act looks
// (god-rays, heat haze, glare bands, gold caustics through tinted glass, heat wall, cool breeze, price spotlight).
// Rendered at low resolution (soft content) and scaled up; deterministic in t. Classic script; exposes window.BGFX.
(function () {
  const W = 540, H = 960;
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 R; uniform float T;
uniform float uLight, uHeat, uGlare, uGold, uCool, uDark, uWall, uPrice, uOn;
uniform vec2 uWin;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
float caustic(vec2 p, float t){ vec2 i = p; float c = 1.; float inten = .005;
  for (int n = 0; n < 4; n++) { float tt = t * (1. - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten))); }
  c /= 4.; c = clamp(1.17 - pow(c, 1.4), 0., 1.); return clamp(pow(c, 8.), 0., 1.); }
void main(){
  vec2 uv = gl_FragCoord.xy / R;                 // y up
  vec2 p = vec2(uv.x, uv.y * 1.7778);
  // cyclorama: dark floor, lifted wall, soft horizon
  float hor = smoothstep(.26, .44, uv.y);
  vec3 col = mix(vec3(.014, .015, .012), vec3(.060, .062, .052), hor);
  col += vec3(.030, .028, .022) * exp(-pow((uv.y - .35) * 9., 2.));          // horizon glow line
  // haze, domain-warped and drifting
  vec2 q = p * 2.1 + vec2(T * .035, -T * .012);
  float h = fbm(q + 1.6 * fbm(q * 1.4 + vec2(T * .05, 0.)));
  // key pool behind the window
  vec2 dw = (uv - uWin) * vec2(1., .62);
  float pool = exp(-dot(dw, dw) * 7.);
  col += vec3(.11, .10, .08) * pool * (1. - .75 * uDark) * (.7 + .5 * h);
  col += vec3(.045, .043, .037) * h * h * 1.2;
  // LIGHT: god-rays from the upper left through the haze
  vec2 src = vec2(.08, 1.08); vec2 dr = uv - src; float ang = atan(dr.y, dr.x);
  float rays = pow(.5 + .5 * sin(ang * 26. + 4. * fbm(vec2(ang * 5., T * .25))), 3.) * (.4 + .6 * fbm(vec2(ang * 18., length(dr) * 3. - T * .3)));
  col += vec3(1., .92, .76) * rays * exp(-length(dr) * 1.9) * (.2 + h * h * 1.6) * .75 * uLight;
  col += vec3(.10, .09, .07) * uLight * h;
  // HEAT: warm haze rising from below, wobbling
  float hw = fbm(p * 3.2 + vec2(0., -T * .7)) * fbm(p * 1.3 + vec2(T * .2, -T * .4));
  col += vec3(.62, .20, .05) * uHeat * smoothstep(.75, .0, uv.y) * (.25 + 1.4 * hw);
  // GLARE: anamorphic bands in the air at headlight height
  float band = exp(-pow((uv.y - .52) * 46., 2.)) + .55 * exp(-pow((uv.y - .505) * 120., 2.)) + .35 * exp(-pow((uv.y - .545) * 80., 2.));
  col += vec3(.55, .70, 1.) * uGlare * band * (.45 + .8 * h);
  // GOLD caustics: light through tinted glass, slow
  float c = caustic(p * 2.4 + vec2(0., 1.), T * .22);
  col += vec3(.96, .72, .26) * uGold * c * (.16 + .1 * h) * (1. - .4 * hor);
  col += vec3(.20, .15, .05) * uGold * pool * .5;
  // HEAT STAYS OUT: hot air on the outside of the glass, stopped at the glass line
  float side = smoothstep(.55, .0, uv.x);
  col += vec3(.40, .13, .04) * uWall * side * (.2 + .9 * fbm(p * 3. + vec2(T * .6, 0.)));
  // COOL: teal breeze flowing across the cab
  float fl = fbm(vec2(p.x * 1.6 - T * .45, p.y * 5.)) ;
  col += vec3(.16, .34, .42) * uCool * smoothstep(.15, .62, uv.y) * smoothstep(.95, .55, uv.y) * (.25 + 1.2 * fl * fl);
  // PRICE: gold bloom behind the number
  vec2 dp = (uv - vec2(.5, .58)) * vec2(1., 1.78);
  col += vec3(.95, .68, .18) * uPrice * (.30 * exp(-dot(dp, dp) * 5.) + .06 * h);
  // vignette + lift
  col *= 1. - .6 * pow(length((uv - vec2(.5, .52)) * vec2(1., .82)), 2.3);
  col = mix(vec3(.039, .043, .035), col, uOn);
  gl_FragColor = vec4(pow(clamp(col, 0., 1.), vec3(.95)), 1.);
}`;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.id = 'bgfx';
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['R', 'T', 'uLight', 'uHeat', 'uGlare', 'uGold', 'uCool', 'uDark', 'uWall', 'uPrice', 'uOn', 'uWin'].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
  gl.viewport(0, 0, W, H); gl.uniform2f(U.R, W, H);
  function render(t, k) {
    gl.uniform1f(U.T, t); ['uLight', 'uHeat', 'uGlare', 'uGold', 'uCool', 'uDark', 'uWall', 'uPrice', 'uOn'].forEach((n) => gl.uniform1f(U[n], k[n] || 0));
    gl.uniform2f(U.uWin, k.winX ?? 0.5, k.winY ?? 0.59); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  window.BGFX = { canvas: cv, render };
})();
