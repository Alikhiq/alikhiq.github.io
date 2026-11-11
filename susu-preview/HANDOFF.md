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
- `media/icons/{brows,lips,pmu,tattoo,piercing}.webp`: "crystal & gold" icon set (champagne glass with polished gold, chosen by the client from four concept sheets), generated as one sheet on kie.ai nano-banana-pro so the five match, then cut out to transparent. Used in the booking tiles and as badges on the price cards. (An earlier Tripo3D live-3D version was removed at the client's request.)

## Still needed from Susu
Session times, licence, real reviews, and a microblading price if she wants one listed. The studio photo and the painted portraits are brand imagery, not client results.

## Going live on susuinkandglow.com (Nov 2026)
- This folder is now the production site, deployed on Vercel (project `susuinkandglow`, root `susu-preview/`). `vercel.json` rewrites `/owner` and `/owner/*` to `owner.html` (the original Studio access app, unchanged) and `/q` (QR landing) to the main page.
- The original live bundle and its chunks (`assets/index-IExGlf7c.js`, `react-*`, `database-*`, `OwnerApp-*`, `index-CWcsJ37Z.css`, fonts, `brand/muse.webp`, `brand/susu-portrait-original.jpg`, `brand/approved-card-mobile.webp`, `brand/susu-logo.svg`) are kept so Studio access keeps working. The new page loads the patched copy `assets/story-IExGlf7c.js` for the portrait engine only.
- Booking now submits to the existing `submit_susu_booking_request` RPC, but **only on susuinkandglow.com / www** (anywhere else it shows a preview notice and sends nothing). Several services are sent under the first one, with the full list in the notes. Location: "At my place" = `studio`, "At your place" = `client` + address. Visits go to `record_susu_visit` (`qr` for `/q` or `?source=qr`).

## November 11, 2026: real photos and her new menu
- **Photos:** the AI portraits are replaced by her real photoshoot. `media/susu-portrait.webp` (about arch), `media/susu-brows.webp` (small arch, brow-brush photo), `media/susu-tools.webp` (tools card, now a still image, not a video) and `media/susu-book-photo.webp` (booking background). Her pixels are the photographer's; only the plum backdrop and a thin rim light were added. The old `susu-painted`, `susu-studio`, `susu-book` and `reel-tools` files are still in `media/` but no longer referenced.
- **Prices:** copied from the menu Susu sent on Nov 11. Microblading / microshading $375 (second session $250), lip blush $300 (second session $150), eyeliner $200, beauty mark $50, eyebrow tint $15, eyebrow threading $10, full face threading $30, tattoo from $150, baby ear piercing $50. Piercing per Ali: $25 each for standard placements, from $50 for intimate placements. Ombré and henna are gone because they are not on her new menu.
- **Deposit:** $100 for permanent makeup, credited to the touch-up (6 to 8 weeks later). The "$40 refundable" wording is removed everywhere.
- **New FAQ entries** from her appointment-prep text: how to pay, how to prepare, rescheduling and lateness.
- **Not changed:** location copy. She signs a lease at Image Studios Easton on Nov 12; update the location lines after that.
- **Rejected by Ali, Nov 11:** the smiling arms-crossed photo and the at-work photo with a client. Neither is used on the site.
