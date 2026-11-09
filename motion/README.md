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

## Round City showcase videos (case-study reels)
Four "we made this website" videos for Round City. Final MP4s and contact sheets go to `motion/out/` (not committed).

| Video | Composition | Site captures | Length |
|---|---|---|---|
| 1. **Beauty**: the site as a film, cut to a beat grid | `kit/beauty.html` | `kit/plans/beauty-body.js` (phone viewport 432x768 @2.5 = full-bleed 1080x1920) | 26.1 s at 122 BPM ("Jealousy" by RUBII) |
| 2. **Devices**: laptop + phone in sync (vertical and `?o=l` landscape) | `kit/devices.html` | `kit/plans/devices-desk.js` (1440x900 @1.5), `kit/plans/devices-mob.js` (390x844 @2); shared timeline in `kit/plans/_sync.js` | 26 s |
| 3. **Making of**: built with Claude Code | `kit/making.html` | `motion/story/` screenshots, real PR titles, real `site.js` source | 29 s |
| 4. **Anatomy**: the hero exploded into its layers, then the type + colour system | `kit/anatomy.html` | `kit/plans/layers.js` (each layer captured on black, then black → alpha) | 24 s |

Shared pieces: `kit/lib/rc.js` + `rc.css` (Round City end card: "Designed & built by Round City", susuinkandglow.com), `kit/lib/sitecap.js` (captures the real site on the virtual clock: no Lenis, CSS animations and videos seeked to virtual time, 3D intro stripped), `kit/lib/final.sh` (H.264 yuv420p faststart + 6-frame contact sheet into `motion/out/`).

### Render
```
cd motion/kit && node lib/server.js &          # :8811
node lib/logoshot.js work/frames/logo 0 16       # 3D logo frames (Beauty)
ln -sfn ../../story work/story                   # Making of reads /story/...
# Devices
node lib/sitecap.js plans/devices-desk.js work/devices/desk --from 0 --to 23
node lib/sitecap.js plans/devices-mob.js  work/devices/mob  --from 0 --to 23
node lib/cap.js "devices.html?o=v" work/devices/v 30 0 26 && lib/final.sh work/devices/v round-city-devices
node lib/cap.js "devices.html?o=l" work/devices/l 30 0 26 - 1920 1080 && lib/final.sh work/devices/l round-city-devices-landscape 1920 1080
# Making of / Anatomy
node lib/cap.js making.html work/making 30 0 29 && lib/final.sh work/making round-city-making-of
node lib/sitecap.js plans/layers.js work/layers --list 4,4.001,4.002,4.003,4.004,4.005
python3 lib/layers_alpha.py work/layers   # black → alpha for layers 1-4
node lib/cap.js anatomy.html work/anatomy 30 0 24 && lib/final.sh work/anatomy round-city-anatomy
# Beauty (re-timed to any tempo, or to the owner's audio file)
./beauty.sh 122 0.5        # BPM, first-beat offset in seconds ("Jealousy" by RUBII = 122 BPM)
./beauty.sh song.mp3       # detects BPM + first beat with librosa, re-times, also writes a with-audio preview
```

### Beauty and the beat
Shots, cuts, sweeps and the booking ticks are placed in **beats** (`window.BEATS = {bpm, offset}`), so changing the tempo re-times everything. The portrait's eye blink is the `blink` attribute of `<muse-story>` (seconds); the engine closes the eyes when `(U - 2.6) % blink` is about 0.09 s, where U is portrait-local time. `plans/beauty-body.js` sets `blink` to 4 beats and phases `_t0` so the eyes are fully closed exactly on beats 14, 18, 22 and 26. `lib/beatnotes.py BPM OFFSET` prints the beat sheet. No music is embedded: the master is silent.
