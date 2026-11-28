# Audit loop 2: buildability (three.js r187, kit on disk)

Lens: can the code deliver what the frame shows, at steady fps on a mid-range phone. Rating: A = straightforward, B = doable with named technique + risk, C = not deliverable as written.

## Facts verified from the GLB and the kit (not assumptions)

- Paint: `Paint 1 Carmine` (base colour red 0.666, rough 0.25, clearcoat) and `Paint 2 Carmine` (base colour near-black 0.038, rough 0.3, clearcoat). Both carry the SAME normal map (texture 8, 128x128 flake/orange-peel grain). No baked base-colour texture on either paint, so recolouring is clean. The grain is visible in car-ref-front34.png as a sandy texture on the nose: on gloss finishes set `normalMap=null` (or normalScale about 0.1); on satin keep it at about 0.3.
- Paint 2 panels (roof, lower doors, door handles, hood grille, "Panel Sides" skirt is a THIRD, separate material) are dark in every factory colour. For white/red/grey wraps every paint material that should change must be patched (Paint 1, Paint 2, and Panel Sides if the skirt should follow). Anything left unpatched stays black and will look like a two-tone car.
- Tyre sidewall lettering is in TWO places: `Tireside` base-colour texture (KHRONOS GROUP + 3DCommerce logos, green and red marks) and `Tireside` normal map (embossed KHRONOS, DOT, TREADWEAR, TRACTION, OUTSIDE ring text). Removal: `Tireside.map = null; Tireside.color = 0x1c1c1c; Tireside.normalMap = null` (or paint over the ring in a canvas copy). 2-minute job. The licence plate (`License` material) carries a baked KHRONOS GROUP logo texture: blank its `map` or hide the plate. Both are visible in car-ref-side.png today.
- Iridescence extension exists only on Pearl/Graphite variant materials, not on the live Carmine paint. Three supports it on MeshPhysicalMaterial, so it can be added, but see item 2.
- The glass uses KHR_materials_transmission. Transmission forces an extra opaque scene pass: fine on desktop, expensive on a phone with a 213k-triangle car behind it.
- Interior, engine bay and mechanicals are full geometry. Hide them (or drop the whole interior group) for hero rendering and for any mirrored/cube pass. This is the single biggest triangle saving.
- In car-ref-front34.png the front wheels are steered outward (the right front wheel is visibly turned). In code set wheel yaw to straight. Prompts should not depend on that pose.
- Peel snippet (`peel-reveal-snippet.js`, tested in vendor/verify-peel.png): plane in WORLD space, `abs(peelD)` edge band added to emissive, mixes colour/roughness/metalness (optional clearcoat). It patches ONE material; the car needs it on both paint materials sharing one `uWipe` uniform.

## 1. The vinyl seam (concept 1)

Deliverable: a hard, straight cut plane through the car at mid-door; nose side one finish, tail side another; a thin bright line with glow where they meet (needs bloom, bump `edgeBand` emissive from 0.6 to roughly 3-6 and set bloom threshold about 1; half-res bloom on phones). Because the cut is a plane meeting a curved body, the line follows the surface contour (it bends over the door curve in 3/4 view). That reads as a real "film edge" and is B-minus-risk only.

NOT deliverable (C): "slightly lifted film edge". No geometry exists for a lifted lip, no film or cloth simulation, and the cut is a shading mask on a fixed mesh. The seam has zero thickness and cannot curl.
What to show instead: a perfectly flat cut with a thin warm-white line (about 1 to 2 cm wide at car scale), a faint soft glow either side, and a subtle darker gradient on the satin side for a few cm (can be done with the same mask). No curl, no shadow cast by the edge.

Also: the seam is a plane, so it is "vertical" only in the car's own frame. Set `uAxis` to the car's length axis and keep the car's yaw fixed relative to the plane. If the camera orbits, the seam stays at mid-door because it is in world space tied to the car. OK.

Seam crosses glass, mirrors, wheels, lamps, grille: these are not paint materials and will NOT change colour. In the mockup the wheel on the nose half will not be wrapped; the window stays glass on both sides. Do not show the seam continuing across the window.

Rating: B (risk: glow only reads with bloom; keep the line inside the paint materials).

## 2. Paint finishes on this model

- Satin black, gloss black, satin grey, satin red: A. Satin = roughness 0.4-0.5, clearcoat 0, flake normal dropped to 0.3. Gloss = clearcoat 1, roughness 0.15, normal map off. Red needs the near-black Paint 2 panels re-coloured too.
- Gloss white "factory paint": A, but set BOTH paints to white (Paint 2 base is near black). The result is an all-white car, not white-with-black-roof. If the mockup shows a black roof, remove it.
- Satin black against a pitch-black studio: satin black has very low reflectance; the car only separates from the black background where the environment has bright strips. Requires a custom env (see item 3). It is buildable, but the mockup must show a car lit by one or two long highlight strips on hood/roof/shoulder, not an evenly lit black car.
- Colour-shift: B. Real iridescence (KHR_materials_iridescence, thickness range about 250-600 nm, metalness about 0.8, roughness 0.3) shows only as a subtle hue shift under bright env and almost vanishes on a dark env. Robust alternative: Fresnel-mix two paint colours in the same `onBeforeCompile` patch (`mix(colA, colB, pow(1.0-dot(N,V),2.0))`). Mockup for the swatch dot: a two-colour gradient (teal to violet) as the dot fill; the car itself should show a gentle two-tone shift between facing and grazing panels, not rainbow.
- Tyre lettering removal: A (see facts).
- Flake normal map: on a bright background (concept 2) the 128px grain will look like noise on a black car; drop normalScale for gloss.

## 3. Reflections and the floor

- "Soft reflection of the car in a glossy black floor": B. Planar `Reflector` doubles every draw of the car; on a mid phone that is too much unless the reflection pass renders a stripped car (paint + wheels + glass only, about 120-150k tris, no interior) at half resolution. Honest versions:
  - Desktop: Reflector at 0.5 resolution, stripped car, floor material = dark gloss with the reflection multiplied by a distance fade (gone after about 40 percent of car height) and a little blur via mip bias or two-tap blur.
  - Phone: no true reflection. Use a mirrored low-LOD clone (`scale.y = -1`, fade by height) or just a soft contact shadow + a faint glow under the sills. A fading, slightly blurred, partial reflection is what the build will show on both; a crisp mirror is not.
- "Glossy floor reflecting light arches" (concept 3): B+. Arches are simple geometry, so mirrored copies of the arches below the floor, faded with distance, are cheap on every device and read correctly. This is the cheap way to get a reflective floor on a phone.
- Custom environment (one softbox, strips): A. Build a tiny scene of emissive boxes and use `PMREMGenerator.fromScene()` once. This is the way to get the "one long softbox" reflection on hood/roof. HDRIs in the kit are not needed for this.

## 4. Concept 2 (Finish Library)

- Enormous letters on the back wall: B. Three ways. Best: HTML text in a div BEHIND a transparent WebGL canvas (crisp font rendering, free tone-on-tone colour, trivial word-swap with GSAP SplitText). The car in the canvas naturally covers the letters. Cost: letters do not parallax in 3D with camera orbit unless you apply a small CSS transform from camera yaw. In-scene text as a canvas texture would need 4096px wide to stay crisp at 1920 and is a memory cost on phones: avoid. Cyclorama wall/floor = CSS gradient behind a transparent canvas plus a shadow-catcher plane; no real wall geometry needed, no visible horizon.
- Contact shadow: A. Bake once (the shadow does not change when the paint changes) with the three.js contact-shadow technique or a soft radial gradient plane; do not render it live.
- Sample cards in a tray: build as DOM, not 3D. Flat cards, CSS rotation for the fan, CSS drop shadow, 2D drag with hit-test against the car's screen rectangle, tap on phone. Card faces: render each finish once as a tiny sphere with the same material (five 128px renders at load, drawn to canvas) so the card matches the car. Cost nothing at runtime. NOT deliverable (C): "tall card of real film", real vinyl texture, thickness, curling corners, depth of field.
- "Drag a card onto the car": B, DOM drag + the peel sweep started on drop. The wipe is a plane sweep nose to tail, not "flowing from the card".
- Light-background tone-mapping: separate the visible background (CSS, light) from the lighting environment (custom dark env with white strips). Use `NeutralToneMapping` or AgX, not ACES, on any in-scene light surface (the prints in D-commercial) so whites do not go grey, and set `toneMapped:false` on unlit photo planes. A satin black car then reads black and crisp, with soft highlights, against pale letters. The risk is only a milky grey cast on satin if the env is too bright; keep `envMapIntensity` about 0.6.
- Giant word changes with the finish: A.

## 5. Concept 3 (Light Tunnel)

- Moving emissive arches: A. 60-100 thin boxes via InstancedMesh, scrolled along the tunnel axis and wrapped with modulo. Streaks = scale each instance along the motion axis by speed. Taillight red = per-instance colour.
- Reflections of arches sliding over the body: B. The paint only reflects what is in the environment map. Options, with cost:
  1. CubeCamera at the car, 64-128 px, rendering only the arches and floor (not the car), then PMREM. Cost on a mid phone: roughly 3-6 ms per update; update every 2nd frame at 96 px. Desktop fine at 256.
  2. Static PMREM of arches (one time), animate with `scene.environmentRotation` about the car's vertical axis. About free. Bands sweep over the body, a bit like a rotating strip rather than arches streaming past; most viewers will not notice. Recommended on phones.
  3. Procedural arch pattern in the paint/glass `onBeforeCompile` patch, function of the reflect vector and time. Cheapest, no PMREM, loses roughness blur.
  Honest look: on a satin finish the reflections are broad soft bands of light, NOT long crisp lines. Crisp lines need gloss or clearcoat. Specify "broad soft bands" in the prompt.
- Stretched motion streaks: B. Only the arches and floor lines stretch. Car, wheels and text stay sharp; there is no real motion blur. Wheels will not spin unless the wheel nodes are rotated about the axle (unverified for this GLB): the mockup should not show blurred or spinning wheels.
- Per-service light behaviour: A in code (speed uniform; one wide bright panel sweep for PPF; tint = arch intensity and glass opacity; camera height tween). Only WRAP is shown in the frames.
- "Dark tinted glass": A, but use a plain alpha-blended dark glass on phones, not transmission.
- Camera drop for Kits: A.
- Bloom: B. UnrealBloomPass is heavy on mid phones. Use half-res bloom, or fake glow with additive quads on the arches. In D-commercial (white tunnel) bloom has nothing to show; arches are plain unlit red.

## 6. Commercial photo panels

Source photos in /home/user/alikhiq.github.io/everywrap/img/work are 480-960 px (sprinter-print 640x640, library-bus 640x640, lexus-lettering 640x640, boat-print 680x850, crv-print 520x520; food truck is in scratchpad/refs). All are square or near-square, so an UPRIGHT panel is a crop (about 512x640 usable pixels).
- Max on-screen size at which they stay acceptable (device pixels at most 1.3x source): desktop upright panel about 420 CSS px tall (about 330 px wide); landscape or square card about 520 CSS px wide. Phone: about 280-300 CSS px wide. Anything bigger looks soft at DPR 2-3.
- Frames draw "three large upright photo panels" across two-thirds of a 16:9 screen (about 600 px or more each): too large. Either draw them smaller, or make the nearest one the only crisp one and let the others recede with slight blur or darkening.
- Treatment: anisotropic filtering 8, mipmaps, a fine film-grain overlay, a light vignette, no hard zoom, and never scale a photo up on hover/scroll beyond the cap.
- Content mismatch: the frames name a box truck and signs. There is NO box-truck photo and no signage photo on disk (wall mural install exists in assets/photos). Available: Sprinter van, library bus, food truck, wake boat, Lexus lettering, CR-V print. Labels should come from that set unless new photos arrive.
- Concept 3 billboards: far ones stretched by speed hide softness, the nearest one is the problem; cap at about 520 CSS px wide, 3:2 or square, not "sharp and large".
- Concept 1 seam wipe between two photos: A (shader mix of two textures with a wipe uniform, same as peel but UV-space).

## 7. Phone framing, this body shape

Car about 4.36 m long, 2.0 m wide, 1.3 m tall. At a low three-quarter front angle the silhouette is about 4.1 m wide by 1.4 m tall, aspect about 3:1. In a 9:16 screen that fills the width with only about a third of the screen height. "The whole screen", "fills most of the screen height", "sits large in the middle" are physically impossible from a low angle without cropping off both edges.

Recommended phone camera:
- Concept 1 and concept 2 phone: raise the camera to about 25-35 degrees elevation, yaw about 20-25 degrees off nose-on, vertical FOV 30-35 degrees (camera about 7-9 m away, no wide-angle stretch), car's nose pointing toward the lower-right. Height of the car in the frame then reaches about 50-60 percent of the screen, with the roof and hood visible. Crop the tail off the left edge. Headline and controls fill the rest, thumb zone below the car.
- Concept 3 phone: keep the low angle for the tunnel feel, but state that the car is a horizontal band about 30-35 percent of screen height in the lower middle, with the tunnel arches converging above it. Do not claim it fills the screen.
- Do not ask for a top-down or flat head-on view of the car; the head-on view (2.0 m by 1.3 m) fills about 37 percent of height at full width.
- Distortion: stay at vertical FOV 30-40 degrees for a car shot. Above 50 degrees the nose balloons and the wheels stretch on this low car.

## Per-frame element ratings (only B and C listed; everything else A)

### Concept 1: One Light
| Frame | Element | Rating | Issue |
|---|---|---|---|
| D-personal | seam with "slightly lifted film edge" | C | No film simulation or lip geometry |
| D-personal | "gloss white factory paint" tail half | B | Both paints must be patched to white |
| D-personal | "soft reflection of the car in the floor" | B | Stripped mirrored clone or reduced Reflector, fading |
| D-personal | black car on black studio | B | Needs a custom strip env or it vanishes |
| D-personal | colour-shift dot | B | Use gradient dot |
| M-personal | "the whole screen", "fills most of the screen height" | C | Silhouette aspect 3:1 |
| M-personal | "nose toward the viewer" front three-quarter | B | Fine, with raised camera |
| D-commercial | "three large upright photo panels" | B | Soft above about 420 CSS px tall |
| D-commercial | "box truck", "Signs" | C | No such photos on disk |
| D-commercial | "polished concrete floor and wall" | B | ambientCG 1k tiles; keep roughness 0.5 and tiling invisible with low-contrast texture |
| signature | "wrapped, filmed, tinted, kitted" | C for "kitted" | No body-kit geometry |

### Concept 2: Finish Library
| Frame | Element | Rating | Issue |
|---|---|---|---|
| D-personal | letters tone on tone | B | DOM text behind transparent canvas |
| D-personal | "tall card of real film" | C | Flat DOM cards |
| D-personal | "tray ... standing slightly fanned" | B | 2D fan, no 3D |
| D-personal | satin black on light | B | Separate env from background |
| D-commercial | "three large photo prints stand upright" | B | Size cap |
| D-commercial | "Box trucks", "Signs" cards | C | No photos |
| M-personal | car "stands large in the middle" in front of letters, plus carousel under it | B | Car about 35-40 percent of screen height from a raised 3/4 view |

### Concept 3: Light Tunnel
| Frame | Element | Rating | Issue |
|---|---|---|---|
| D-personal | "long soft reflections of the light arches slide over hood, roof and side" | B | Env must contain arches; satin gives broad soft bands |
| D-personal | "glossy black floor reflecting the arches" | B | Mirrored arch geometry |
| D-personal | "stretched into streaks" | B | Arches only |
| M-personal | "sits large in the middle of the screen" | C | About a third of the height |
| D-commercial | "billboards ... nearest ... sharp and large" | C | 640 px sources |
| D-commercial | "box truck" | C | No photo |
| D-commercial | bright white tunnel | B | No bloom visible on white; arches plain red |
| signature | "Pointer or phone tilt steers the light" | B | iOS needs a permission tap |

## Required wording changes (old phrase to new phrase)

### Concept 1
1. D-personal: "with a slightly lifted film edge and a glowing line" to "a perfectly straight, flat cut with no curl or lifted edge, marked by a thin warm-white glowing line with a faint soft glow either side".
2. D-personal: "the tail half is still gloss white factory paint" to "the tail half is still plain gloss white paint (the whole car white, no black roof)".
3. D-personal: "Soft reflection of the car in the floor." to "A faint, slightly blurred reflection of the car that fades out within a third of the car's height."
4. M-personal: "cropped close so the car runs off the right edge and fills most of the screen height" to "seen from a slightly raised three-quarter angle, the car about half the screen height with its tail running off the left edge, headline and controls in the black space above and below".
5. D-personal and M-personal: "'Satin black.'... five finish dots... colour-shift dot" add "(colour-shift dot a two-tone teal to violet gradient)".
6. D-commercial: "three large upright photo panels" to "three upright photo panels, each about a third of the frame height, staggered in depth"; "a box truck, a food truck" to "a bus, a food truck"; chapter rail "02 Box trucks ... 04 Signs" to "02 Buses ... 04 Boats" (or supply the missing photos).
7. signature: "(wrapped, filmed, tinted, kitted)" to "(wrapped, glossier under film, glass darkened, carbon trim added)".

### Concept 2
1. D-personal: "each a tall card of real film" to "each a flat rectangular swatch card in the finish colour, with a faint diagonal sheen and a small drop shadow, no thickness and no curl".
2. D-personal: "running almost edge to edge ... as if painted on it" keep; add "flat text, no perspective".
3. D-personal/M-personal: remove "hides parts of them" only if the car is not centred; fine as is. Add "the car's dark body reads as black with a few soft highlight strips".
4. M-personal: "stands large in the middle of the screen" to "fills about 40 percent of the screen height, seen from a slightly raised three-quarter angle".
5. D-commercial: "three large photo prints" to "three modest photo prints, none taller than a third of the frame height"; "a box truck and a food truck" to "a bus and a food truck"; "'Box trucks', 'Signs'" to "'Buses', 'Boats'".
6. D-personal card 'Color Shift': add "(a teal-to-violet gradient face)".

### Concept 3
1. D-personal: "long soft reflections of the light arches slide over its hood, roof and side" to "broad soft bands of light from the arches reflect across its hood, roof and side".
2. D-personal: "Glossy black floor reflecting the arches" to "Glossy black floor with fading reflections of the arches".
3. M-personal: "sits large in the middle of the screen" to "sits low in the lower half of the screen, about a third of the screen height, arches converging above it".
4. D-commercial: "nearest billboard on the right is sharp and large" to "nearest billboard on the right is moderately sized and slightly soft, the far ones streaked"; "cargo van, box truck, food truck" to "cargo van, bus, food truck"; selector labels "BOX" and "SIGNS" to "BUS" and "BOAT".
5. signature: "Tint dims the arches while the glass goes dark" fine; "Kits drops the camera low" fine; remove "stretched 'motion' streaks" if used to mean motion blur on the car.

## Biggest build risk and confidence

- Concept 1: the black-on-black readability plus the mirrored floor reflection on phones. Confidence: medium-high (seam itself is tested; the strip env and mirrored clone are well-known techniques).
- Concept 2: DOM letters behind a transparent canvas staying aligned with the car on resize and orbit, plus the light-bg tone mapping. Confidence: high.
- Concept 3: a moving environment with arches that reflects on the car at phone frame rate. Confidence: medium (phones use the rotating static PMREM or shader approach, desktop a small CubeCamera).

## Recommended phone shot

Camera 25-35 degrees up, yaw 20-25 degrees off nose-on, vertical FOV 30-35, camera 7-9 m away, car about 40-55 percent of screen height in the middle, tail cropped off the left edge, text and controls above and below. For the tunnel concept keep the low angle and let the car be about a third of the screen height with arches above it.
