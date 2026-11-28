# EveryWrap round 2: brief for the three concepts

## The business
EveryWrap is a vehicle customization shop in Columbus, Ohio (family business; earlier shops in New York and California). Services: vinyl wrap (best seller, satin black most of all), paint protection film (PPF), window tint, body kits (they find the kit that fits your car, fit it and wrap it), and commercial work (fleet graphics, box trucks, food trucks, signage). Customers find the site from search or an ad, mostly on a phone.

## What the owner asked for (his words, condensed)
- "Something amazing." He compares himself to viral wrap artists: strong contrast with the light, motion blur, aperture, angle, POV.
- "The header is useless, the logo is useless, a menu is useless." The hero is the site. One main button: request a callback / contact now / get a price.
- A hero where the visitor picks the service (wrap, tint, PPF, kits, commercial) and the scene responds. "Transitions in UI/UX, probably 3D."
- Two themes: a personal one (luxury, customization) and a commercial one.
- An AI assistant that watches what the visitor does and helps; "upload your car" returns it mocked up in the chosen color with a price.
- Round 1 shipped a working preview built from AI-generated still images. His reply: "Yes build that but refine it, can you do it in code." So round 2 is real-time 3D in code (three.js/WebGL), not stills.

## What was weak in round 1 (from his phone screenshots)
- On a phone the car is a picture in a band on top with a stack of controls underneath. It reads as a template, not as an experience.
- Too many controls at once: chips, swatches, a segmented switch, two buttons, an assistant bar and suggestion chips.
- The PPF highlight is a crude pale block. The commercial "zoom" barely moves.
- The mockup promised "drag to rotate 360" and the build could not do it. Round 2 concepts must only show what the code can really do.

## Hard constraints for every concept
1. Buildable in three.js with the assets in the kit: one real 3D car model (re-materialed live), HDRI lighting, PBR textures, bloom, simple shaders (clip-plane reveal between two materials, moving emissive light bars, reflective floor). No hands, no people, no photoreal city photography that code cannot render.
2. The car in the mockup must be the actual 3D model we will use (a render of it is supplied as the reference image). No brand badges or logos on it.
3. Phone first. In portrait the car fills the screen behind the UI. Thumb-reachable controls at the bottom. At most: wordmark, Personal/Commercial switch, one headline, one service selector, one finish/level selector, one primary button, one assistant input.
4. Copy on screen is short, real and correctly spelled. No invented prices, no review counts, no film-brand names, no claims we cannot back.
5. Shared UI vocabulary across the three: wordmark "EVERYWRAP"; switch "PERSONAL | COMMERCIAL"; primary button "Get my price"; assistant input "Tell me your car…" with a camera icon.
6. The three concepts must be clearly different from each other in mood, layout and signature interaction, so the choice is real.
7. Avoid the generic AI-site looks: purple gradients, glass cards everywhere, rounded pills on everything, emoji, centered everything.

## Frames to render per concept
- D-personal: desktop, 16:9, personal theme, vinyl wrap service active, satin black.
- M-personal: phone, 9:16, same state.
- D-commercial: desktop, 16:9, commercial theme.
