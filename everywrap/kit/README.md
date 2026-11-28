# EveryWrap round 2 asset kit

Open-source assets and libraries for the real-time 3D rebuild. Everything here allows commercial use. Full source, author and license for each file is in `MANIFEST-env.md` and `models/MANIFEST.md`.

| Folder | What | License |
|---|---|---|
| `models/car-concept-khronos.glb` | Hero car: Khronos "Car Concept", a badge-free concept coupe with separate paint, glass and wheel materials | CC BY 4.0 |
| `hdri/` | Four Poly Haven lighting environments (1k): dark studio, night street, daylight yard, workshop | CC0 |
| `vendor/three` | three.js 0.187.0 build and the add-ons the site needs | MIT |
| `vendor/gsap` | GSAP 3.15.1 with ScrollTrigger, Flip, SplitText | GSAP Standard "no charge" license |
| `vendor/lenis` | Lenis smooth scrolling | MIT |
| `reference/` | Technique notes, a tested vinyl-peel shader snippet, font and icon notes | notes; snippet is ours |

## Required credit
The site must carry this line somewhere visible (a credits page or footer link is enough):

> Car Concept by Eric Chadwick / Darmstadt Graphics Group GmbH, CC BY 4.0, based on a CC0 model by Unity Fan.

## Before launch
- Remove the Khronos and 3D Commerce logo decals and the tyre sidewall lettering from the car model. They are trademarks.
- Re-read the GSAP license page. Its legal text allows commercial use, but its plain-English summary still mentions end users not being charged a fee.

## Not committed
Textures (carbon fiber, polished concrete, wet asphalt, smudges, blue noise), the 2k HDRIs and the alternate environments were downloaded but left out to keep the repository small. Their download URLs are in `MANIFEST-env.md`.
