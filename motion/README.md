# Motion kit — Susu Ink & Glow / Round City

Tools and source material for making motion-graphics videos from the Susu Ink & Glow website (live at https://www.susuinkandglow.com, source in `../susu-preview/`).

## kit/
Deterministic browser-rendered video compositions (built for the first three Susu ads).

- `ad1.html`, `ad2.html`, `ad3.html` — the three Susu ads ("Reveal", "The menu", "Meet Susu"). Each page draws frame *t* from one timeline.
- `logo.html` — renders the 3D crystal-and-gold SUSU logo (from `susu-preview/js/intro3d.js`) frame by frame.
- `lib/server.js` — static server on :8811. Serves `kit/work/` (frames, outputs), then `kit/`, then `susu-preview/` (so `/media/...`, `/brand/...`, `/assets/story-IExGlf7c.js` all resolve). `/__fonts/*` → `kit/fonts`, `/three/*` → `kit/cdn` (offline three.js 0.160).
- `lib/vclock2.js` — virtual clock (rAF, performance.now, Date, seeded Math.random) so capture is frame-perfect.
- `lib/cap.js` — `node lib/cap.js <page.html> <outdir> <fps> <from> <to> [list] [w] [h]` captures JPEG frames with Playwright/SwiftShader.
- `lib/logoshot.js` — renders the logo PNG sequence into `work/frames/logo/` (ad pages read `/frames/logo/NNNNN.png`). Run this first; it's slow (~1 fps in software WebGL).
- `lib/museCtl.js` — drives the blinking line-art portrait (`<muse-story>` from the site bundle) to a given chapter/position. Blink interval is the element's `blink` attribute (seconds).
- `lib/encode.sh <framedir> <name>` — H.264 1080x1920 + blurred-backdrop square + 6-frame contact sheet into `work/out/`.
- `fonts/` — Playfair Display + DM Sans (the site's typefaces) for offline rendering.

Rendering: start `node lib/server.js`, render logo frames, then `node lib/cap.js ad1.html work/f1 30 0 18`, then `lib/encode.sh work/f1 my-video`. Reel clips (`susu-preview/media/reel-*.mp4`) should be pre-extracted to frames with ffmpeg rather than played live.

## story/
Real screenshots from building the site, in order, for "making of" videos:
01 first preview → 02 3D crystal headline attempt (rejected) → 03 four flat headline options → 04 Tripo3D headline model (warped, rejected) → 05 three type systems (B chosen) → 06/07 final type on phone and desktop → 08 booking with crystal icons → 09/10 3D logo intro → 11 iPhone overlap fix → 12 footer. `icon-concept-*.jpg` are the four icon styles the client chose from (A, crystal & gold, won).

See `BUILD-STORY.md` for the true sequence of events.
