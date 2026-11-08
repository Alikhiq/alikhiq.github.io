/* Susu Ink & Glow — footer jewel: a slowly turning champagne-gold hoop (three.js).
   Lazy: three.js is only fetched when the footer comes near. Pauses off-screen and
   in background tabs. Skipped under prefers-reduced-motion or without WebGL, in
   which case the static CSS ring in the markup stays. */
(() => {
  const host = document.querySelector('.foot__jewel');
  if (!host) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  // WebGL probe (released straight away)
  let gl = null;
  try {
    const probe = document.createElement('canvas');
    gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (gl) { const lose = gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext(); }
  } catch (e) { gl = null; }
  if (!gl) return;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const fine = matchMedia('(pointer: fine)').matches;
  let started = false;

  const near = new IntersectionObserver((ents) => {
    if (!ents.some((e) => e.isIntersecting) || started) return;
    started = true; near.disconnect();
    boot().catch(() => { /* leave the static ring */ });
  }, { rootMargin: '720px 0px' });
  near.observe(host);

  /* A small painted "studio" used as the reflection environment: warm softboxes on plum. */
  function makeEnvironment(THREE, renderer) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    const base = x.createLinearGradient(0, 0, 0, 256);
    base.addColorStop(0, '#5a4538'); base.addColorStop(.48, '#241a26'); base.addColorStop(1, '#0c080e');
    x.fillStyle = base; x.fillRect(0, 0, 512, 256);
    const soft = (cx, cy, rx, ry, rgb, a) => {
      x.save(); x.translate(cx, cy); x.scale(rx, ry);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.55, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
    };
    soft(140, 62, 130, 34, '255,238,214', 1);     // key softbox, upper left
    soft(392, 54, 96, 26, '255,224,186', .85);    // second key, upper right
    soft(256, 206, 190, 26, '228,189,145', .4);   // warm floor bounce
    soft(30, 128, 54, 70, '190,125,112', .55);    // rose fill (lip blush)
    soft(486, 140, 44, 60, '150,140,170', .35);   // cool rim
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
    return env;
  }

  async function boot() {
    // The page's portrait engine bundles its own copy of three; hide its marker during
    // import so three doesn't log the (harmless) "multiple instances" warning.
    const mark = window.__THREE__; delete window.__THREE__;
    let THREE;
    try { THREE = await import(THREE_URL); } finally { if (mark) window.__THREE__ = mark; }
    if (reduce.matches) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    scene.environment = makeEnvironment(THREE, renderer);
    const camera = new THREE.PerspectiveCamera(26, 1, .1, 40);
    camera.position.set(0, .15, 6.4);
    camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(3, 4.5, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xe4bd91, 1.1); rim.position.set(-4, -1.5, -3); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x3a2d35, .5));

    const gold = new THREE.MeshPhysicalMaterial({ color: 0xeac89f, metalness: 1, roughness: .19, clearcoat: .5, clearcoatRoughness: .18, envMapIntensity: 1.25 });
    const goldDeep = new THREE.MeshPhysicalMaterial({ color: 0xcfa97c, metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.1 });
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf6efe4, metalness: 0, roughness: .26, clearcoat: 1, clearcoatRoughness: .08, sheen: .7, sheenColor: new THREE.Color(0xf3d9b4), envMapIntensity: 1 });

    const group = new THREE.Group(); scene.add(group);

    // main hoop, tilted toward the viewer; the pearl travels slowly around it
    const hoop = new THREE.Group(); group.add(hoop);
    hoop.add(new THREE.Mesh(new THREE.TorusGeometry(1.02, .088, 56, 220), gold));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(.215, 48, 32), pearl);
    bead.position.set(0, 1.02, 0);
    hoop.add(bead);
    hoop.rotation.x = 1.12;

    // slim second hoop threaded through the first
    const slim = new THREE.Mesh(new THREE.TorusGeometry(.56, .04, 40, 160), goldDeep);
    slim.position.set(1.0, 0, 0);
    slim.rotation.y = Math.PI / 2;
    const slimPivot = new THREE.Group(); slimPivot.add(slim); hoop.add(slimPivot);
    slimPivot.rotation.z = -.35;

    host.appendChild(canvas);

    const fit = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    fit();
    new ResizeObserver(fit).observe(host);

    // pointer parallax on fine pointers only
    let px = 0, py = 0, tx = 0, ty = 0;
    const foot = host.closest('.foot') || host;
    if (fine) {
      foot.addEventListener('pointermove', (e) => {
        const r = foot.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * .5;
        ty = ((e.clientY - r.top) / r.height - .5) * .35;
      }, { passive: true });
      foot.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }

    let running = false, raf = 0, last = 0, t = 0, shown = false;
    const frame = (now) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; t += dt;
      px += (tx - px) * .04; py += (ty - py) * .04;
      hoop.rotation.z += dt * .22;                        // pearl and slim hoop travel around the hoop
      slimPivot.rotation.x += dt * .5;                     // slim hoop swings through
      group.rotation.y = Math.sin(t * .36) * .42 + px;
      group.rotation.x = Math.sin(t * .27) * .12 + py;
      group.position.y = Math.sin(t * .6) * .05;
      renderer.render(scene, camera);
      if (!shown) { shown = true; host.classList.add('is-3d'); }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running || document.hidden) return; running = true; last = performance.now(); raf || (raf = requestAnimationFrame(frame)); };
    const stop = () => { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    // only animate while on screen and the tab is visible
    const seen = new IntersectionObserver((ents) => { ents[0].isIntersecting ? start() : stop(); }, { threshold: 0 });
    seen.observe(host);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (seen.takeRecords(), start()); });

    const teardown = () => {
      stop(); seen.disconnect(); host.classList.remove('is-3d');
      setTimeout(() => { canvas.remove(); renderer.dispose(); }, 1100);
    };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); teardown(); });
    reduce.addEventListener('change', (e) => { if (e.matches) teardown(); });
  }
})();
