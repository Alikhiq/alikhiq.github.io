# EveryWrap v2: "One Light", image-driven

The hero is driven by image sets, not 3D. Drop new images into folders, run one script, and the site picks them up with no code changes.

## Run it
Serve this folder with any static web server (for example `python3 -m http.server`) and open `index.html`.

## What works now
- **The seam.** A straight glowing line wipes between a BEFORE set and an AFTER set, starting at the car's nose. Drag it, or change service and it sweeps across.
- **Five chapters:** Wrap (factory white against five finishes), Protect (coverage lit up on the car), Tint (clear glass against four shades), Kits (stock against a kit), Fleet (switches to the commercial theme).
- **Commercial theme:** concrete grey, navy and yellow, with real EveryWrap job photos as upright panels and a seam wipe between them.
- **Body style switch** ("Show on: Sedan, Coupe"). It lists every vehicle folder that has the sets a chapter needs.
- **Rotate.** When a set has more than one angle, dragging the car rotates it. Today every set has one angle, so this stays off until more frames are added. (`?dev=spin` fakes extra frames to test it.)
- **Price form, upload sheet and the "Tell me your car…" input**, carried over from round 1.
- **Launch intro** from real job photos.

## What is not real yet
- The price form sends nothing until `leadEndpoint` is set in `js/config.js`.
- The input is scripted rules, not a language model.
- The uploaded photo is not re-rendered.
- The hero cars are placeholder renders, labelled on the page. The final set comes from `SHOTLIST.csv`.

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
