/* © 2026 Round City (roundcity.co) for Susu Ink & Glow. All rights reserved. No copying or reuse without written permission. */
/* Susu Ink & Glow — footer mark: her crystal & gold logo, slowly turning (three.js),
   with the five service icons floating round it (CSS, see footer.css).
   Lazy: nothing is fetched until the footer comes near; it reuses the three.js copy the
   entrance already downloaded. Pauses off-screen and in background tabs. Without WebGL or
   under prefers-reduced-motion the flat gold logo in the markup stays. */
(() => {
  const host = document.querySelector('.foot__jewel');
  if (!host) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  let gl = null;
  try {
    const probe = document.createElement('canvas');
    gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (gl) { const lose = gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext(); }
  } catch (e) { gl = null; }
  if (!gl) return;

  // built by tools/build-muse.mjs; shared with js/intro3d.js
  const THREE_URL = new URL('../assets/intro-three.r3.js', import.meta.url).href;
  const LOGO_URL = new URL('../brand/susu-logo-gold.svg', import.meta.url).href;
  const fine = matchMedia('(pointer: fine)').matches;
  const mobile = matchMedia('(max-width: 760px)').matches;
  let started = false;

  const near = new IntersectionObserver((ents) => {
    if (!ents.some((e) => e.isIntersecting) || started) return;
    started = true; near.disconnect();
    boot().catch(() => { /* leave the flat logo */ });
  }, { rootMargin: '720px 0px' });
  near.observe(host);

  async function boot() {
    const [THREE, svgText] = await Promise.all([import(THREE_URL), fetch(LOGO_URL).then((r) => r.text())]);
    if (reduce.matches) return;
    const { SVGLoader, RoomEnvironment } = THREE;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(renderer);
    scene.environment = pmrem.fromScene(room, 0.035).texture;
    room.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camera.position.set(0, 0, 2.5);
    const key = new THREE.DirectionalLight(0xffe2bd, 1.6); key.position.set(-3, 4, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc89a, 1.2); rim.position.set(4, -2, 3); scene.add(rim);

    // same materials as the entrance logo
    const crystal = new THREE.MeshPhysicalMaterial({
      color: 0xe2bf96, metalness: 0.5, roughness: 0.1,
      specularIntensity: 1, specularColor: new THREE.Color(0xffe9cc),
      clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 0.35, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 460],
      sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffd6a8), envMapIntensity: 1.15,
    });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2b57c, metalness: 1, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 1.25 });
    const goldSmall = new THREE.MeshPhysicalMaterial({ color: 0xe6bd88, metalness: 1, roughness: 0.26, envMapIntensity: 1.2 });

    // SVG paths → extruded letters. 1 world unit = full logo width.
    const svg = new SVGLoader().parse(svgText);
    const VB_W = 2953, VB_H = 1380, k = 1 / VB_W;
    const logo = new THREE.Group(); scene.add(logo);
    svg.paths.forEach((p, i) => {
      const shapes = SVGLoader.createShapes(p);
      const tmp = new THREE.ShapeGeometry(shapes); tmp.computeBoundingBox();
      const bb = tmp.boundingBox; tmp.dispose();
      const big = bb.min.y < 1000, brushy = i === 0;
      const g = new THREE.ExtrudeGeometry(shapes, big ? {
        depth: 46, bevelEnabled: true, bevelThickness: brushy ? 12 : 18, bevelSize: brushy ? 5 : 12,
        bevelSegments: mobile ? 2 : 3, curveSegments: mobile ? 2 : 3,
      } : { depth: 16, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.2, bevelSegments: 1, curveSegments: 2 });
      const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
      g.translate(-cx, -cy, big ? -23 : -8);
      g.scale(k, -k, -k);
      const mesh = new THREE.Mesh(g, big ? [crystal, gold] : [goldSmall, goldSmall]);
      mesh.position.set((cx - VB_W / 2) * k, -(cy - VB_H / 2) * k, 0);
      logo.add(mesh);
    });

    host.appendChild(canvas);
    const fit = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    fit();
    new ResizeObserver(fit).observe(host);

    let px = 0, py = 0, tx = 0, ty = 0;
    const foot = host.closest('.foot') || host;
    if (fine) {
      foot.addEventListener('pointermove', (e) => {
        const r = foot.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * .5;
        ty = ((e.clientY - r.top) / r.height - .5) * .3;
      }, { passive: true });
      foot.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }

    let running = false, raf = 0, last = 0, t = 0, shown = false;
    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; t += dt;
      px += (tx - px) * .04; py += (ty - py) * .04;
      logo.rotation.y = Math.sin(t * .42) * .5 + px;
      logo.rotation.x = Math.sin(t * .31) * .1 + py;
      logo.position.y = Math.sin(t * .7) * .018;
      renderer.render(scene, camera);
      if (!shown) { shown = true; host.classList.add('is-3d'); }
      raf = requestAnimationFrame(frame);
    };
    const set = (on) => {
      if (on === running) return;
      running = on;
      if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    let inView = false;
    new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; set(inView && !document.hidden); }, { rootMargin: '120px 0px' }).observe(host);
    document.addEventListener('visibilitychange', () => set(inView && !document.hidden));
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; host.classList.remove('is-3d'); });
  }
})();
