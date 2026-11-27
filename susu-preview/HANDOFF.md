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

## WhatsApp booking alerts (Nov 26, 2026)
- After `submit_susu_booking_request` succeeds, `js/site.js` (`notifySusu`) posts a summary to `/api/booking-alert` (fire-and-forget; the booking never waits on it).
- `api/booking-alert.js` (Vercel function) sends Susu a WhatsApp message from Round City's Zernio number +1 614-304-9866: the `booking_alert` template, or a plain message if the template fails while her 24-hour window is open.
- Env on the Vercel project: `ZERNIO_API_KEY` (sensitive), `ZERNIO_ACCOUNT_ID`, `ALERT_TO` (digits, comma separated). Missing key = alerts off. Recipients come only from env. Origin is locked to susuinkandglow.com, with a per-IP and per-instance rate limit.

## November 11, 2026: real photos and her new menu
- **Photos:** the AI portraits are replaced by her real photoshoot. `media/susu-portrait.webp` (about arch), `media/susu-brows.webp` (small arch, brow-brush photo), `media/susu-tools.webp` (tools card, now a still image, not a video) and `media/susu-book-photo.webp` (booking background). Her pixels are the photographer's; only the plum backdrop and a thin rim light were added. The old `susu-painted`, `susu-studio`, `susu-book` and `reel-tools` files are still in `media/` but no longer referenced.
- **Prices:** copied from the menu Susu sent on Nov 11. Microblading / microshading $375 (second session $250), lip blush $300 (second session $150), eyeliner $200, beauty mark $50, eyebrow tint $15, eyebrow threading $10, full face threading $30, tattoo from $150, baby ear piercing $50. Piercing per Ali: $25 each for standard placements, from $50 for intimate placements. Ombré and henna are gone because they are not on her new menu.
- **Deposit:** $100 for permanent makeup, credited to the touch-up (6 to 8 weeks later). The "$40 refundable" wording is removed everywhere.
- **New FAQ entries** from her appointment-prep text: how to pay, how to prepare, rescheduling and lateness.
- **Not changed:** location copy. She signs a lease at Image Studios Easton on Nov 12; update the location lines after that.
- **Rejected by Ali, Nov 11:** the smiling arms-crossed photo and the at-work photo with a client. Neither is used on the site.
- **More photos (Nov 11):** a four-photo strip `.about__more` under the about section (`media/susu-more-*.webp`), and the booking background is now the looking-away arms-crossed photo. These are the frames as shot, with the grey backdrop graded toward plum; no cutout.

## Load speed, icon loader and phone polish (Nov 27, 2026)
- **Why it was slow:** the home page loaded the whole original app bundle (1 MB, with React and Supabase) only to get the `<muse-story>` portrait, plus a second unminified three.js from a CDN for the 3D logo intro. The intro held the page for at least 3.5 s and up to 7 s, and the portrait waited on a 548 KB image.
- **Portrait engine:** `assets/muse-story.r3.js` + `assets/chunk-*.js` are built by `tools/build-muse.mjs`. It lifts the engine out of `assets/index-IExGlf7c.js` unchanged and bundles it with only the three.js r160 parts it uses (132 KB of JavaScript over the wire instead of 563 KB). `assets/story-IExGlf7c.js` is gone. Studio access (`owner.html`) still uses the original bundle and is untouched.
- **Portrait image:** first paint uses `brand/muse-master-1168.webp` (half size, 124 KB). The full `brand/muse-master.webp` loads in the background and is swapped in after the reveal, so zoomed chapters are as sharp as before.
- **Entrance (no blocking intro):** `js/intro3d.js` + `css/intro.css`. Nothing covers the page any more: the headline, buttons and nav paint at once, which is what Google's speed score measures. The 3D crystal & gold logo (on the portrait's own three.js copy, `assets/intro-three.r3.js`) plays in the spot where the portrait is about to appear, with the five service icons and the service line under it, then flies into the nav logo as she fades in. About 3 s on a first visit, under 1 s on later pages, ends early on scroll, never past 6 s. A light CSS version of the mark takes over when three.js is slow, there is no WebGL, or reduced motion is on. Ali chose this over a full-screen intro on Nov 27 (he wanted the logo kept, the page instant and SEO-friendly).
- **Portrait look (r3 build):** renders at up to 2.5x on dense phone screens (was 2x), foil sparkle uses smooth fine grain (the old half-resolution blocks showed as pixels when zoomed), blink has random gaps, a slower close-hold-open and an occasional double blink, particles are a little larger and softer. Hero has three slow-drifting background lights and a vignette (last block of `css/site.css`).
- **Fonts:** Playfair Display and DM Sans are self-hosted in `assets/fonts/` (same files Google Fonts serves). No Google Fonts or jsDelivr requests remain.
- **Footer hoop:** `js/footer3d.js` now imports `assets/footer-three.r3.js`, which shares the portrait's three.js chunk.
- **Caching:** `/media` and `/brand` are cached for a day (`vercel.json`). If you replace a photo and need it seen at once, give it a new file name.
- **Phone polish (emilkowalski `mobile-native` skill):** `viewport-fit=cover` (the safe-area padding on the Book bar was doing nothing without it), every `:hover` rule gated to real mouse pointers, tap highlight off with `:active` press feedback, `touch-action: manipulation` on controls, no text selection on long-press of buttons, menu sheet no longer scrolls the page behind it. All in the last block of `css/site.css`. These need a check on a real phone; emulation cannot show them.

## 3D studio room behind the portrait (Nov 27, 2026)
- A real 3D room was built in Higgsfield 3D Jutsu (project "Susu Ink & Glow - hero studio room": arched mirror, vanity, stool, armchair, sconces, pendant globes, curtain). Two camera angles (wide, close) were rendered for desktop and phone, then finished with GPT Image 2.6 as empty-room plates.
- `.story__room` in `index.html`, styles near the end of `css/site.css`, camera move in `js/room.js`. One plate per screen shape in `media/room/` (about 20 KB each), blurred and darkened on purpose: the sharp, bright versions fought with her linework and Ali called that a mess. `js/room.js` zooms and pans over the plate so each chapter lands on a different part of the room (mirror, bottles, wall lamp, armchair, hanging globes), eased like the portrait's own zoom. To retune, edit the `WIDE` and `TALL` tables there.
- The "Real client" proof cards in the story now show on phones too (they were desktop-only).
- Originals of the room images are in the Higgsfield account (Nov 27 generations). The 3D Jutsu project lost its arch, lamps and globes after revision 1, so re-render from revision 1 or rebuild those before making new angles.

## Proof cards (Nov 27)
- Each story chapter's small card now cycles through several results (`data-slides` on `.proof`, `js/proof.js`, wipe in `css/site.css`). Images load one ahead and only while the card is on screen.
- `media/proof/` holds the crops: ears and lips are real client work cropped from Susu's Instagram posts, stories and reels; `navel.webp` is from her navel reel.
- `tattoo-1..5.webp` are AI-generated style examples, NOT client work. They are captioned "Fine line · design ideas". Do not relabel them "Real client"; swap in real tattoo photos when Susu has them.

## Lower sections pass (Nov 27)
- "Real clients, real results" is now **The work** (`#results`): two compare sliders (`.gallery--compare`), then a reel of cards (`.gallery--reel`) mixing slideshow cards (`.media.slides[data-slides]`, driven by `js/proof.js`) and short films in `media/work/` (cut from her reels, Instagram interface cropped out). On phones the reel is one swipeable row.
- About copy rewritten in a confident artist voice; on phones the section is compact (two portraits side by side, plain promise rows, photo strip swipes).
- Phone spacing tightened for prices, deposit, steps and the booking photo header.
- Footer: the gold hoop is replaced by her 3D logo (`js/footer3d.js`, same build as the entrance, reuses `assets/intro-three.r3.js`) with the five service icons floating round it (CSS in `css/footer.css`). Flat gold logo is the fallback.
- Story proof cards switch every ~1.3s.

- Prices section restyled dark to match the rest of the site (overrides at the end of `css/site.css`); `media/paper.webp` removed.
