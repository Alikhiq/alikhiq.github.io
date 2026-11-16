# reference/ notes
three.js example sources in `threejs-examples/` are MIT (© three.js authors, r187, see LICENSE-three.txt). NOTE: their *code* is MIT but demo
*assets* (Ferrari/other GLBs, textures) have own licenses — we did not download assets.

## Car paint / glass / materials
- `webgl_materials_car.html` + `FlakesTexture.js` — MeshPhysicalMaterial car paint: clearcoat 1, clearcoatRoughness 0.03, metalness 0.9/roughness 0.5, a procedural FlakesTexture used as `normalMap` (repeat 20x) for metallic flakes; env via RoomEnvironment/HDR; glass = transmission-less tinted physical material.
- `webgl_materials_physical_clearcoat.html` — clearcoat + clearcoatNormalMap (orange-peel / carbon) vs base normal; shows how to separate clearcoat bump from base paint.
- `webgl_loader_gltf_iridescence.html`, `webgl_loader_gltf_sheen.html`, `webgl_loader_gltf_anisotropy.html`, `webgl_loader_gltf_dispersion.html`, `webgl_loader_gltf_transmission.html` — KHR_materials_* usage on GLB (iridescence = colour-flip chrome/“chameleon” wraps; anisotropy = brushed metal/carbon streaks; transmission+thickness+attenuationColor = window tint). Set `material.transmission=1, thickness, attenuationColor, attenuationDistance` to animate tint density live.
- `webgl_materials_physical_transmission.html` / `_alpha.html` — transmission pass behaviour (renders opaque pre-pass; keep tint glass few meshes for perf).
- `webgl_clipping.html`, `webgl_clipping_advanced.html` — renderer.localClippingEnabled + material.clippingPlanes / clipIntersection / clipShadows. Simplest wipe: render car twice (wrap A with plane, wrap B with flipped plane) and animate plane.constant.

## (i) Vinyl peel / wipe reveal  (MOST USEFUL: `peel-reveal-snippet.js`)
- `peel-reveal-snippet.js` — ORIGINAL code written for this kit (tested, r187; vendor/verify-peel.png): patches one MeshPhysicalMaterial with `onBeforeCompile`; world-space position dotted with an axis vs `uWipe` uniform; mixes colour/roughness/metalness (+optional clearcoat) between old paint and wrap, with an emissive edge band. Animate `material.userData.peel.uWipe.value` with GSAP/ScrollTrigger. Single draw, shadows/env/clearcoat all stay correct.
- `csm/` — three-custom-shader-material v6.4.0 (MIT, © Faraz Shaikh), `vanilla` build: cleaner way to inject GLSL (`csm_DiffuseColor`, `csm_Roughness`, …) into MeshPhysicalMaterial than hand string replaces. https://github.com/FarazzShaikh/THREE-CustomShaderMaterial
- Idea source (no code/licence published, NOT copied): LUSTRE car page, same approach (two finish param sets A/B mixed by world-z vs uWipe + glow edge): https://discourse.threejs.org/t/lustre-a-car-detailing-page-where-scrolling-changes-the-paint-finish/94907
- Alternative: clip-plane approach above; or two overlaid meshes with `alphaTest` from a noise/gradient mask texture for an organic peeling edge (noise threshold + curl displacement along the edge).

## (ii) Studio light strips / animated area lights
- `webgl_lights_rectarealight.html` + `RectAreaLightUniformsLib.js` — RectAreaLight (no shadows, physical/standard only) as long strip softboxes; call `RectAreaLightUniformsLib.init()` first. Animate `.position`/`.intensity` for sweeping light.
- Best reflection quality: bake strips into an env map — build a tiny THREE.Scene of emissive planes (MeshBasicMaterial with colour >1), render via `PMREMGenerator.fromScene(scene, 0.04)`, assign `scene.environment`; animate by rebuilding or rotate `scene.environmentRotation`. Same trick as RoomEnvironment (`three/addons/environments/RoomEnvironment.js`, MIT) — copy and replace boxes with strip planes. HDRIs in `hdri/a_dark_studio/` already contain strips; use `scene.environmentRotation.y` to sweep reflections across paint; `backgroundIntensity`/`environmentIntensity` to darken.

## (iii) Wet ground reflections
- `Reflector.js` + `webgl_mirror.html` — planar mirror render target (MIT). Mix with roughness map in a custom ground material for wet look.
- `drei/MeshReflectorMaterial.tsx`, `BlurPass.tsx` (MIT, © 2020 react-spring/pmndrs; React wrapper but the GLSL/onBeforeCompile logic is plain three.js): planar reflection with roughness-map-driven blur, mixStrength, depth-fade, distortion normal map — the standard "wet floor" shader. Port the `onBeforeCompile` block + BlurPass to vanilla.
- `webgl_postprocessing_ssr.html` (SSRPass) — screen-space reflections alternative (heavier, artifacts).
- `webgl_materials_envmaps_groundprojected.html` — GroundedSkybox: projects HDRI onto a floor so the car sits on the HDRI ground (daylight yard scene).
- Cheap: ground MeshPhysicalMaterial roughness from `textures/wet_asphalt…` + env reflections + Reflector blurred by mip.

## (iv) Scroll-driven camera paths
- `webgl_geometry_extrude_splines.html`, `webgl_modifier_curve.html` — CatmullRomCurve3 `getPointAt(t)` / `getTangentAt(t)` usage.
- Pattern (own, standard): CatmullRomCurve3 for camera position + a second curve (or fixed) for lookAt target; `ScrollTrigger.create({scrub:1, onUpdate:s=>{ cam.position.copy(path.getPointAt(s.progress)); cam.lookAt(target.getPointAt(s.progress)); }})`; drive scrub via Lenis (`lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t=>lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0)`). Damp progress with `THREE.MathUtils.damp` for filmic lag.

## Other
- `webgl_postprocessing_unreal_bloom.html`, `webgl_tonemapping.html` — bloom params and tone mapping (use AgX/ACES/Neutral); `webgl_shadowmap_pcss.html` — soft contact shadows.
- Not copied (licence unverified / not code): codrops reveal tutorials (https://tympanus.net/codrops/2026/03/23/building-a-dual-scene-fluid-x-ray-reveal-effect-in-three-js/ — check repo licence before use).
