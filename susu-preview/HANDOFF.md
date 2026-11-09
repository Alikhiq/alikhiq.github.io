# Susu Ink & Glow: preview build → live site handoff

This is a static preview of the upgraded page. It is plain HTML/CSS/JS around the live site's own `<muse-story>` engine. Port the design into the real Vite/React source. Do not deploy this folder as it is.

## What's in here
- `index.html`: all sections. Story (7 chapters on the blinking portrait), marquee, about, results, prices, booking, FAQ, footer, mobile Book bar.
- `css/site.css`: design tokens (`--plum #211b23`, `--champagne #e4bd91`, `--ivory #f4eadd`, `--paper #efe4d4`), grain, all section styles.
- `js/site.js`: Lenis smooth scroll, story controller, reveals, compare sliders, booking-form UI.
- `assets/index-IExGlf7c.js`: the **live bundle, patched** only so its React root and Supabase client don't run here. In the real source, use the original `muse-story` element. Don't copy this file.
- `assets/react-PY5S7aRQ.js` and `assets/database-CB7MGzWB.js`: preview-only stand-ins for the two live chunks the bundle imports, so the portrait engine runs here. The React one is React/ReactDOM 19.3.1 (same version as the bundle). The database one is an empty placeholder. Don't copy either into the real source.
- `brand/navel.webp`: a 1100px copy for the preview. Use the live full-size `/brand/navel.webp` (1792×2700).

## Story / portrait wiring
- The preview drives the engine with a hidden fixed `#muse-track` whose `top = -p*1000px` (`.story-stage` height 1000px). `p` = chapter progress 0–6 from Lenis scroll.
- One chapter per `STEP = 0.95*vh` (0.85 on mobile). Story height = `STEP*6 + vh + STEP*0.5`.
- muse attributes: `blink="3.6" irisa="#F0C27E" irisb="#8C5A2E" irisamt="1" glint="1" foil="1" tilt="4" dust="true"`.

## Body piercing scroll (chapter 06), new
- `updateBody(pr)` in `js/site.js`, with `pr` = progress allowed to run to 6.5.
- From p 5.08 to 5.55 the portrait fades out and moves up 9% (scale 1.06).
- From p 5.3 to 5.85 the `.bodyart` layer fades in.
- From p 5.3 to 6.45 the camera pans from the ribs `(0.58, 0.30)` to the jewel `(0.753, 0.554)` (fractions of the image), with scale 1 → 1.5 (1.62 on mobile).
- `.bodyart__jewel` is a CSS twinkle placed on the jewel. `.bodyart__tag` "Navel" shows once the pan passes 62%. The "Illustration" note stays visible.
- Reduced motion: no pan, crossfade only.

## Booking form: preview-only here
`form` submit is blocked and nothing is sent. In the real site, reconnect to the existing Supabase RPC `submit_susu_booking_request` (and `record_susu_visit`) through the current booking code. Keep the field names: service, date, time, place (+ address), name, phone, email, notes, marketingConsent.

## Copy and content decisions (Nov 2026)
- **Voice:** all site copy is first person, in Susu's own voice ("I'll text you to confirm"), not "Susu confirms". Keep it that way when porting.
- **Location:** she works all around the Columbus, Ohio area and is between studios. The site says the exact location is sent by text when she confirms. No address anywhere.
- **Prices:** only the prices she has posted are shown: Ombré brow $350, Airbrush henna $65, Lip blush $350. Everything else, including microblading, says "Get an estimate".
- **Booking background:** `media/susu-book.webp` is a painted re-render of her studio portrait (`media/susu-studio.webp`). It replaced the mirror-reveal image, which was removed.

## Booking: multiple services (Nov 2026)
- Step 1 now uses checkboxes, so a client can pick several services in one request. `service` is a **list** (e.g. `["brows","tattoo"]`). When reconnecting to `submit_susu_booking_request`, send all selected services (an array, or a comma-joined string if the RPC only takes text) and update the RPC/owner view if it assumes one.
- The reference-photo field shows if any selected service is tattoo or brows; the health checkbox shows if any is brows, lips or PMU.
- "Book brows" style links tick that service and leave the client on step 1 so they can add more (no auto-advance).

## 3D service icons
- `media/models/{brows,lips,pmu,tattoo,piercing}.glb`: real 3D models made with **Tripo3D** image-to-model from the icon renders (textures cut to 512px WebP with glTF-Transform, ~300 KB each). `js/tiles3d.js` shows them live in the booking tiles: one shared three.js renderer copies each frame into a small canvas per tile, with a gold metal finish, a gentle sway, a pointer tilt and a coin-flip when a service is ticked. It lazy-loads near the form, pauses off-screen, and keeps the flat icons as the fallback (no WebGL, reduced motion, or a model fails to load). An import map in <head> points `three` at three@0.160.0 so the footer and tiles share one copy.
- `media/icons/{brows,lips,pmu,tattoo,piercing}.webp`: 3D-rendered champagne-gold icons (kie.ai nano-banana-pro, cut out to transparent). Used in the booking tiles and as badges on the price cards.

## Still needed from Susu
Session times, licence, real reviews, and a microblading price if she wants one listed. The studio photo and the painted portraits are brand imagery, not client results.
