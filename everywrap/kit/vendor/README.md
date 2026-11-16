# vendor/ — pinned local libraries (verified)

| lib | version | license |
|---|---|---|
| three | 0.187.0 (r187, npm latest on 2026-11-16) | MIT |
| gsap (+ScrollTrigger, Flip, SplitText, ScrollSmoother, etc.) | 3.15.1 | GSAP Standard "No Charge" license (free, incl. commercial; see MANIFEST-env.md) |
| lenis | 1.3.27 | MIT |

`.hdr` loader in r187 is **`HDRLoader`** (`three/addons/loaders/HDRLoader.js`). `RGBELoader` still exists but is a deprecated
subclass that console.warns. KTX2/Draco/Meshopt decoders live in `three/examples/jsm/libs/`.

## Importmap (site served from domain root; adjust the prefix if not)
```html
<script type="importmap">
{ "imports": {
  "three": "/vendor/three/build/three.module.js",
  "three/addons/": "/vendor/three/examples/jsm/",
  "gsap": "/vendor/gsap/index.js",
  "gsap/ScrollTrigger": "/vendor/gsap/ScrollTrigger.js",
  "gsap/Flip": "/vendor/gsap/Flip.js",
  "gsap/SplitText": "/vendor/gsap/SplitText.js",
  "gsap/ScrollSmoother": "/vendor/gsap/ScrollSmoother.js",
  "gsap/CustomEase": "/vendor/gsap/CustomEase.js",
  "lenis": "/vendor/lenis/lenis.mjs"
} }
</script>
```
Other GSAP plugins are in `vendor/gsap/*.js` (ESM; `gsap/utils/` is required by them) and minified UMD builds in `vendor/gsap/dist/*.min.js`.
Lenis CSS: `vendor/lenis/lenis.css`.

## Usage
```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
const draco = new DRACOLoader().setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
const ktx2  = new KTX2Loader().setTranscoderPath('/vendor/three/examples/jsm/libs/basis/').detectSupport(renderer);
```
Notes: three.module.js imports `./three.core.js` (both copied). `examples/jsm` is copied minus tsl/, inspector/, transpiler/, generators/ (WebGPU/TSL-only).
Also needs `three.webgpu`/`three.tsl` only for WebGPU builds — not copied.

## Verification
`vendor/verify.html` (served with `python3 -m http.server` from kit root, Chromium + SwiftShader): imports three, GLTFLoader, DRACOLoader,
KTX2Loader, meshopt, HDRLoader, OrbitControls, EffectComposer/RenderPass/UnrealBloomPass/OutputPass/SMAAPass/ShaderPass, RoomEnvironment,
BufferGeometryUtils, gsap+ScrollTrigger+Flip+SplitText, lenis; loads an HDRI + carbon normal map; renders PBR spheres (metal, clearcoat carbon, transmission) through bloom.
Result: no console errors (only SwiftShader "GPU stall" perf warnings). Screenshot: `vendor/verify.png`.
`vendor/verify-peel.html` + `verify-peel.png` test the vinyl peel snippet (reference/peel-reveal-snippet.js; `_peel.js` is a copy of it).
