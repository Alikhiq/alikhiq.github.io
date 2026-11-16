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
| `design-print/` | Design services (branding, custom car wraps, commercial van and fleet wraps, artwork setup), design prices, a per-square-foot print price list with a calculator, the full product range drawn as coded material swatches, real printed jobs, FAQ |
| `pricing/` | Every price table in one place, what moves the price, pricing FAQ |
| `work/` | The reel and all 75 real jobs in a square grid, each opening to the owner's caption, year, place and film |

Shared pieces on every page:
- **Top bar**: the logo, and a glass pill with the three things EveryWrap sells: Cars, Business, Design.
- **Menu**: the same three groups, each listing its services.
- **Catalogue** (`#services` on the home page): every service in those three groups with its starting price, straight under the hero. The list is `catalog` in `data/copy.json`.
- **Dock**: Services, Work, Book now and Prices, fixed at the bottom once the hero has scrolled away.
- **Booking**: three steps. What do you need (grouped, with starting prices), the details that fit that choice (a car and its size, a list of vehicles, or a job description), then contact. The last screen says what happens next.
- **Logo**: an inline SVG (`mark()` and `logo()` in the generator, `.logo` in the stylesheet). One strip of film that wraps round twice and reads as an E: the first turn in the text colour, the second in the live glow colour, with a glint running along it. The name is set in Newsreader, with Wrap in italic. The favicon uses the same paths.
- **Launch intro** (home page, once per visit, skipped for reduced motion): the mark draws itself, the name rises, then the black sheet lifts off the page while the mark travels to the logo in the top bar. `INTRO` in the generator, `.intro` in the stylesheet, `playIntro()` in `js/site.js`.
- **Trust badges and film brands**: `trust` and `trust_com` in `data/copy.json`, `suppliers` in `data/site.json`. Brands are named in text; no third-party logos are used.
- **Voice assistant**: an ElevenLabs agent, linked from the hero, the menu and the closing section. Its id is `voice_agent` in `data/site.json`; remove it to hide the links. The agent's prices are written into its prompt and must be updated there when `pricing.json` changes.
- **Live glow**: `--glow` and `--glow2` follow the finish on wraps and a fixed colour per service otherwise (`theme()` in `js/state.js`).

Moving parts only run while they are on screen, and stop for visitors who ask for reduced motion.

### Explainers and motion, all in code
- **Layers**: an exploded view of what sits on the car (panel, paint, film, protection film), on the home, wrap and PPF pages.
- **What the film does**: a stone bouncing off the film and a scratch closing with warmth, on the PPF page.
- **What the percentage means**: light passing through glass at 70, 50, 35, 20 or 5 percent, with the Ohio rule, on the tint page.
- **One design, every vehicle**: the same graphic drawing itself across a van, a box truck and a trailer, on the commercial page.
- A moving band of words, numbered section headings that wipe in, a scroll line at the top, film grain, soft light pools per section, icons on the good-to-know cards, and two tags either side of the hero seam that say which side is which.

### Mockup studio
`js/mock.js` draws a van, box truck, trailer or car in SVG and puts a wrap on it: six layouts, eight colour pairs, three vehicle colours, plus the visitor's own business name and a second line. It cycles through examples until someone touches it. "Send us this mockup" passes the choices to the booking form as a note. It is on the design and print page and the commercial page. Add a vehicle or a layout by adding an entry to `VEH` or `ART` at the top of the file.

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

### Print prices
Six rows in the `print` group are the owner's own prices (their `source` starts with `owner`): 3M laminated $8.43 and unlaminated $7.21 per square foot, Avery Dennison at 3M plus 5%, chrome at double the laminated 3M price, wall graphics $3.30. The other print and design rows are a trade printer's published prices multiplied by 1.6, the ratio of the owner's 3M price to that printer's, and started as drafts.

### Price approval
`pricing.json` has `"confirmed": true`: the owner approved publishing the prices as starting prices on 16 Nov 2026. Apart from the six print rows, the numbers started from what other shops publish, and the owner can correct any of them in that file. The launch build (`--live`) stops with an error whenever `confirmed` is `false`. The page scripts read `assets/pricing.json`, a generated copy with the notes and sources stripped out.

## What is not real yet
- **Most prices started from other shops' published rates.** The owner approved publishing them; see above.
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

## Hosting

The site is live at https://everywrap.com, on the Cloudflare account that holds the domain.

- The files live in the R2 bucket `everywrap-site`. The Worker `everywrap-v2` (`deploy/worker.js`, `deploy/wrangler.jsonc`) serves them.
- `everywrap.com` is the public address. `www.everywrap.com` redirects to it. `new.everywrap.com` and the workers.dev address serve the same files with a noindex header.
- The older site is still there as the Worker `everywrap-columbus`, with no domain attached. Pointing the two domains back at it undoes the launch.

To publish a change:

1. `python3 tools/build_site.py --live` (the launch build: indexable, links without `index.html`).
2. `python3 deploy/upload.py` (needs `CLOUDFLARE_ACCOUNT_ID`).
3. `python3 tools/build_site.py` again, so the pages kept in the repo stay the preview build.
4. Only when `deploy/worker.js` changes: `npx wrangler deploy` from `deploy/`.

Booking requests: the form opens the visitor's email app with the request written out, addressed to `LEAD_TO` with a copy to `LEAD_CC`. Both are settings on the Worker (`/lead.json`); the copy address is a Worker secret and is not in the repo. The older site sent requests the same way. `sales@everywrap.com` has no mail records on the domain, so the copy address is the one that receives. Setting `leadEndpoint` in `js/config.js` replaces the email step with a direct post.

Prices: `data/pricing.json` has `"confirmed": true` since the owner approved publishing on 16 Nov 2026. The `source` notes say which numbers are the owner's own and which started from other shops' rates.
