// The WebGL world: background (color / video / 360° photo / the user's file), one 3D scene, the 2D overlay
// as an additive layer, the tag, then bloom and the style pass. Loaded lazily so the UI paints first.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { A } from '../../audio/analysis.js';
import { mulberry32 } from '../../core/rng.js';
import { envById, ENVS, DISPLAY_FONT, BODY_FONT } from '../catalog.js';
import { SCENES } from './scenes.js';
import { makeStyleShader, applyStyle } from './style.js';

const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

/**
 * @param {{canvas: HTMLCanvasElement, overlay: HTMLCanvasElement, getTitle: () => string, showTag: () => boolean, onError: (key: string) => void}} o
 * @returns the world api, or null when WebGL is not available
 */
export function createWorld({ canvas, overlay, getTitle, showTag, onError }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const lowPower = /Mobi|Android/i.test(navigator.userAgent);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, .05, 500);
  const roomEnv = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = roomEnv;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111122, .35));

  function quad(mat, order, into = scene) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; m.renderOrder = order; into.add(m); return m; }
  // background plane, cover-fitted
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, has: { value: 0 }, texAR: { value: 1 }, viewAR: { value: 1 }, col: { value: new THREE.Color('#07050a') }, dim: { value: .75 }, push: { value: 0 } },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tex; uniform float has, texAR, viewAR, dim, push; uniform vec3 col; varying vec2 vUv;
      void main(){ vec2 uv = vUv - .5; float r = viewAR / texAR; if (r > 1.) uv.y /= r; else uv.x *= r; uv = uv / (1. + push) + .5;
        vec3 c = has > .5 ? texture2D(tex, uv).rgb : col; gl_FragColor = vec4(c * dim, 1.); }`,
    depthTest: false, depthWrite: false,
  });
  const bgQuad = quad(bgMat, -1000), BU = bgMat.uniforms;
  // 2D families on top, added like light
  const overTex = new THREE.CanvasTexture(overlay); overTex.colorSpace = THREE.SRGBColorSpace;
  const overQuad = quad(new THREE.ShaderMaterial({
    uniforms: { tex: { value: overTex }, amt: { value: 1 } }, vertexShader: QUAD_VS,
    fragmentShader: 'uniform sampler2D tex; uniform float amt; varying vec2 vUv; void main(){ vec4 c = texture2D(tex, vUv); gl_FragColor = vec4(c.rgb * amt * .85, c.a); }',
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }), 1000);
  // tag + track title: its own scene, drawn after the post chain so the signature stays crisp in every style.
  // The canvas is redrawn only when its text or the size changes.
  const hudScene = new THREE.Scene();
  const hud = document.createElement('canvas'), hg = hud.getContext('2d');
  const hudTex = new THREE.CanvasTexture(hud); hudTex.colorSpace = THREE.SRGBColorSpace;
  const hudQuad = quad(new THREE.ShaderMaterial({ uniforms: { tex: { value: hudTex } }, vertexShader: QUAD_VS, fragmentShader: 'uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tex, vUv);\n#include <colorspace_fragment>\n}', transparent: true, depthTest: false, depthWrite: false }), 0, hudScene);
  let hudW = 0, hudH = 0, hudTag = null, hudTitle = null;
  function drawHud(W, H) {
    const tag = showTag(), title = tag ? getTitle() : '';
    if (W === hudW && H === hudH && tag === hudTag && title === hudTitle) return;
    hudW = W; hudH = H; hudTag = tag; hudTitle = title;
    hudQuad.visible = tag; if (!tag) return;
    hud.width = W; hud.height = H;
    const M = Math.min(W, H) * (H > W ? 1.3 : 1), pad = M * .045; hg.textBaseline = 'alphabetic'; // a bit larger on vertical video
    hg.shadowColor = 'rgba(0,0,0,.7)'; hg.shadowBlur = M * .012;
    hg.fillStyle = 'rgba(244,239,233,0.94)'; hg.font = '800 ' + Math.round(M * .042) + 'px ' + DISPLAY_FONT; hg.fillText('@clasuke', pad, H - pad);
    if (title) { hg.fillStyle = 'rgba(244,239,233,0.72)'; hg.font = '600 ' + Math.round(M * .022) + 'px ' + BODY_FONT; hg.fillText(title, pad, H - pad - M * .058); }
    hudTex.needsUpdate = true;
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .8, .5, .55); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const stylePass = new ShaderPass(makeStyleShader()); composer.addPass(stylePass);
  const SU = stylePass.uniforms;

  // ---- backgrounds ----
  const videos = {}, panos = {}, images = {};
  let envId = null, paused = false;
  function videoFor(e) {
    if (!videos[e.id]) {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = e.src;
      const tx = new THREE.VideoTexture(v); tx.colorSpace = THREE.SRGBColorSpace;
      v.addEventListener('loadedmetadata', () => { if (envId === e.id) BU.texAR.value = v.videoWidth / v.videoHeight; });
      v.addEventListener('error', () => { if (envId === e.id) { BU.has.value = 0; onError('bgFail'); } });
      videos[e.id] = { v, tx };
    }
    return videos[e.id];
  }
  function setEnv(id, P, rr) {
    const e = envById(id) || ENVS[0];
    for (const k in videos) if (k !== e.id) videos[k].v.pause();
    envId = e.id;
    scene.background = null; scene.environment = roomEnv; bgQuad.visible = true;
    BU.col.value.set(P.bg); BU.dim.value = .55 + rr() * .3; BU.has.value = 0;
    if (e.type === 'video') {
      const o = videoFor(e); BU.tex.value = o.tx; BU.has.value = 1;
      if (o.v.videoWidth) BU.texAR.value = o.v.videoWidth / o.v.videoHeight;
      if (!paused) o.v.play().catch(() => {});
    } else if (e.type === 'image') {
      const apply = tx => { if (envId !== e.id) return; BU.tex.value = tx; BU.texAR.value = tx.image.width / tx.image.height; BU.has.value = 1; };
      if (images[e.id]) apply(images[e.id]);
      else new THREE.TextureLoader().load(e.src, tx => { tx.colorSpace = THREE.SRGBColorSpace; images[e.id] = tx; apply(tx); }, undefined, () => onError('bgFail'));
    } else if (e.type === 'hdri') {
      const blur = rr() * .08, inten = .6 + rr() * .45;
      const apply = tx => { if (envId !== e.id) return; scene.background = tx; scene.environment = tx; scene.backgroundBlurriness = blur; scene.backgroundIntensity = inten; bgQuad.visible = false; };
      if (panos[e.id]) apply(panos[e.id]);
      else new THREE.TextureLoader().load(e.src, tx => { tx.mapping = THREE.EquirectangularReflectionMapping; tx.colorSpace = THREE.SRGBColorSpace; panos[e.id] = tx; apply(tx); }, undefined, () => onError('bgFail'));
    }
  }

  // ---- 3D scene ----
  let active = null, added = [], shake = false, zoom = 0, hueDrift = 0, bloomBase = .3;
  const ctx = { add: o => { scene.add(o); added.push(o); return o; }, camera, scene, lowPower };
  function clearScene() {
    for (const o of added) {
      scene.remove(o);
      o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose()); });
    }
    added = []; active = null; scene.fog = null;
  }
  function setScene(key, seed, P) {
    clearScene();
    const C = { bg: new THREE.Color(P.bg), c: P.c.map(h => new THREE.Color(h)) };
    if (key !== 'none' && SCENES[key]) active = SCENES[key](mulberry32(seed), C, ctx);
  }

  canvas.addEventListener('webglcontextlost', e => e.preventDefault());

  return {
    canvas,
    /** Builds everything for a visual made by recipe.js */
    apply(V) {
      setEnv(V.env, V.P, mulberry32(V.seed ^ 0xc2b2ae35));
      setScene(V.s3, V.seed ^ 0x85ebca6b, V.P);
      const st = applyStyle(V.style, mulberry32(V.seed ^ 0x27d4eb2f), V.P, SU, bloom);
      hueDrift = st.hueDrift; bloomBase = st.bloomBase; SU.hue.value = 0;
      shake = V.shake; zoom = V.zoom;
    },
    resize(w, h) {
      renderer.setSize(w, h, false); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix(); BU.viewAR.value = w / h; SU.res.value.set(w, h);
      // canvas textures get fixed-size storage on the GPU: drop it so the next upload matches the new size
      overTex.dispose(); overTex.needsUpdate = true; hudTex.dispose(); hudW = 0;
    },
    /** @param F shared frame object @param {boolean} hasLayers whether the 2D overlay drew anything */
    frame(dt, F, hasLayers) {
      overQuad.visible = hasLayers; if (hasLayers) overTex.needsUpdate = true;
      drawHud(canvas.width, canvas.height);
      if (active) active.update(F); else { camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); }
      if (shake && A.beatPulse > .3) { const k = .08 * A.beatPulse * F.I; camera.position.x += (Math.random() - .5) * k; camera.position.y += (Math.random() - .5) * k; }
      BU.push.value = A.bass * zoom * F.I;
      if (scene.background) { scene.backgroundRotation.y = F.t * .03; scene.environmentRotation.y = F.t * .03; }
      SU.time.value = F.t; SU.beat.value = A.beatPulse; if (hueDrift) SU.hue.value = F.t * hueDrift;
      bloom.strength = bloomBase * (.75 + A.bass * .5 * F.I);
      composer.render(dt);
      if (hudQuad.visible) { renderer.autoClear = false; renderer.setRenderTarget(null); renderer.render(hudScene, camera); renderer.autoClear = true; }
    },
    /** Forces the tag to redraw (fonts finished loading, language changed). */
    refreshHud() { hudW = 0; },
    /** Pauses or resumes the background video with the tab. */
    setPaused(p) {
      paused = p; const o = videos[envId]; if (!o) return;
      if (p) o.v.pause(); else o.v.play().catch(() => {});
    },
    info() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
  };
}
