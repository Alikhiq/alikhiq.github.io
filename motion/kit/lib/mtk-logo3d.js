// Mo Tint 3D wordmark in real-time WebGL (three.js r170): their two-part logo extruded from the brand SVG,
// obsidian black glass letters + dark chrome gold bolt, studio reflections, soft shadow onto the paper ground.
// Deterministic: everything is a pure function of time; call LOGO3D.intro(t) / LOGO3D.endcard(t) from seek().
import * as THREE from 'three';
import { SVGLoader } from '/cdn/three/jsm/loaders/SVGLoader.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const outq = (x) => { x = clamp(x); return 1 - (1 - x) ** 4; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
// SVG viewBox (800 x 288, y down) -> world (8 x 2.88 units, centred), on the front face
const FRONT = 0.215;
const sv = (x, y, z = FRONT) => V(x / 100 - 4, 1.44 - y / 100, z);
const K = 8 / 3; // scale from the earlier Blender rig (logo 3 units wide) to this one (8 units)

export async function createLogo3D() {
  const canvas = document.createElement('canvas'); canvas.className = 'gl3d';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(window.devicePixelRatio || 1); renderer.setSize(W, H, true);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  // two studio environments (product-shot practice): the glass sees only hard strips on black, so it stays
  // obsidian; the gold sees a warm full studio, so it reads as chrome gold and never brown
  const pmrem = new THREE.PMREMGenerator(renderer);
  const O = V(0, 0, 0);
  function studio(gold) {
    const env = new THREE.Scene(); env.background = new THREE.Color(0x000000);
    const panel = (w, h, pos, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(O); env.add(m); };
    panel(16, 0.45, V(0, 4.5, 10), 0xffffff, 12);   // long top highlight line
    panel(0.5, 12, V(-9, 0.5, 5), 0xffd9a6, 7);     // warm left strip
    panel(0.4, 12, V(9, -0.5, 4), 0xdfe8ff, 5);     // cool right strip
    if (gold) {
      panel(18, 7, V(0, 9, 3), 0xfff4e2, 2.2);      // overhead softbox
      panel(26, 8, V(0, 4.6, 16), 0xfff1dc, 2.4);   // front fill, upper half (bright)
      panel(26, 8, V(0, -3.6, 16), 0xb88a3c, 0.32); // front fill, lower half (dim) -> chrome horizon across the gold face
      panel(40, 20, V(0, -10, 0), 0xf2dcae, 0.9);   // warm floor bounce
    } else {
      panel(18, 7, V(0, 9, 3), 0xfff4e2, 0.9);      // faint overhead: a soft sheen on the black glass
    }
    return pmrem.fromScene(env, 0.015).texture;
  }
  const ENV_GLASS = studio(false), ENV_GOLD = studio(true);

  const OBS = new THREE.MeshPhysicalMaterial({ color: 0x030304, metalness: 0.0, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 0.5, envMap: ENV_GLASS, envMapIntensity: 1.0 });
  const GOLD = new THREE.MeshPhysicalMaterial({ color: 0xf3b83c, metalness: 1.0, roughness: 0.12, clearcoat: 0.5, clearcoatRoughness: 0.04, envMap: ENV_GOLD, envMapIntensity: 1.3 });

  const svgText = await (await fetch('/assets/mtk/wordmark-3d.svg')).text();
  const data = new SVGLoader().parse(svgText);
  const logo = new THREE.Group();
  for (const p of data.paths) {
    const id = (p.userData && p.userData.node && p.userData.node.id) || '';
    const shapes = SVGLoader.createShapes(p);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 15, bevelEnabled: true, bevelThickness: 3.2, bevelSize: 2.2, bevelSegments: 10, curveSegments: 40 });
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, id.startsWith('gold') ? GOLD : OBS);
    mesh.castShadow = true; mesh.receiveShadow = false; logo.add(mesh);
  }
  // SVG units -> world: x/100 - 4, y flipped; front face lands at z = (15 + 3.2)/100 ~ FRONT
  logo.scale.set(0.01, -0.01, 0.01); logo.position.set(-4, 1.44, 0.032);
  scene.add(logo);

  // soft contact shadow on the paper (a shadow-only plane just behind the mark)
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3.2, 4.2, 7.5); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 14; key.shadow.blurSamples = 24; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 4, bottom: -4, near: 0.5, far: 20 }); key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.25); fill.position.set(4, -1, 6); scene.add(fill);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.30 }));
  wall.position.z = -0.03; wall.receiveShadow = true; scene.add(wall);

  const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
  const vfov = (lens) => THREE.MathUtils.radToDeg(2 * Math.atan(18 / lens)); // 36mm sensor on the long (vertical) side
  function shoot(eye, tgt, lens, yaw) {
    cam.position.copy(eye); cam.up.set(0, 1, 0); cam.lookAt(tgt); cam.fov = vfov(lens); cam.updateProjectionMatrix();
    OBS.envMapRotation.set(0, yaw, 0); GOLD.envMapRotation.set(0, yaw * 0.6, 0);
    renderer.render(scene, cam);
  }
  const FINAL_EYE = V(0, 0.05, 8.6 * K), FINAL_TGT = V(0, 0.05, 0);
  // intro: three shots with hard cuts (seconds)
  function intro(t) {
    if (t < 1.5) {           // A: macro running down the gold bolt
      const k = t / 1.5; const tgt = lerpV(sv(612, 238), sv(560, 178), ease(k));
      const eye = tgt.clone().add(V(0.55 * K - 0.12 * K * k, 0.38 * K + 0.04 * K * k, 0.72 * K));
      shoot(eye, tgt, 100, -0.3 - 0.9 * ease(k));
    } else if (t < 2.9) {    // B: glancing macro across the obsidian M O
      const k = (t - 1.5) / 1.4; const tgt = lerpV(sv(70, 120), sv(240, 120), ease(k));
      const eye = tgt.clone().add(V(-0.6 * K, 0.46 * K, 0.78 * K));
      shoot(eye, tgt, 85, -1.0 + 1.7 * ease(k));
    } else {                 // C: from the N / bolt crossing, pull back to the full mark, straight-on
      const k = (t - 2.9) / 2.1; const m = outq(k / 0.78);
      const t0 = sv(528, 150); const e0 = t0.clone().add(V(0.36 * K, 0.16 * K, 0.95 * K));
      shoot(lerpV(e0, FINAL_EYE, m), lerpV(t0, FINAL_TGT, m), 60 - 10 * m, 0.9 - 0.9 * ease(k / 0.9));
    }
  }
  // end card: straight-on mark, one slow glint pass across the chrome
  function endcard(tl) { shoot(FINAL_EYE, FINAL_TGT, 50, 0.7 - 1.4 * ease(tl / 2.2)); }
  renderer.compile(scene, cam);
  return { canvas, intro, endcard, renderer };
}
