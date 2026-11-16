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
| `work/` | The reel and all 75 real jobs in a square grid, each opening to the owner's caption, year, place and film |

Shared pieces on every page:
- **Top bar**: a centred glass pill for Personal / Commercial and a menu button. No logo: the EveryWrap mark has not been designed yet.
- **Service switcher** under the top bar in the hero.
- **Book now capsule**: the one call to action. It carries what the visitor picked (for example "Satin red wrap") into the form. A floating copy appears after the hero.
- **Live glow**: `--glow` and `--glow2` follow the finish on wraps and a fixed colour per service otherwise (`theme()` in `js/state.js`).

Moving parts only run while they are on screen, and stop for visitors who ask for reduced motion.

### Loops
Each service card plays a coded effect on stills. To use a real clip instead, save it as `assets/loops/<wrap|ppf|tint|kits>.mp4` and rebuild: the card then lazy-loads and loops the video.

Every page has a title, description, canonical link, share tags and structured data (business, breadcrumbs, service, FAQ, gallery), one H1, alt text on every image, plus `sitemap.xml` and `robots.txt`. Preview builds are marked noindex.

## Data
- `data/site.json`: name, email, service area, Instagram, the proof numbers, fleet categories.
- `data/services.json`: the copy and FAQ for each service page.
- `data/work.json`: the 75 jobs (title, finish, caption, date, place, film brands, likes, tags).

## What is not real yet
- **No prices.** None exist in the Drive, the Instagram captions or the live site. Pages say "written quote" until real numbers are supplied.
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
