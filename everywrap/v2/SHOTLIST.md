# EveryWrap shot list

**384 images.** Every row is one file the site already has a slot for. The full list with a prompt per file is in `SHOTLIST.csv`.

## How to use it
1. Open `SHOTLIST.csv`. Each row has the exact file name, the pixel size and the prompt.
2. Rows with nothing in `depends_on` are generated from text. Do these first and approve them: every other image of that vehicle is built on them.
3. Rows with a file in `depends_on` are edits. Attach that file and use the prompt. This is what keeps the car in the same place in every finish, which the seam needs.
4. Save every file under the name in the `file` column, all in one folder.
5. Run `python3 tools/ingest.py <that folder>`. It resizes, converts and files everything, then rebuilds the manifest. No code changes.
6. After a vehicle's first set is in, add its `nose` and `carBox` to `assets/vehicles.json` (the values per angle are listed at the bottom of this file), then run `python3 tools/make_masks.py <vehicle> satin-black satin-red` for the protection-film masks.

## Rules that keep the set usable
- **Same framing inside a vehicle.** Every set of one vehicle must have the same pixel size and the same eight angles. The edit prompts handle this; do not re-frame.
- **No badges, logos, plates, people or text** in any image.
- **PNG at full size.** The ingest script makes the web versions.
- **Fleet vehicles need a transparent background** (they sit on a light theme). ChatGPT can output transparent PNGs directly. Car paint sets sit on the black studio and do not need transparency.
- **Real photos stay real.** Shop, process and customer-car pictures should come from a camera, not a generator. They are not on this list.

## What is on the list

| Group | Images | Notes |
|---|---|---|
| A. Car paint sets | 240 | 5 vehicles x 8 angles x 6 finishes. 40 are text-to-image, 200 are edits. |
| B. Clear glass (for tint) | 40 | 5 vehicles x 8 angles. Lets the tint chapter show clear against dark glass. |
| C. Body kits | 16 | Sedan and coupe x 8 angles. |
| D. Fleet vehicle sets | 36 | 3 work vehicles x 4 angles x (blank + 2 designs). Replaces the photo panels with a van you can wrap live. |
| E. Detail close-ups | 16 | For the sections under the hero. |
| F. Finish swatches | 24 | Grows the finish picker from 5 to 24. |
| G. Empty scenes | 8 | Backgrounds for sections and the intro. |
| H. Sharing images | 4 | Link previews and social. |

Total: **384**, which leaves room for retries inside 400.

## Angles

| Frame | View | `nose` value |
|---|---|---|
| 000 | front three-quarter view, nose toward the left | left |
| 001 | exact side profile, nose toward the left | left |
| 002 | rear three-quarter view, tail toward the right, nose away to the left | left |
| 003 | straight rear view | left |
| 004 | rear three-quarter view from the other side, nose away to the right | right |
| 005 | exact side profile, nose toward the right | right |
| 006 | front three-quarter view from the other side, nose toward the right | right |
| 007 | straight front view | left |

## Vehicles

| Folder | What to draw | Model EveryWrap has wrapped |
|---|---|---|
| `sedan` | a modern wide-body American muscle sedan with four doors | Dodge Charger |
| `coupe` | a rear-engine German sports coupe | Porsche 911 |
| `suv` | a full-size luxury SUV | Chevrolet Tahoe or Range Rover |
| `truck` | a full-size crew-cab pickup truck | Ford F-150 |
| `ev` | a compact electric crossover with a glass roof | Tesla Model Y |
| `van` | a high-roof cargo van | Mercedes Sprinter |
| `box-truck` | a cab-over box truck with a 16 ft box | Isuzu NPR |
| `food-truck` | a step-van food truck with a serving window | Freightliner step van |
