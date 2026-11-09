/* Susu Ink & Glow: live 3D service icons in the booking tiles (Round City).
   One shared WebGL renderer draws each model and copies the frame into a small
   2D canvas per tile, so five icons cost one GL context. Models are Tripo3D
   image-to-3D meshes made from the gold icon renders (media/icons/*.webp stay
   as the fallback). Lazy-loaded near #book, paused off-screen and in hidden
   tabs, skipped under prefers-reduced-motion or without WebGL. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;
  const tiles = [...document.querySelectorAll('#booker .tile')];
  if (!tiles.length) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
  const ROOM_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
  const fine = matchMedia('(pointer: fine)').matches;
  // Front-facing yaw per model (Tripo exports some icons side-on) and how far each may sway.
  const FACE = { brows: -Math.PI / 2, lips: 0, pmu: -Math.PI / 2, tattoo: -Math.PI / 2, piercing: 0 };
  const SWAY = { brows: 0.32, lips: 0.42, pmu: 0.3, tattoo: 0.28, piercing: 0.5 };
  const ease = (k) => 1 - Math.pow(1 - k, 3);

  let booted = false;
  const near = new IntersectionObserver((ents) => {
    if (ents.some((e) => e.isIntersecting) && !booted) { booted = true; near.disconnect(); boot().catch(() => {}); }
  }, { rootMargin: '900px 0px' });
  near.observe(document.getElementById('booker'));

  async function boot() {
    const mark = window.__THREE__; delete window.__THREE__;
    let THREE, GLTFLoader, RoomEnvironment;
    try {
      THREE = await import(THREE_URL);
      ({ GLTFLoader } = await import(LOADER_URL));
      ({ RoomEnvironment } = await import(ROOM_URL));
    } finally { if (mark) window.__THREE__ = mark; }

    const SIZE = 256; // backing pixels per tile icon
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 0.1, 3.6);
    camera.lookAt(0, 0, 0);

    const loader = new GLTFLoader();
    const items = [];
    await Promise.all(tiles.map(async (tile, i) => {
      const key = tile.querySelector('input').value;
      let gltf;
      try { gltf = await loader.loadAsync(`media/models/${key}.glb`); } catch (e) { return; }
      const scene = new THREE.Scene();
      scene.environment = env;
      const key1 = new THREE.DirectionalLight(0xffe2bf, 2.2); key1.position.set(2, 3, 4); scene.add(key1);
      const rim = new THREE.DirectionalLight(0xffc9a0, 1.4); rim.position.set(-3, 1, -2); scene.add(rim);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
      model.position.sub(c);
      const pivot = new THREE.Group();
      const face = new THREE.Group();
      face.rotation.y = FACE[key] ?? 0;
      face.add(model);
      pivot.add(face);
      pivot.scale.setScalar(1.45 / Math.max(s.x, s.y, s.z));
      model.traverse((o) => {
        if (o.isMesh && o.material) {
          // Turn Tripo's matte beige PBR into polished champagne gold; keep the colour map for engraved detail.
          const m = o.material;
          m.color = new THREE.Color(0xffe0b8);
          m.metalnessMap = null; m.roughnessMap = null;
          m.metalness = 1; m.roughness = 0.3;
          m.envMapIntensity = 1.35;
          m.needsUpdate = true;
        }
      });
      scene.add(pivot);
      const base = pivot.scale.x;
      const art = tile.querySelector('.tile__art');
      const cv = document.createElement('canvas');
      cv.width = cv.height = SIZE; cv.className = 'tile__gl'; cv.setAttribute('aria-hidden', 'true');
      art.appendChild(cv);
      const input = tile.querySelector('input');
      const it = { tile, art, cv, ctx: cv.getContext('2d'), scene, pivot, key, base, phase: i * 1.3, lift: 0, tx: 0, ty: 0, flip: -1, shown: false };
      input.addEventListener('change', () => { if (input.checked) it.flip = performance.now(); });
      items.push(it);
    }));
    if (!items.length) { renderer.dispose(); return; }

    if (fine) items.forEach((it) => {
      it.tile.addEventListener('pointermove', (e) => {
        const r = it.tile.getBoundingClientRect();
        it.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
        it.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
      });
      it.tile.addEventListener('pointerleave', () => { it.tx = 0; it.ty = 0; });
    });

    let raf = 0, last = performance.now(), running = false;
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      for (const it of items) {
        const on = it.tile.querySelector('input').checked;
        const hover = it.tile.matches(':hover');
        it.lift += ((on ? 1 : hover ? 0.5 : 0) - it.lift) * Math.min(1, dt * 6);
        const idle = Math.sin(t / 1000 * 0.7 + it.phase);
        let flip = 0;
        if (it.flip >= 0) { const k = (t - it.flip) / 1100; if (k >= 1) it.flip = -1; else flip = ease(k) * Math.PI * 2; }
        it.pivot.rotation.y = idle * (SWAY[it.key] ?? 0.4) + flip + it.tx;
        it.pivot.rotation.x = 0.08 + idle * 0.04 + it.ty;
        it.pivot.position.y = Math.sin(t / 1000 * 1.3 + it.phase) * 0.035 + it.lift * 0.05;
        it.pivot.scale.setScalar(it.base * (1 + it.lift * 0.06));
        renderer.render(it.scene, camera);
        it.ctx.clearRect(0, 0, it.cv.width, it.cv.height);
        it.ctx.drawImage(renderer.domElement, 0, 0);
        if (!it.shown) { it.shown = true; it.art.classList.add('is-3d'); }
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const seen = new IntersectionObserver((ents) => { ents[0].isIntersecting ? start() : stop(); });
    seen.observe(document.getElementById('booker'));
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    renderer.domElement.addEventListener('webglcontextlost', () => {
      stop(); items.forEach((it) => { it.art.classList.remove('is-3d'); it.cv.remove(); });
    });
    reduce.addEventListener('change', (e) => { if (e.matches) { stop(); items.forEach((it) => { it.art.classList.remove('is-3d'); it.cv.remove(); }); } });
  }
})();
