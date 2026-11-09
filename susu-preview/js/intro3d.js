/* Susu Ink & Glow — intro: the SUSU wordmark in crystal & gold (three.js).
   - First visit of a session: full piece (~4 s). Later pages in the session: a ~1 s version.
   - Letters turn in from edge-on, "INK & GLOW" settles in, a light sweep crosses the glass,
     then the mark flies into the nav logo while the page fades up.
   - Never blocks: if the page is still loading it idles, but it always leaves by ~7 s.
     Tap, click or any key skips.
   - No WebGL, reduced motion, or three.js too slow to arrive: a 2D gold mark with a shimmer.
   - Tells js/site.js the page may show with `window.__susuIntroReady` + a `susu:intro-ready` event.
   - Everything (renderer, geometry, textures, canvas, the loader itself) is released afterwards. */
(() => {
  const loader = document.querySelector('.loader');
  const body = document.body;
  const T0 = performance.now();
  const now = () => (performance.now() - T0) / 1000;
  const HARD_CAP = 7.0; // seconds since navigation start: the page is always shown by then

  const signalReady = (() => {
    let sent = false;
    return () => {
      if (sent) return; sent = true;
      window.__susuIntroReady = true;
      window.dispatchEvent(new Event('susu:intro-ready'));
    };
  })();

  if (!loader) { signalReady(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let repeat = false;
  try { repeat = sessionStorage.getItem('susu-intro') === '1'; sessionStorage.setItem('susu-intro', '1'); } catch (e) { /* private mode */ }

  // page "loaded" = window load (portrait engine, images) + fonts
  let pageLoaded = false;
  const onLoaded = () => {
    const f = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    f.then(() => { pageLoaded = true; }, () => { pageLoaded = true; });
  };
  if (document.readyState === 'complete') onLoaded(); else addEventListener('load', onLoaded, { once: true });

  // the nav logo the mark lands on
  const navImg = () => {
    const img = document.querySelector('.nav__logo img');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (r.width < 8 || r.bottom < 0 || r.top > innerHeight) return null;
    return r;
  };

  let finished = false;
  let skipHandler = null;
  const finish = () => {
    if (finished) return; finished = true;
    signalReady();
    body.classList.remove('intro-landing');
    if (skipHandler) {
      removeEventListener('keydown', skipHandler);
      loader.removeEventListener('pointerdown', skipHandler);
    }
    loader.remove();
  };
  // absolute safety net: whatever happens, never hold the page past the cap
  setTimeout(() => { signalReady(); setTimeout(finish, 1400); }, Math.max(0, HARD_CAP * 1000 - performance.now() + 200));

  /* ---------------- 2D fallback ---------------- */
  function run2D() {
    loader.classList.add('loader--2d');
    const mark = loader.querySelector('.loader__mark');
    const hold = repeat ? 0.7 : 1.2;
    const start = now();
    let left = false;
    const leave = () => {
      if (left) return; left = true;
      const r = navImg();
      body.classList.add('intro-landing');
      signalReady();
      if (mark && r && !reduce) {
        const m = mark.getBoundingClientRect();
        const s = r.width / m.width;
        const dx = (r.left + r.width / 2) - (m.left + m.width / 2);
        const dy = (r.top + r.height / 2) - (m.top + m.height / 2);
        mark.style.transition = 'transform .8s cubic-bezier(.65,0,.35,1), opacity .3s ease .62s';
        mark.style.transform = `translate(${dx}px,${dy}px) scale(${s})`;
        mark.style.opacity = '0';
        setTimeout(() => { body.classList.remove('intro-landing'); }, 620);
        setTimeout(finish, 1000);
      } else {
        loader.classList.add('loader--out');
        body.classList.remove('intro-landing');
        setTimeout(finish, 700);
      }
    };
    const tick = () => {
      if (left) return;
      const t = now() - start;
      if ((t >= hold && pageLoaded) || performance.now() / 1000 > HARD_CAP - 1 || t > hold + 2.5) leave();
      else setTimeout(tick, 100);
    };
    tick();
    skipHandler = (e) => { if (e.type === 'keydown' || e.type === 'pointerdown') leave(); };
    addEventListener('keydown', skipHandler);
    loader.addEventListener('pointerdown', skipHandler);
  }

  /* ---------------- WebGL probe ---------------- */
  let hasGL = false;
  try {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    hasGL = !!g;
    if (g) { const l = g.getExtension('WEBGL_lose_context'); l && l.loseContext(); }
  } catch (e) { hasGL = false; }

  if (reduce || !hasGL) { run2D(); return; }

  /* ---------------- 3D ---------------- */
  const BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
  const LOGO_URL = 'brand/susu-logo-gold.svg';
  // if three.js has not arrived by then, take the 2D route instead
  const LOAD_BUDGET = repeat ? 0.9 : 2.4;
  let gave2D = false;
  const budgetTimer = setTimeout(() => { gave2D = true; run2D(); }, LOAD_BUDGET * 1000);

  Promise.all([
    import(BASE + 'build/three.module.js'),
    import(BASE + 'examples/jsm/loaders/SVGLoader.js'),
    import(BASE + 'examples/jsm/environments/RoomEnvironment.js'),
    fetch(LOGO_URL).then((r) => { if (!r.ok) throw new Error('logo'); return r.text(); }),
  ]).then(([THREE, { SVGLoader }, { RoomEnvironment }, svgText]) => {
    if (gave2D || finished) return;
    let built;
    try { built = build(THREE, SVGLoader, RoomEnvironment, svgText); } catch (e) { built = null; }
    if (gave2D || finished) { built && built.dispose(); return; }
    clearTimeout(budgetTimer);
    if (!built) { run2D(); return; }
    built.play();
  }).catch(() => {
    if (gave2D || finished) return;
    clearTimeout(budgetTimer); gave2D = true; run2D();
  });

  /* ------------------------------------------------------------------ */
  function build(THREE, SVGLoader, RoomEnvironment, svgText) {
    const mobile = Math.min(innerWidth, innerHeight) < 600;
    const fine = matchMedia('(pointer: fine)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.className = 'loader__gl';
    canvas.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(renderer);
    const envRT = pmrem.fromScene(room, 0.035);
    scene.environment = envRT.texture;
    room.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
    const CAM_Z = 10;
    camera.position.set(0, 0, CAM_Z);

    // warm key + cool rim so the bevels catch colour, not just the white room
    const key = new THREE.DirectionalLight(0xffe2bd, 1.6); key.position.set(-3, 4, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffc89a, 1.2); rim.position.set(4, -2, 3); scene.add(rim);
    const sweepLight = new THREE.PointLight(0xfff0d8, 0, 6, 1.6); sweepLight.position.set(-3, 0.6, 1.6); scene.add(sweepLight);

    /* ---- shared shader bits: the light sweep band ---- */
    const U = {
      uSweep: { value: -10 },
      uSweepAmt: { value: 0 },
      uSweepCol: { value: new THREE.Color(1.0, 0.86, 0.66) },
    };
    const addSweep = (mat, strength) => {
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.uniforms.uSweepK = { value: strength };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vSwW;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvSwW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vSwW;\nuniform float uSweep;\nuniform float uSweepAmt;\nuniform float uSweepK;\nuniform vec3 uSweepCol;')
          .replace('#include <opaque_fragment>',
            'float swd = (vSwW.x + vSwW.y * 0.42 - uSweep);\n' +
            'float swb = exp(-swd * swd * 26.0) + 0.35 * exp(-swd * swd * 3.0);\n' +
            'outgoingLight += uSweepCol * swb * uSweepAmt * uSweepK;\n' +
            '#include <opaque_fragment>');
      };
      mat.customProgramCacheKey = () => 'sweep' + strength;
    };

    /* ---- materials ---- */
    const crystal = new THREE.MeshPhysicalMaterial({
      color: 0xf6e3c8, metalness: 0, roughness: 0.07,
      transmission: 1, thickness: 0.9, ior: 1.52,
      attenuationColor: new THREE.Color(0xd9a56a), attenuationDistance: 0.55,
      specularIntensity: 1, specularColor: new THREE.Color(0xffe9cc),
      clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 0.22, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 420],
      envMapIntensity: 1.35, transparent: true,
    });
    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xe2b57c, metalness: 1, roughness: 0.2,
      clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 1.25, transparent: true,
    });
    const goldSmall = new THREE.MeshPhysicalMaterial({
      color: 0xe6bd88, metalness: 1, roughness: 0.26, envMapIntensity: 1.2, transparent: true,
    });
    addSweep(crystal, 1.0); addSweep(gold, 1.6); addSweep(goldSmall, 1.2);

    /* ---- the logo: SVG paths → extruded meshes. 1 world unit = full logo width ---- */
    const svg = new SVGLoader().parse(svgText);
    const VB_W = 2953, VB_H = 1380; // viewBox, matches the <img> in the nav
    const k = 1 / VB_W;
    const logo = new THREE.Group();
    const inner = new THREE.Group(); // holds the parts, centred on the viewBox centre
    logo.add(inner);
    scene.add(logo);

    const parts = svg.paths.map((p) => {
      const shapes = SVGLoader.createShapes(p);
      const tmp = new THREE.ShapeGeometry(shapes); tmp.computeBoundingBox();
      const bb = tmp.boundingBox; tmp.dispose();
      return { shapes, bb, big: bb.min.y < 1000 };
    });
    // the brush-stroke S is the first, widest path
    const geos = [];
    const letters = [], glyphs = [];
    parts.forEach((p, i) => {
      const big = p.big;
      const brushy = i === 0;
      const g = new THREE.ExtrudeGeometry(p.shapes, big ? {
        depth: 46, bevelEnabled: true, bevelThickness: brushy ? 10 : 16, bevelSize: brushy ? 3.2 : 7,
        bevelSegments: mobile ? 2 : 3, curveSegments: mobile ? 2 : 3,
      } : {
        depth: 16, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.2, bevelSegments: 1, curveSegments: 2,
      });
      // own pivot at the part's centre (SVG y points down → flip)
      const cx = (p.bb.min.x + p.bb.max.x) / 2, cy = (p.bb.min.y + p.bb.max.y) / 2;
      g.translate(-cx, -cy, big ? -23 : -8);
      g.scale(k, -k, k);
      g.computeVertexNormals();
      geos.push(g);
      const mats = big ? [crystal.clone(), gold.clone()] : [goldSmall.clone(), goldSmall.clone()];
      mats.forEach((m, j) => addSweep(m, big ? (j ? 1.6 : 1.0) : 1.2));
      const mesh = new THREE.Mesh(g, mats);
      mesh.position.set((cx - VB_W / 2) * k, -(cy - VB_H / 2) * k, 0);
      mesh.userData.home = mesh.position.clone();
      mesh.userData.cx = cx;
      inner.add(mesh);
      (big ? letters : glyphs).push(mesh);
    });
    crystal.dispose(); gold.dispose(); goldSmall.dispose();
    letters.sort((a, b) => a.userData.cx - b.userData.cx);
    glyphs.sort((a, b) => a.userData.cx - b.userData.cx);
    const setOpacity = (mesh, o) => mesh.material.forEach((m) => { m.opacity = o; });

    /* ---- sprites: halo, glints ---- */
    const texs = [];
    const radialTex = () => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,230,196,1)'); g.addColorStop(0.25, 'rgba(240,196,140,.45)');
      g.addColorStop(0.6, 'rgba(200,140,90,.10)'); g.addColorStop(1, 'rgba(200,140,90,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texs.push(t); return t;
    };
    const starTex = () => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d');
      const core = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      core.addColorStop(0, 'rgba(255,250,240,1)'); core.addColorStop(0.08, 'rgba(255,236,206,.85)');
      core.addColorStop(0.3, 'rgba(240,190,130,.12)'); core.addColorStop(1, 'rgba(240,190,130,0)');
      x.fillStyle = core; x.fillRect(0, 0, 256, 256);
      x.globalCompositeOperation = 'lighter';
      const ray = (ang, len, w) => {
        x.save(); x.translate(128, 128); x.rotate(ang);
        const g = x.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, 'rgba(255,225,180,0)'); g.addColorStop(0.5, 'rgba(255,245,230,.95)'); g.addColorStop(1, 'rgba(255,225,180,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, len, w, 0, 0, Math.PI * 2); x.fill(); x.restore();
      };
      ray(0, 126, 2.6); ray(Math.PI / 2, 110, 2.4); ray(Math.PI / 4, 46, 1.4); ray(-Math.PI / 4, 46, 1.4);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texs.push(t); return t;
    };
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex(), color: 0xe9b98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(1.5, 0.95, 1); halo.position.set(0, 0.02, -0.25); halo.renderOrder = -1;
    inner.add(halo);
    const sTex = starTex();
    const mkStar = () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: sTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      }));
      s.renderOrder = 10; inner.add(s); return s;
    };
    // a birth glint per letter + the signature glint on the S swoosh + one on the last U
    const births = letters.map(() => mkStar());
    const glintA = mkStar(), glintB = mkStar();
    const swooshTip = new THREE.Vector3((1085 - VB_W / 2) * k, -(150 - VB_H / 2) * k, 0.03);
    const uTip = new THREE.Vector3((2930 - VB_W / 2) * k, -(262 - VB_H / 2) * k, 0.03);

    /* ---- dust ---- */
    const N = mobile ? 90 : 160;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.9;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1.1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.9 + 0.05;
      seed[i * 2] = Math.random(); seed[i * 2 + 1] = Math.random();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('seed', new THREE.BufferAttribute(seed, 2));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uPx: { value: 1 } },
      vertexShader: `
        attribute vec2 seed; uniform float uT; uniform float uPx; varying float vTw;
        void main(){
          vec3 p = position;
          p.y += mod(uT * (0.018 + seed.x * 0.03) + seed.y, 1.0) * 0.5 - 0.25;
          p.x += sin(uT * 0.4 + seed.y * 12.0) * 0.025;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vTw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (1.2 + seed.x * 2.6) + seed.y * 40.0), 3.0);
          gl_PointSize = uPx * (1.2 + seed.x * 2.8) * (10.0 / -mv.z);
        }`,
      fragmentShader: `
        uniform float uA; varying float vTw;
        void main(){
          vec2 d = gl_PointCoord - 0.5; float r = length(d);
          float a = smoothstep(0.5, 0.0, r); a *= a;
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a * vTw * uA, a * vTw * uA * 0.6);
        }`,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    inner.add(dust);

    /* ---- layout: size the logo to the screen ---- */
    let W = innerWidth, H = innerHeight, ppu = 1, baseScale = 1;
    const layout = () => {
      W = innerWidth; H = innerHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      ppu = H / (2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); // px per world unit at z=0
      const want = W < 600 ? W * 0.82 : Math.min(W * 0.5, 720);
      baseScale = want / ppu;
      dustMat.uniforms.uPx.value = renderer.getPixelRatio() * (W < 600 ? 1.5 : 1) * baseScale;
    };
    layout();

    /* ---- timeline ---- */
    const ease = {
      outCubic: (t) => 1 - Math.pow(1 - t, 3),
      outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      outBack: (t) => { const c = 1.25; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    };
    const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
    const bump = (t, a, m, b) => (t < a || t > b ? 0 : t < m ? ease.outCubic(seg(t, a, m)) : 1 - ease.inOut(seg(t, m, b)));

    // full: assemble 0–1.9, tagline 1.2–2.4, sweep 1.95–2.95, glints, settle → exit ≥3.45
    // short: already assembled, quick sweep, exit ≥0.55
    const S = repeat
      ? { letters: -10, tagline: -10, sweepA: 0.05, sweepB: 0.65, glint: 0.42, minExit: 0.55, fly: 0.7, dustIn: 0.25 }
      : { letters: 0.12, tagline: 1.25, sweepA: 1.95, sweepB: 2.95, glint: 2.7, minExit: 3.45, fly: 0.95, dustIn: 0.9 };

    let raf = 0, t = 0, last = 0, exitAt = -1, flyFrom = null, flyTo = null, idleSweep = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => { pointer.tx = (e.clientX / W - 0.5) * 2; pointer.ty = (e.clientY / H - 0.5) * 2; };
    if (fine) addEventListener('pointermove', onMove, { passive: true });
    const onResize = () => layout();
    addEventListener('resize', onResize);

    const startExit = () => {
      if (exitAt >= 0) return;
      exitAt = t;
      const r = navImg();
      flyFrom = { x: logo.position.x, y: logo.position.y, s: logo.scale.x, ry: logo.rotation.y, rx: logo.rotation.x };
      if (r) {
        flyTo = {
          x: (r.left + r.width / 2 - W / 2) / ppu,
          y: -(r.top + r.height / 2 - H / 2) / ppu,
          s: r.width / ppu,
        };
      } else flyTo = null; // no nav logo on screen: dissolve in place
      body.classList.add('intro-landing');
      loader.classList.add('loader--exit');
      signalReady(); // page fades up underneath while the mark flies home
    };

    const frame = (ms) => {
      raf = requestAnimationFrame(frame);
      const nowS = ms / 1000;
      const dt = last ? Math.min(0.05, nowS - last) : 0.016;
      last = nowS; t += dt;

      // letters: turn in from edge-on, out of depth
      letters.forEach((m, i) => {
        const a = S.letters + i * 0.17;
        const p = seg(t, a, a + 1.45);
        const e = ease.outExpo(p), eb = ease.outBack(Math.min(1, p * 1.05));
        m.rotation.y = (1 - eb) * -1.45;
        m.rotation.x = (1 - e) * 0.18;
        m.position.z = m.userData.home.z - (1 - e) * 0.55;
        m.position.y = m.userData.home.y - (1 - e) * 0.05;
        setOpacity(m, Math.min(1, p * 3.2));
        m.visible = p > 0;
        const st = births[i];
        const bt = seg(t, a + 0.02, a + 0.75);
        st.material.opacity = bt > 0 && bt < 1 ? Math.sin(bt * Math.PI) * 0.9 : 0;
        const sc = 0.22 * Math.sin(bt * Math.PI) + 0.04;
        st.scale.set(sc, sc, 1);
        st.position.set(m.userData.home.x, m.userData.home.y + 0.06, 0.12);
        st.material.rotation = bt * 0.9;
      });
      // tagline: tracks in from wider letter-spacing
      glyphs.forEach((m, i) => {
        const a = S.tagline + i * 0.055;
        const p = ease.outCubic(seg(t, a, a + 1.1));
        m.position.x = m.userData.home.x * (1 + (1 - p) * 0.22);
        m.position.y = m.userData.home.y - (1 - p) * 0.012;
        setOpacity(m, p);
        m.visible = p > 0;
      });

      // light sweep (world x of the band, across the scaled logo), repeated while idling
      const sx = (x) => x * logo.scale.x + logo.position.x;
      let sweepP = seg(t, S.sweepA, S.sweepB);
      const holdStart = S.minExit;
      if (t > holdStart && exitAt < 0) { // idling while the page loads
        const it = (t - holdStart) % 2.8;
        if (it < 1.1) sweepP = it / 1.1; else sweepP = sweepP >= 1 ? 1 : sweepP;
        idleSweep = it < 1.1 ? 1 : 0;
      }
      const swE = ease.inOut(sweepP);
      U.uSweep.value = sx(-0.75 + swE * 1.6);
      const swAmt = sweepP > 0 && sweepP < 1 ? Math.sin(sweepP * Math.PI) : 0;
      U.uSweepAmt.value = swAmt * (idleSweep ? 0.55 : 0.9);
      sweepLight.intensity = swAmt * 6;
      sweepLight.position.set(sx(-0.75 + swE * 1.6), logo.position.y + 0.25 * logo.scale.x, 1.6);

      // signature glints after the sweep
      const ga = bump(t, S.glint, S.glint + 0.22, S.glint + 0.85);
      glintA.material.opacity = ga; glintA.position.copy(swooshTip);
      glintA.scale.setScalar(0.03 + ga * 0.2); glintA.material.rotation = t * 0.6;
      const gb = bump(t, S.glint + 0.32, S.glint + 0.52, S.glint + 1.05);
      glintB.material.opacity = gb * 0.8; glintB.position.copy(uTip);
      glintB.scale.setScalar(0.02 + gb * 0.13); glintB.material.rotation = -t * 0.5;

      // halo + dust
      const intro = ease.outCubic(seg(t, 0, S.dustIn));
      halo.material.opacity = (0.32 + 0.38 * swAmt) * intro;
      dustMat.uniforms.uT.value = t + 3.0;
      dustMat.uniforms.uA.value = intro;

      // whole mark: a slow breath, a touch of pointer parallax
      pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
      const settle = ease.outCubic(seg(t, 0, repeat ? 0.4 : 2.6));
      let ry = Math.sin(t * 0.55) * 0.09 * settle + pointer.x * 0.12 - (1 - settle) * 0.12;
      let rx = Math.sin(t * 0.43 + 1) * 0.04 * settle + pointer.y * 0.07;
      let s = baseScale * (repeat ? 0.97 + 0.03 * settle : 0.94 + 0.06 * settle);
      let x = 0, y = repeat ? 0 : (1 - settle) * -0.004;

      // opacity of the whole thing (short version fades in)
      let alpha = repeat ? ease.outCubic(seg(t, 0, 0.25)) : 1;

      // exit: fly into the nav logo, then hand over to the real <img>
      if (exitAt < 0) {
        const tAll = performance.now() / 1000;
        const ready = pageLoaded && t >= S.minExit;
        if (ready || tAll > HARD_CAP - S.fly - 0.2) startExit();
      }
      if (exitAt >= 0) {
        const p = seg(t, exitAt, exitAt + S.fly);
        const e = ease.inOut(p);
        if (flyTo) {
          x = flyFrom.x + (flyTo.x - flyFrom.x) * e;
          y = flyFrom.y + (flyTo.y - flyFrom.y) * e;
          s = flyFrom.s + (flyTo.s - flyFrom.s) * e;
          ry = flyFrom.ry * (1 - e) + Math.sin(p * Math.PI) * 0.35;
          rx = flyFrom.rx * (1 - e);
          halo.material.opacity *= 1 - e;
          dustMat.uniforms.uA.value *= 1 - ease.outCubic(p);
          // hand over to the flat logo in the nav during the last stretch
          if (p > 0.8 && body.classList.contains('intro-landing')) body.classList.remove('intro-landing');
          alpha *= 1 - seg(p, 0.86, 1);
        } else {
          s *= 1 + e * 0.08;
          alpha *= 1 - e;
          if (p > 0.5) body.classList.remove('intro-landing');
        }
        if (p >= 1) { cleanup(); return; }
      }
      logo.position.set(x, y, 0);
      logo.scale.setScalar(s);
      logo.rotation.set(rx, ry, 0);
      canvas.style.opacity = alpha.toFixed(3);

      renderer.render(scene, camera);
    };

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return; cleaned = true;
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', onResize);
      dispose();
      finish();
    };
    function dispose() {
      geos.forEach((g) => g.dispose());
      dustGeo.dispose(); dustMat.dispose();
      scene.traverse((o) => {
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      texs.forEach((tx) => tx.dispose());
      envRT.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }

    return {
      play() {
        loader.appendChild(canvas);
        loader.classList.add('loader--3d');
        // compile up front so the first frames don't hitch
        letters.concat(glyphs).forEach((m) => { m.visible = true; });
        try { renderer.compile(scene, camera); } catch (e) { /* fine */ }
        skipHandler = () => { if (exitAt < 0) startExit(); };
        addEventListener('keydown', skipHandler);
        loader.addEventListener('pointerdown', skipHandler);
        raf = requestAnimationFrame(frame);
        // background tab or stalled rAF: still leave on time
        const guard = setInterval(() => {
          if (cleaned) { clearInterval(guard); return; }
          if (performance.now() / 1000 > HARD_CAP + 0.6) { clearInterval(guard); cleanup(); }
        }, 500);
      },
      dispose() { dispose(); },
    };
  }
})();
