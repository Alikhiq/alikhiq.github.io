# Clasuke Studio

Endless audio-reactive 3D visuals for streams and clips, made for [@clasuke](https://www.instagram.com/clasuke/).
Press play, hit **Nuevo visual**, record a 1080p clip or hide the UI and capture it in OBS.
Spanish by default, English one click away.

- Audio: built-in demo beat, your songs (open or drop), microphone, PC audio.
- Every visual comes from one seed, shown as a 7-character code. Type a code to get the same visual back.
- A visual = background (color, video loop, 360° photo, or your own file) + one of 7 three.js scenes
  + one of 12 post styles + up to 3 Canvas2D overlay families + a palette.
- The browser rail locks a background, a 3D scene or a style; everything else keeps changing.
- Recording: canvas + audio through MediaRecorder, 1080×1920 / 1920×1080 / 1080×1080, MP4 where the
  browser can encode it, WebM otherwise.
- Installable (PWA), works offline except for the video backgrounds.

## Run

Needs Node 20 or newer (built and tested with Node 22.23).

```bash
npm install
npm run dev        # Vite dev server with hot reload, http://localhost:5173
```

## Build and serve

```bash
npm run build      # writes dist/
npm start          # node server.js, serves dist/ on PORT (default 3000)
```

`server.js` has no dependencies. It serves `dist/`, answers byte-range requests (the video loops need
them), sends `Cache-Control: immutable` for the hashed files in `/assets/`, `no-cache` for `index.html`,
`sw.js` and the manifest, compresses text with brotli/gzip, and answers `GET /health`.

## Deploy on Railway

1. New service from this repo. In the service settings set **Root Directory** to `clasuke-studio-app`.
2. Nothing else to configure: `railway.json` sets the build command (`npm run build`), the start
   command (`npm start`) and the health check (`/health`). Railway provides `PORT`.
3. Generate a domain. The app needs HTTPS for the microphone, PC audio, install and offline support;
   Railway domains have it.

## Test

```bash
npm run build
npm run test:smoke
```

The smoke test starts `server.js` on a free port and drives the app in headless Chromium with software
WebGL: load, 12 new visuals, locking a background / scene / style, the demo beat, loading a WAV, a
9:16 recording checked with `ffprobe`, stream mode, the language toggle, offline start, the phone
viewport and the 2D fallback. It needs Playwright (found through `NODE_PATH`), `python3` and `ffprobe`;
none of them are dependencies of the app. Screenshots go to `test/out/` or `SHOTS_DIR`.

## Keys

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `Space` | play / pause | `H` | stream mode (hide the UI), `Esc` to leave |
| `G` | new visual | `F` | fullscreen |
| `←` `→` | previous / next visual | `R` | record / stop |
| `S` | save to favorites | `1`–`4` | format: free, 9:16, 16:9, 1:1 |
| `A` | auto (new visual every 32 beats) | `T` | @clasuke tag on / off |
| `O` | open songs | `N` `B` | next / previous song |
| `U` | unlock everything | `Ctrl/⌘ K` or `?` | command palette |

Address options: `/#CODE` opens that visual. `/?hq` keeps the full internal resolution even when
frames are slow (by default the app lowers it on slow machines).

## Project layout

```
index.html              markup and the icon sprite
server.js               production server (Railway)
railway.json            build / start / health check
vite.config.js          build config + the plugin that writes sw.js with the precache list
public/                 media/, thumbs/, icons, manifest
scripts/
  make-posters.sh       background thumbnails from public/media (ffmpeg)
  make-thumbs.mjs       scene and style thumbnails rendered by the app itself (Playwright)
src/
  main.js               boot and the frame loop
  core/                 rng + codes, storage, i18n (all strings, es/en), settings, event bus
  audio/                engine (graph, sources, playlist), demo synth, analysis (bands, beats, idle signal)
  visual/               catalog, recipe (seed → visual), families2d, renderer2d, stage, studio (history, locks, favorites)
  visual/gl/            world (three.js scene, backgrounds, composer), scenes (7), style (uber shader)
  record/               MediaRecorder export
  ui/                   deck, browser rail, command palette, overlays, shortcuts, actions, toast
  pwa/                  service worker template + registration
  styles/app.css
test/smoke.mjs          end-to-end smoke test
```

To add a background: put the file in `public/media/`, add a line to `ENVS` in `src/visual/catalog.js`,
run `bash scripts/make-posters.sh` (add the id there too) and credit it below and in
`public/media/CREDITS.md`. Scene and style thumbnails are regenerated with `npm run thumbs` while
`npm start` is running.

## Media credits and licenses

The full list with links is in [`public/media/CREDITS.md`](public/media/CREDITS.md).

- **360° backgrounds: Poly Haven, CC0.** Tonemapped JPGs of the HDRIs Shanghai Bund, Rooftop Night,
  Neuer Zollhof, Metro Noord and Moonless Golf, resized to 3072×1536. CC0: free for any use, no
  attribution required.
- **Video loops: Mixkit, Mixkit Stock Video Free License.** Eight clips trimmed to about 10 s and
  re-encoded to 720p H.264 without audio. The license allows personal and commercial projects. It does
  not allow redistributing or selling the clips as stock on their own. Check
  <https://mixkit.co/license/> before any wider distribution.
- **Thumbnails** in `public/thumbs/` are frames of those files or pictures rendered by this app.
- **Fonts:** Syne, Hanken Grotesk and Martian Mono, all SIL Open Font License 1.1, self-hosted through
  the `@fontsource-variable/*` packages.
- **three.js:** MIT.

The look is original: no franchise characters, symbols, names or logos.
