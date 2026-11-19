// The post "uber shader": one fragment shader, twelve looks. A style is just a set of uniform values
// (see STYLES in catalog.js), so switching styles never recompiles anything.
import { Color, Vector2 } from 'three';
import { STYLES } from '../catalog.js';

export const STYLE_DEFAULTS = { chroma: 0, scan: 0, grain: 0, vign: .4, sat: 1, contrast: 1, bright: 1, hue: 0, poster: 0, halftone: 0, pixel: 0, glitch: 0, kale: 0, invert: 0, duo: 0 };
const INTEGER_KNOBS = ['kale', 'pixel', 'halftone', 'poster'];

export function makeStyleShader() {
  const uniforms = { tDiffuse: { value: null }, res: { value: new Vector2(1, 1) }, time: { value: 0 }, beat: { value: 0 }, duoA: { value: new Color() }, duoB: { value: new Color() } };
  for (const k in STYLE_DEFAULTS) uniforms[k] = { value: STYLE_DEFAULTS[k] };
  return {
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 res;
      uniform float time, beat, chroma, scan, grain, vign, sat, contrast, bright, hue, poster, halftone, pixel, glitch, kale, invert, duo;
      uniform vec3 duoA, duoB; varying vec2 vUv;
      vec3 hueShift(vec3 c, float a){ const vec3 k = vec3(.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1. - ca); }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        if (kale > 1.5) { vec2 p = uv - .5; p.x *= res.x / res.y; float a = atan(p.y, p.x) + time * .05; float r = length(p); float seg = 6.28318 / kale; a = mod(a, seg); a = abs(a - seg * .5); p = vec2(cos(a), sin(a)) * r; p.x /= res.x / res.y; uv = p + .5; }
        if (pixel > 1.) { vec2 px = res / pixel; uv = (floor(uv * px) + .5) / px; }
        if (glitch > 0.) { float band = floor(uv.y * 24.); float k = step(1. - glitch * (.12 + beat * .5), rnd(vec2(band, floor(time * 14.)))); uv.x += k * (rnd(vec2(band, floor(time * 9.))) - .5) * .14 * glitch; }
        vec2 dir = uv - .5; float ca = chroma * (.002 + .012 * beat);
        vec3 c = vec3(texture2D(tDiffuse, uv + dir * ca * 2.).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir * ca * 2.).b);
        c = hueShift(c, hue);
        float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, sat); c = (c - .5) * contrast + .5; c *= bright;
        if (duo > 0.) c = mix(c, mix(duoA, duoB, smoothstep(.05, .95, l)), duo);
        if (poster > 1.) c = floor(c * poster + .5) / poster;
        if (halftone > 0.) { vec2 cell = fract(gl_FragCoord.xy / halftone) - .5; float lum = clamp(dot(c, vec3(.333)), 0., 1.); float rad = sqrt(lum) * .72; float d = 1. - smoothstep(rad - .1, rad + .1, length(cell)); c = mix(c, vec3(d) * mix(vec3(1.), c * 1.6, .35), .9); }
        if (scan > 0.) c *= 1. - scan * (.5 + .5 * sin(gl_FragCoord.y * 1.5708));
        if (invert > 0.) c = mix(c, 1. - c, invert * beat);
        c += (rnd(gl_FragCoord.xy + fract(time) * 100.) - .5) * grain;
        vec2 v = vUv - .5; c *= 1. - dot(v, v) * vign * 2.;
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
      }`,
  };
}

/**
 * Writes a style into the shader uniforms and the bloom pass. Returns the per-frame bits the world needs.
 * @param {string} key @param {() => number} rs seeded rng @param {{c:string[]}} P palette
 */
export function applyStyle(key, rs, P, SU, bloom) {
  const S = STYLES[key] || STYLES.clean;
  for (const k in STYLE_DEFAULTS) SU[k].value = STYLE_DEFAULTS[k];
  for (const k in S.u) {
    if (!(k in SU)) continue;
    const v = S.u[k];
    SU[k].value = INTEGER_KNOBS.includes(k) ? v : v * (.8 + rs() * .4);
  }
  if (S.u.kale) SU.kale.value = 3 + (rs() * 6 | 0);
  if (S.u.pixel) SU.pixel.value = 4 + (rs() * 8 | 0);
  if (S.u.halftone) SU.halftone.value = 4 + (rs() * 4 | 0);
  if (S.u.poster) SU.poster.value = 4 + (rs() * 4 | 0);
  const hueDrift = S.u.hueDrift ? S.u.hueDrift * (rs() < .5 ? -1 : 1) : 0;
  if (S.duo === 'pal') { SU.duoA.value.set('#050307'); SU.duoB.value.set(P.c[0]); }
  if (S.duo === 'thermal') { SU.duoA.value.set('#1a0b4a'); SU.duoB.value.set('#ffd166'); }
  const bloomBase = S.bloom * .5 * (.8 + rs() * .4);
  bloom.radius = .2 + rs() * .3; bloom.threshold = .78 + rs() * .12;
  return { hueDrift, bloomBase };
}
