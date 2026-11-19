// The seven three.js scenes. Each builder gets the seeded rng `r`, palette colors `C` and the world context,
// and returns { update(F) } that moves the camera and reacts to the shared audio frame `A`.
// Scratch vectors/colors are created once per scene: update() does not allocate.
import * as THREE from 'three';
import { A } from '../../audio/analysis.js';
import { TAU } from '../../core/rng.js';

const hdr = (c, k) => c.clone().multiplyScalar(k);

export const SCENES = {
  tunnel(r, C, { add, camera, scene }) {
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * 30 + (r() - .5) * 12, (r() - .5) * 14, Math.sin(a) * 30 + (r() - .5) * 12)); }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', .5), radius = 2 + r() * 2.5, radial = 6 + (r() * 10 | 0);
    const tubeMat = new THREE.MeshBasicMaterial({ color: hdr(C.c[0], 1.1), wireframe: true, transparent: true, opacity: .35 });
    add(new THREE.Mesh(new THREE.TubeGeometry(curve, 500, radius, radial, true), tubeMat));
    const N = 70, ringMat = new THREE.MeshBasicMaterial({ color: hdr(C.c[1], 1.3) });
    const rings = add(new THREE.InstancedMesh(new THREE.TorusGeometry(radius * .93, .035 + r() * .06, 6, radial * 6), ringMat, N));
    const frames = [], up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < N; i++) { const u = i / N; frames.push({ p: curve.getPointAt(u), q: new THREE.Quaternion().setFromUnitVectors(up, curve.getTangentAt(u)) }); }
    const m4 = new THREE.Matrix4(), s = new THREE.Vector3(), eye = new THREE.Vector3(), ahead = new THREE.Vector3();
    const hot = hdr(C.c[2], 1.8), base = C.c[1];
    scene.fog = new THREE.FogExp2(C.bg, .04 + r() * .03);
    let u = 0; const roll = (r() - .5) * .6;
    return { update(F) {
      u = (u + F.dt * F.S * (.008 + A.level * .025 + A.beatPulse * .015)) % 1;
      camera.position.copy(curve.getPointAt(u, eye)); camera.lookAt(curve.getPointAt((u + .012) % 1, ahead)); camera.rotateZ(F.t * roll);
      for (let i = 0; i < N; i++) { const k = 1 + A.spec[(i * 7) % 240 + 2] / 255 * .3 * F.I; s.set(k, k, k); m4.compose(frames[i].p, frames[i].q, s); rings.setMatrixAt(i, m4); }
      rings.instanceMatrix.needsUpdate = true; tubeMat.opacity = .2 + A.bass * .45 * F.I;
      if (A.beatPulse > .5) ringMat.color.copy(hot); else ringMat.color.copy(base).multiplyScalar(1.1 + A.mid * .6);
    } };
  },

  orb(r, C, { add, camera }) {
    const geo = new THREE.SphereGeometry(1.5, 112, 80), base = geo.attributes.position.array.slice(), pos = geo.attributes.position.array;
    const mat = new THREE.MeshStandardMaterial({ color: C.c[0], metalness: .85, roughness: .1 + r() * .3, envMapIntensity: 1.6 });
    const orb = add(new THREE.Mesh(geo, mat));
    if (r() < .6) add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 1 + (r() * 2 | 0)), new THREE.MeshBasicMaterial({ color: hdr(C.c[1], 1.2), wireframe: true, transparent: true, opacity: .25 })));
    const l1 = add(new THREE.PointLight(C.c[1], 40, 20)), l2 = add(new THREE.PointLight(C.c[2], 30, 20));
    const k1 = 2 + r() * 4, k2 = 2 + r() * 4, k3 = 2 + r() * 4, amp = .12 + r() * .2, camR = 5.5 + r() * 2, n = 1 / 1.5;
    return { update(F) {
      const t = F.t, b = (.25 + A.bass * .9 * F.I) * amp, bump = 1 + A.beatPulse * .04;
      for (let i = 0; i < pos.length; i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2];
        const d = bump + Math.sin(x * n * k1 + t * 1.3) * Math.sin(y * n * k2 + t * 1.7) * Math.sin(z * n * k3 + t) * b;
        pos[i] = x * d; pos[i + 1] = y * d; pos[i + 2] = z * d;
      }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      orb.rotation.y = t * .15; camera.position.set(Math.cos(t * .12) * camR, Math.sin(t * .09) * 1.5, Math.sin(t * .12) * camR); camera.lookAt(0, 0, 0);
      l1.position.set(Math.cos(t) * 4, 2, Math.sin(t) * 4); l2.position.set(Math.cos(-t * .7) * 4, -2, Math.sin(-t * .7) * 4);
      l1.intensity = 25 + A.mid * 60; l2.intensity = 20 + A.high * 60;
    } };
  },

  terrain(r, C, { add, camera, scene }) {
    const SX = 96, SZ = 80, size = 60, geo = new THREE.PlaneGeometry(size, size, SX, SZ); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, rows = [];
    for (let z = 0; z <= SZ; z++) rows.push(new Float32Array(SX + 1));
    add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.bg, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })));
    add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hdr(C.c[0], 1.2), wireframe: true })));
    const sunMat = new THREE.ShaderMaterial({
      uniforms: { a: { value: hdr(C.c[1], 1.4) }, b: { value: hdr(C.c[0], 1.1) }, t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 a, b; uniform float t; varying vec2 vUv; void main(){ float y = vUv.y; if (y < .5 && fract(y * 16. - t * .4) < .45) discard; gl_FragColor = vec4(mix(b, a, y), 1.); }',
    });
    const sun = add(new THREE.Mesh(new THREE.CircleGeometry(9, 64), sunMat)); sun.position.set(0, 7, -40);
    scene.fog = new THREE.Fog(C.bg, 14, 58);
    const amp = 4 + r() * 5, edge = .5 + r() * .5; let acc = 0;
    return { update(F) {
      acc += F.dt * F.S * (10 + A.level * 24);
      let moved = false;
      while (acc > 1) {
        acc -= 1; moved = true;
        const row = rows.pop(); // the far row becomes the new near row
        for (let x = 0; x <= SX; x++) { const d = Math.abs(x - SX / 2) / (SX / 2); const v = A.spec[Math.floor(Math.pow(d, .8) * 220) + 2] / 255; row[x] = v * amp * F.I * (d * edge + .12) + (Math.random() * .15); }
        rows.unshift(row);
      }
      if (moved) {
        const arr = pos.array;
        for (let z = 0; z <= SZ; z++) { const row = rows[z], o = z * (SX + 1) * 3 + 1; for (let x = 0; x <= SX; x++) arr[o + x * 3] = row[x]; }
        pos.needsUpdate = true;
      }
      sunMat.uniforms.t.value = F.t; sun.scale.setScalar(1 + A.bass * .08);
      camera.position.set(Math.sin(F.t * .2) * 1.5, 3.4 + Math.sin(F.t * .3) * .4, 24); camera.lookAt(0, 3, -20);
    } };
  },

  galaxy(r, C, { add, camera, lowPower }) {
    const N = lowPower ? 22000 : 40000, arms = 2 + (r() * 4 | 0), twist = .3 + r() * .9;
    const posA = new Float32Array(N * 3), colA = new Float32Array(N * 3), ca = hdr(C.c[0], 1.3), cb = hdr(C.c[1], .9), tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const rad = Math.pow(Math.random(), 1.6) * 10, br = (i % arms) / arms * TAU, sp = rad * twist, g3 = () => Math.pow(Math.random(), 3) * (Math.random() < .5 ? 1 : -1) * .4 * rad;
      posA[i * 3] = Math.cos(br + sp) * rad + g3(); posA[i * 3 + 1] = g3() * .5; posA[i * 3 + 2] = Math.sin(br + sp) * rad + g3();
      tmp.copy(ca).lerp(cb, rad / 10); colA[i * 3] = tmp.r; colA[i * 3 + 1] = tmp.g; colA[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(posA, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
    const mat = new THREE.PointsMaterial({ size: .05, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const pts = add(new THREE.Points(geo, mat)); pts.rotation.x = (r() - .5) * .9;
    const core = add(new THREE.Mesh(new THREE.SphereGeometry(.35, 32, 16), new THREE.MeshBasicMaterial({ color: hdr(C.c[2], 1.8) })));
    let rot = 0;
    return { update(F) {
      rot += F.dt * F.S * (.05 + A.level * .5); pts.rotation.y = rot; mat.size = .03 + A.bass * .04 * F.I; core.scale.setScalar(1 + A.bass * 1.2 * F.I);
      const t = F.t * .1; camera.position.set(Math.cos(t) * 13, 5 + Math.sin(t * .7) * 3, Math.sin(t) * 13); camera.lookAt(0, 0, 0);
    } };
  },

  shards(r, C, { add, camera }) {
    const N = 40 + (r() * 60 | 0), mat = new THREE.MeshStandardMaterial({ color: C.c[0], metalness: 1, roughness: .12, flatShading: true, envMapIntensity: 1.6 });
    const inst = add(new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), mat, N));
    const d = [];
    for (let i = 0; i < N; i++) d.push({ rad: 2 + Math.random() * 6, a: Math.random() * TAU, y: (Math.random() - .5) * 6, sp: (.2 + Math.random()) * (Math.random() < .5 ? 1 : -1), s: .2 + Math.random() * .6, st: 1.5 + Math.random() * 2.5, rx: Math.random() * TAU, rv: Math.random() * 2, bin: Math.floor(Math.random() * 200) + 2 });
    const core = add(new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 3), new THREE.MeshBasicMaterial({ color: hdr(C.c[1], 1.6) })));
    const l1 = add(new THREE.PointLight(C.c[1], 60, 30)), l2 = add(new THREE.PointLight(C.c[2], 40, 30)); l2.position.set(0, 6, 0);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    return { update(F) {
      for (let i = 0; i < N; i++) {
        const o = d[i]; o.a += F.dt * F.S * o.sp * (.15 + A.level * .8); o.rx += F.dt * o.rv;
        const k = o.s * (1 + A.spec[o.bin] / 255 * .7 * F.I);
        p.set(Math.cos(o.a) * o.rad, o.y + Math.sin(F.t + i) * .3, Math.sin(o.a) * o.rad); e.set(o.rx, o.rx * .7, 0); q.setFromEuler(e); s.set(k * .5, k * o.st, k * .5);
        m4.compose(p, q, s); inst.setMatrixAt(i, m4);
      }
      inst.instanceMatrix.needsUpdate = true; core.scale.setScalar(.6 + A.bass * 1.1 * F.I); l1.intensity = 30 + A.bass * 120;
      const t = F.t * .15; camera.position.set(Math.cos(t) * 12, 3 + Math.sin(t * .5) * 2, Math.sin(t) * 12); camera.lookAt(0, 0, 0);
    } };
  },

  bars(r, C, { add, camera, scene }) {
    const N = 64 + (r() * 64 | 0), R = 7 + r() * 3;
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
    const inst = add(new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N));
    const floor = add(new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: C.bg, metalness: .9, roughness: .25 }))); floor.rotation.x = -Math.PI / 2;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), yAxis = new THREE.Vector3(0, 1, 0);
    const w = TAU * R / N * .55, hMax = 4 + r() * 6;
    scene.fog = new THREE.FogExp2(C.bg, .03);
    return { update(F) {
      for (let i = 0; i < N; i++) {
        const a = i / N * TAU, half = i < N / 2 ? i : N - i, v = A.spec[Math.floor(Math.pow(half / (N / 2), 1.5) * 300) + 2] / 255, h = .15 + Math.pow(v, 1.4) * hMax * F.I;
        p.set(Math.cos(a) * R, 0, Math.sin(a) * R); q.setFromAxisAngle(yAxis, -a); s.set(w, h, w); m4.compose(p, q, s); inst.setMatrixAt(i, m4);
        col.copy(C.c[i % 2]).lerp(C.c[2], v * .6).multiplyScalar(.35 + v * 1.4); inst.setColorAt(i, col);
      }
      inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      const t = F.t * .12; camera.position.set(Math.cos(t) * 18, 6 + Math.sin(t * .6) * 2, Math.sin(t) * 18); camera.lookAt(0, 1.5, 0);
    } };
  },

  knot(r, C, { add, camera }) {
    const p = 2 + (r() * 4 | 0), qq = 3 + (r() * 4 | 0), geo = new THREE.TorusKnotGeometry(2.2, .25 + r() * .35, 320, 24, p, qq);
    const solid = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: C.c[0], metalness: .9, roughness: .18, envMapIntensity: 1.5 })));
    const wire = add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hdr(C.c[1], 1.4), wireframe: true, transparent: true, opacity: .25 }))); wire.scale.setScalar(1.03);
    const l1 = add(new THREE.PointLight(C.c[2], 50, 25)); const spin = .2 + r() * .5;
    return { update(F) {
      const k = 1 + A.bass * .18 * F.I; solid.scale.setScalar(k); wire.scale.setScalar(k * 1.03 + A.high * .05);
      solid.rotation.set(F.t * spin * .5, F.t * spin, 0); wire.rotation.copy(solid.rotation);
      l1.position.set(Math.cos(F.t) * 5, Math.sin(F.t * .7) * 3, 4); l1.intensity = 30 + A.mid * 80;
      camera.position.set(0, 0, 8 - A.bass * .6); camera.lookAt(0, 0, 0);
    } };
  },
};
