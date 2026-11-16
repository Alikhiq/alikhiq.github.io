# EveryWrap v2: "One Light", image-driven

The hero is driven by image sets, not 3D. Drop new images into folders, run one script, and the site picks them up with no code changes.

## Run it
Serve this folder with any static web server (for example `python3 -m http.server`) and open `index.html`.

The pages are generated. Edit the data or the templates, then run `python3 tools/build_site.py` (add `--live` for the launch build: indexable, clean links).

## Pages
| Page | What is on it |
|---|---|
| `index.html` | Hero with the seam, the light-tunnel scene where scrolling changes the finish, four live service cards, the work reel and grid, a commercial board that changes job by itself, three compact steps, FAQ |
| `vinyl-wrap/`, `paint-protection-film/`, `window-tint/`, `body-kits/` | The hero locked to that service, plain-language detail, real jobs where the archive has them, FAQ |
| `commercial/` | Light-box hero that cycles real job photos, the "YOUR FLEET" scene, the "YOUR BRAND IN MOTION." tunnel, a live job board, fleet FAQ |
| `pricing/` | Every price table in one place, what moves the price, pricing FAQ |
| `work/` | The reel and all 75 real jobs in a square grid, each opening to the owner's caption, year, place and film |

Shared pieces on every page:
- **Top bar**: a centred glass pill for Personal / Commercial and a menu button. No logo: the EveryWrap mark has not been designed yet.
- **Service switcher** under the top bar in the hero.
- **Book now capsule**: the one call to action. It carries what the visitor picked (for example "Satin red wrap") into the form. A floating copy appears after the hero.
- **Live glow**: `--glow` and `--glow2` follow the finish on wraps and a fixed colour per service otherwise (`theme()` in `js/state.js`).

Moving parts only run while they are on screen, and stop for visitors who ask for reduced motion.

### Service pictures and loops
Each service has one themed picture at `assets/svc/<wrap|ppf|tint|kits>.webp` (generated at 4K, stored 2400 px wide) and a three-second silent loop at `assets/loops/<same>.mp4` (1920 px, about 200 KB). The loop starts and ends on the picture, so it fades in over it without a jump, and it is only fetched when its card scrolls into view. Delete a loop and rebuild to fall back to the picture with a light sweep.

Every page has a title, description, canonical link, share tags and structured data (business, breadcrumbs, service, FAQ, gallery), one H1, alt text on every image, plus `sitemap.xml` and `robots.txt`. Preview builds are marked noindex.

## Data
- `data/site.json`: name, email, service area (`area` plus `nearby` suburbs), Instagram, fleet categories.
- `data/services.json`: everything on the four service pages: title, description, H1, copy, price notes, FAQ.
- `data/copy.json`: the copy for the home, commercial, pricing and work pages, and the shared closing sections.
- `data/pricing.json`: every starting price, by service and vehicle size. Each row carries a `source` note saying where the draft number came from.
- `data/work.json`: the 75 jobs (title, finish, caption, date, place, film brands, tags).

Copy can quote a price as `{$wrap.full}` (or `{$wrap.full.1}` for the second size column), so the words always match the table.

### Prices are a draft
`pricing.json` has `"confirmed": false`. The numbers come from what other shops publish, not from EveryWrap. The launch build (`--live`) stops with an error until the owner has checked every number and set `confirmed` to `true`. The page scripts read `assets/pricing.json`, a generated copy with the notes and sources stripped out.

## What is not real yet
- **Prices are draft numbers** from other shops' published rates. See above.
- Turnaround times, film lifespans and the nearby-suburb list are typical figures, not statements the owner has confirmed.
- No phone number, street address or opening hours: none could be verified.
- The price form sends nothing until `leadEndpoint` is set in `js/config.js`.
- An uploaded photo is not re-rendered yet.
- The cars in the hero, tunnel and service cards are generated studio images, not customer jobs. They are no longer labelled on the page at the owner's request. The final set comes from `SHOTLIST.csv`.
- The job photos are the small archive copies (480 to 840 px). Full-size originals are needed for a sharper reel.

## Adding images
See `SHOTLIST.md`. In short:

    assets/sets/<vehicle>/<set>/<NNN>.webp      one file per angle, 000 first
    assets/sets/<vehicle>/_masks/ppf-*.png      built by tools/make_masks.py
    assets/vehicles.json                        nose direction and car box per vehicle

| Script | What it does |
|---|---|
| `tools/ingest.py <folder>` | Files generated images named `vehicle__set__NNN.png` into the right folders as WebP, then rebuilds the manifest |
| `tools/build_manifest.py` | Scans `assets/sets`, checks sizes and frame counts match, writes `assets/manifest.json`, reports what the shot list still needs |
| `tools/make_masks.py <vehicle> <setA> <setB>` | Builds protection-film coverage masks by comparing two finishes; no image generation |
| `tools/make_shotlist.py` | Regenerates `SHOTLIST.csv` and `SHOTLIST.md` |

Transparent PNG cutouts work too: the engine then draws the studio light and the floor reflection itself. That path has been written but not yet exercised with real cutouts.

## Files
- `index.html`, `styles.css`
- `js/engine.js`: the canvas stage (layout, seam, coverage sheen, rotate, cutout studio)
- `js/app.js`: chapters, themes, form, input rules, gallery, intro
- `js/config.js`: lead endpoint and asset folder
