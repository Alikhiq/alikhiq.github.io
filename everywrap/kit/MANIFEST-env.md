# MANIFEST-env.md
Kit root: `.../scratchpad/kit/`. Sizes in bytes/KB. All licences verified from source pages/APIs. (`models/` folder in kit root belongs to another agent; excluded.)

## hdri/ — Poly Haven, CC0 (https://polyhaven.com/license). 1k (1024x512, ~1.6MB) & 2k (~6.5MB) .hdr, plus `_preview.jpg` (Poly Haven thumbnail incl. sphere probe; full tonemapped JPGs are ~20MB so not used)
Source pattern: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/{1k|2k}/{id}_{1k|2k}.hdr (via https://api.polyhaven.com/files/{id}); page https://polyhaven.com/a/{id}

| file | author | license | use |
|---|---|---|---|
| hdri/a_dark_studio/monochrome_studio_02_{1k,2k}.hdr, monochrome_studio_02_preview.jpg | Grzegorz Wronkowski | CC0 | BEST dark-studio reflections: tall vertical softbox strips; env intensity down + dark scene.background |
| hdri/a_dark_studio/studio_small_03_{1k,2k}.hdr, studio_small_03_preview.jpg | Greg Zaal | CC0 | octabox + black curtains, higher contrast, good gloss highlights |
| hdri/a_dark_studio/moon_lab_{1k,2k}.hdr, moon_lab_preview.jpg | Greg Zaal | CC0 | darkest/moody warehouse w/ window light, for satin black |
| hdri/b_night_city/cobblestone_street_night_{1k,2k}.hdr, cobblestone_street_night_preview.jpg | Greg Zaal, Jenelle van Heerden | CC0 | warm night street, wet-look reflections, window-tint scene |
| hdri/b_night_city/hansaplatz_{1k,2k}.hdr, hansaplatz_preview.jpg | Greg Zaal | CC0 | night square, many sodium/neon point lights |
| hdri/b_night_city/shanghai_bund_{1k,2k}.hdr, shanghai_bund_preview.jpg | Greg Zaal | CC0 | city skyline neon at night, coloured reflections |
| hdri/c_daylight_yard/driving_school_{1k,2k}.hdr, driving_school_preview.jpg | Sergej Majboroda | CC0 | open tarmac + blue sky/clouds, clean daylight for fleet |
| hdri/c_daylight_yard/factory_yard_{1k,2k}.hdr, factory_yard_preview.jpg | Sergej Majboroda | CC0 | industrial yard daylight, bricks/crates, commercial feel |
| hdri/c_daylight_yard/mall_parking_lot_{1k,2k}.hdr, mall_parking_lot_preview.jpg | Sergej Majboroda | CC0 | flat asphalt lot, soft sky, fleet lineup |
| hdri/d_garage_workshop/autoshop_01_{1k,2k}.hdr, autoshop_01_preview.jpg | Oliksiy Yakovlyev | CC0 | clean car-workshop interior, ceiling strip lights, lifts |
| hdri/d_garage_workshop/auto_service_{1k,2k}.hdr, auto_service_preview.jpg | Sergej Majboroda | CC0 | grittier service garage |
| hdri/d_garage_workshop/skylit_garage_{1k,2k}.hdr, skylit_garage_preview.jpg | Greg Zaal, Rico Cilliers | CC0 | parking garage w/ skylit openings |

Groups: a_dark_studio = (a) dark studio strips; b_night_city = (b) night/neon street tint scene; c_daylight_yard = (c) commercial fleet daylight; d_garage_workshop = (d) workshop interior. Recommended: (a) monochrome_studio_02, (b) cobblestone_street_night (or shanghai_bund for neon), (c) driving_school (sky+tarmac) / factory_yard, (d) autoshop_01. Caveat: monochrome_studio_02 is a bright white cyc — set scene.background dark and lower `environmentIntensity`; moon_lab is the darkest.

## textures/ — all CC0 (ambientCG.com, https://docs.ambientcg.com/license/), JPG, three.js-ready maps only (NormalGL = OpenGL convention, three.js default). Author: ambientCG (Lennart Demes). Source: https://ambientcg.com/get?file={Id}_{1K|2K}-JPG.zip ; page https://ambientcg.com/a/{Id}

| folder | asset | use | size |
|---|---|---|---|
| textures/brushed_metal_Metal009_1k/ | Metal009 linear brushed metal (wheels, trim) | maps: Color, Metalness, NormalGL, Roughness | 1876 KB |
| textures/brushed_metal_circular_Metal051A_1k/ | Metal051A circular brushed aluminium (rims, badges) | maps: Color, Metalness, NormalGL, Roughness | 1166 KB |
| textures/carbon_fiber_Fabric004_2k/ | Fabric004 (2K) carbon weave: color+normal+roughness on dash/splitter/bonnet; repeat ~8x | maps: Color, Metalness, NormalGL, Roughness | 3056 KB |
| textures/fingerprints_Fingerprints002_1k/ | Fingerprints002 fingerprints+smears; Roughness map for glass/gloss paint | maps: Color, NormalGL, Opacity, Roughness | 2976 KB |
| textures/polished_concrete_Concrete017_1k/ | Concrete017 grey smooth floor, scuffed; studio floor (lower roughness / add clearcoat for epoxy) | maps: Color, NormalGL, Roughness | 3489 KB |
| textures/rubber_Rubber004_1k/ | Rubber004 black rubber (tire-like grain; gym rubber source — no tread) | maps: Color, NormalGL, Roughness | 3960 KB |
| textures/scratches_Scratches005_1k/ | Scratches005 fine scratches: Color/Opacity = grayscale mask -> clearcoatRoughnessMap / roughness add; also normal | maps: Color, NormalGL, Opacity | 3204 KB |
| textures/smudge_SurfaceImperfections003_1k/ | SurfaceImperfections003 smudge/dust grayscale mask -> roughnessMap multiplier on glass/paint | maps: Color, NormalGL, Opacity | 2523 KB |
| textures/wet_asphalt_Asphalt025C_1k/ | Asphalt025C dark wet asphalt incl AO; night street / yard ground | maps: AmbientOcclusion, Color, NormalGL, Roughness | 4209 KB |
| textures/blue_noise/ | Christoph Peters blue noise (128/256/512 LDR_RGBA_0), CC0 (https://momentsingraphics.de/BlueNoise.html, FreeBlueNoiseTextures.zip) | dithering to kill banding, film-grain (sample with screen-space UV, animate offset per frame); use NearestFilter+RepeatWrapping | 1345 KB |

No CC0 'tire tread' or 'carbon weave' asset beyond the above was found on ambientCG; rubber is a smooth gym rubber, fine for sidewall grain. Film grain: use blue_noise.

## vendor/ — npm packages, pinned
| path | what | version | license | size |
|---|---|---|---|---|
| vendor/three/ | build/three.module.js + three.core.js, examples/jsm (loaders, controls, postprocessing, shaders, environments, utils, libs/draco, libs/basis, libs/meshopt_decoder …; minus tsl/inspector/transpiler/generators) | 0.187.0 | MIT (© three.js authors) https://registry.npmjs.org/three | 9755 KB |
| vendor/gsap/ | ESM (index.js, gsap-core.js, CSSPlugin, ScrollTrigger, Flip, SplitText, ScrollSmoother, Observer, Draggable, MotionPath, DrawSVG, MorphSVG, Inertia, CustomEase … + utils/) and dist/*.min.js UMD | 3.15.1 | GSAP Standard 'No Charge' License https://gsap.com/standard-license (see below) | 1239 KB |
| vendor/lenis/ | lenis.mjs, lenis.min.js, lenis.css, lenis-snap.mjs | 1.3.27 | MIT (darkroomengineering) | 64 KB |
| vendor/README.md, verify.html, verify.png, verify-peel.html/.png, _peel.js | importmap + verification pages/screenshots (own work) | — | n/a | small |

### GSAP license (quoted from https://gsap.com/standard-license, fetched 2026-11-16)
Page banner: "GSAP is now free for everyone, thanks to Webflow's support!". Legal text: "'Permitted Uses' means the implementation and/or use of GSAP Products on any website, web application, or digital interface by any person or entity"; "'Prohibited Uses' means any implementation and/or use of GSAP Products in tools that allow users to build visual animations without code that ... competes with Webflow's visual animation building capabilities." Restrictions: no Prohibited Uses, no reverse-engineering to build Competitive Products, don't remove notices/branding. All former Club plugins (SplitText, ScrollSmoother, MorphSVG, DrawSVG, Inertia, etc.) are included in the npm package at 3.15.1.
Caveat: the page's older 'Plain English Summary' still says free "as long as end users are not charged a fee" and mentions Business Club — that wording appears stale vs. the legal text above; a shop's marketing site is a Permitted Use under the legal text. npm package.json says "Standard 'no charge' license". Not OSI open-source (proprietary, redistributable only per its terms) — fine to vendor on own site.

## reference/
| file | what | source | license |
|---|---|---|---|
| reference/threejs-examples/*.html, FlakesTexture.js, Reflector.js, RectAreaLightUniformsLib.js | three.js r187 examples/addons (car paint, clearcoat, transmission(+alpha), gltf iridescence/sheen/anisotropy/dispersion/transmission, clipping, clipping_advanced, rectarealight, mirror, ssr, bloom, tonemapping, pcss, groundprojected env, extrude_splines, modifier_curve) | https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/ | MIT (LICENSE-three.txt); demo assets not included |
| reference/csm/ | three-custom-shader-material 6.4.0 (es + vanilla builds, LICENSE.md) | npm three-custom-shader-material (Faraz Shaikh) | MIT |
| reference/drei/MeshReflectorMaterial.tsx, BlurPass.tsx, LICENSE | planar blurred wet-floor reflections (React wrapper; GLSL portable) | https://github.com/pmndrs/drei | MIT |
| reference/peel-reveal-snippet.js | vinyl peel/wipe reveal via onBeforeCompile (original, tested) | written for this kit | free to use (MIT-equivalent) |
| reference/NOTES.md | technique summaries | — | — |
| fonts-icons/NOTES.md | font pairings + icon set | — | OFL / ISC |

## Failed / not done
- Poly Haven full 'Tonemapped JPG' previews (~20MB each) skipped in favour of 1024px thumbnails.
- github.com HTML blocked and jsdelivr gh listing for three.js too large (50MB limit), so example filenames were probed directly on raw.githubusercontent.com (r187). Some guessed examples (webgl_materials_physical_iridescence/anisotropy/sheen) do not exist in r187; gltf_* equivalents used.
- No ready-made MIT vinyl-peel shader exists publicly; wrote own snippet. LUSTRE forum demo has no published code (not copied).
- No tread-pattern tire texture; no carbon/blue-noise on Poly Haven (carbon from ambientCG, blue noise from Christoph Peters).
