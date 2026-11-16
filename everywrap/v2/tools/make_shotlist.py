#!/usr/bin/env python3
"""Write SHOTLIST.csv and SHOTLIST.md: every image the site has a slot for.

Edit the tables below and re-run:  python3 tools/make_shotlist.py
"""
import csv, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

VEHICLES = [  # folder, what to draw, a real model EveryWrap has wrapped (suggestion only)
    ("sedan", "a modern wide-body American muscle sedan with four doors", "Dodge Charger"),
    ("coupe", "a rear-engine German sports coupe", "Porsche 911"),
    ("suv", "a full-size luxury SUV", "Chevrolet Tahoe or Range Rover"),
    ("truck", "a full-size crew-cab pickup truck", "Ford F-150"),
    ("ev", "a compact electric crossover with a glass roof", "Tesla Model Y"),
]
ANGLES = [  # frame, description, nose direction for vehicles.json
    ("000", "front three-quarter view, nose toward the left", "left"),
    ("001", "exact side profile, nose toward the left", "left"),
    ("002", "rear three-quarter view, tail toward the right, nose away to the left", "left"),
    ("003", "straight rear view", "left"),
    ("004", "rear three-quarter view from the other side, nose away to the right", "right"),
    ("005", "exact side profile, nose toward the right", "right"),
    ("006", "front three-quarter view from the other side, nose toward the right", "right"),
    ("007", "straight front view", "left"),
]
PAINTS = [
    ("factory-white", None),
    ("satin-black", "satin black vinyl: deep black with a soft milky sheen and soft diffused highlights"),
    ("gloss-black", "deep gloss black: wet mirror-like clearcoat with sharp reflections of the overhead light"),
    ("satin-grey", "satin grey: a flat solid medium battleship grey with a soft sheen, no metallic flake"),
    ("satin-red", "satin red: a rich deep candy red with a soft satin sheen"),
    ("color-shift", "iridescent colour-shift vinyl flowing from deep purple to teal to blue, satin-gloss sheen"),
]
SCENE = ("in a pitch-black studio with a glossy black floor, lit by one long rectangular softbox overhead, soft haze, "
         "a faint reflection of the car in the floor. The car is centred, fills about half of the frame width, with clear "
         "black space on every side. No badges, no logos, no licence plates, plain black tyre sidewalls, no people, no text. "
         "Photorealistic studio car photography, 50mm lens, camera at 1.1 m, 16:9.")
KEEP = ("Keep everything else pixel-identical: camera, framing, car position and size, wheels, lights, background, floor and "
        "the overhead light. No text.")
FLEET = [
    ("van", "a high-roof cargo van", "Mercedes Sprinter"),
    ("box-truck", "a cab-over box truck with a 16 ft box", "Isuzu NPR"),
    ("food-truck", "a step-van food truck with a serving window", "Freightliner step van"),
]
FLEET_ANGLES = ANGLES[:2] + [ANGLES[5], ANGLES[6]]
FLEET_SETS = [
    ("blank-white", None),
    ("design-a", "a bold full-wrap fleet graphic of large abstract shapes in navy and safety yellow, with no lettering and no logos"),
    ("design-b", "a clean partial-wrap fleet graphic: one wide diagonal colour band along the side in cobalt blue and orange, with no lettering and no logos"),
]
DETAILS = ["wrapped door handle recess", "wrapped mirror cap, edge tucked", "door jamb with the wrap carried round the edge", "fuel door seam",
           "bumper corner and intake", "badge-delete area on the trunk lid", "roof rail and antenna base", "tail light edge with a clean knife line",
           "satin black hood reflecting one long light", "colour-shift film on a fender curve", "gloss black B-pillar", "chrome delete on window trim",
           "water beading on protection film", "protection film edge on a hood, nearly invisible", "tinted side glass against clear glass", "carbon fibre splitter end plate"]
SWATCHES = ["Satin Black", "Gloss Black", "Matte Black", "Satin Dark Grey", "Satin Grey", "Gloss Nardo-style Grey", "Satin White", "Gloss White",
            "Satin Red", "Gloss Red", "Satin Blue", "Gloss Sky Blue", "Matte Military Green", "Satin Olive", "Satin Copper", "Matte Autumn Orange",
            "Satin Pink", "Gloss Yellow", "Gloss Lime", "Satin Purple", "Purple-Teal Colour Shift", "Gold-Purple Colour Shift", "Brushed Steel", "Carbon Fibre"]

rows = []
def add(group, path, size, fmt, prompt, vehicle="", st="", frame="", depends=""):
    rows.append(dict(id=len(rows) + 1, group=group, file=path, vehicle=vehicle, set=st, frame=frame, size=size, format=fmt, depends_on=depends, prompt=prompt))

for folder, desc, model in VEHICLES:
    for frame, adesc, _ in ANGLES:
        base = f"{folder}__factory-white__{frame}.png"
        for st, paint in PAINTS:
            name = f"{folder}__{st}__{frame}.png"
            if paint is None:
                add("A. Car paint sets", name, "2752x1536", "PNG", f"Studio photograph of {desc} ({model} proportions) in plain gloss white factory paint, {adesc}, {SCENE}", folder, st, frame)
            else:
                add("A. Car paint sets", name, "2752x1536", "PNG", f"Edit the attached image. Change only the body paint to {paint}. The floor reflection takes the new colour. {KEEP}", folder, st, frame, base)
        add("B. Clear glass (for tint)", f"{folder}__clear-glass__{frame}.png", "2752x1536", "PNG",
            f"Edit the attached image. Change only the glass: make every window clear untinted factory glass so the interior is visible. Body stays satin black. {KEEP}", folder, "clear-glass", frame, f"{folder}__satin-black__{frame}.png")
for folder in ("sedan", "coupe"):
    for frame, adesc, _ in ANGLES:
        add("C. Body kits", f"{folder}__kit__{frame}.png", "2752x1536", "PNG",
            f"Edit the attached image. Add an aftermarket aero body kit and change nothing else: carbon front splitter, side skirts, rear spoiler, slightly lower stance. Body stays satin black. {KEEP}", folder, "kit", frame, f"{folder}__satin-black__{frame}.png")
for folder, desc, model in FLEET:
    for frame, adesc, _ in FLEET_ANGLES:
        base = f"{folder}__blank-white__{frame}.png"
        for st, design in FLEET_SETS:
            name = f"{folder}__{st}__{frame}.png"
            if design is None:
                add("D. Fleet vehicle sets", name, "2752x1536", "PNG (transparent background)", f"Studio photograph of {desc} ({model} proportions) in plain white, {adesc}, on a transparent background with only a soft contact shadow, even soft daylight, centred, filling about 60% of the frame width. No badges, no logos, no lettering, no licence plates, no people. Photorealistic, 16:9.", folder, st, frame)
            else:
                add("D. Fleet vehicle sets", name, "2752x1536", "PNG (transparent background)", f"Edit the attached image. Wrap the vehicle in {design}. Keep everything else pixel-identical, including the transparent background. No text.", folder, st, frame, base)
for i, d in enumerate(DETAILS, 1):
    add("E. Detail close-ups", f"detail__{i:02d}.png", "2400x1600", "PNG", f"Macro studio photograph: {d}. Shallow depth of field, one long soft light, black background, no logos, no text, no people. Photorealistic, 3:2.")
for i, s in enumerate(SWATCHES, 1):
    add("F. Finish swatches", f"swatch__{i:02d}__{s.lower().replace(' ', '-')}.png", "1024x1024", "PNG", f"Flat-lay macro photograph of a curved sample panel wrapped in {s} vinyl, filling the frame, one soft light strip reflected across it, no text, no logos. Square.")
for i, (s, size) in enumerate([("black studio, one long softbox, empty glossy floor", "2752x1536"), ("the same black studio, portrait", "1536x2752"), ("warm concrete-grey studio, empty polished floor, one long softbox", "2752x1536"), ("the same concrete studio, portrait", "1536x2752"),
                               ("wrap bay with film rolls on a rack, no people, no brand names", "2752x1536"), ("cutting table with a squeegee, knife and heat gun laid out, no brand names", "2752x1536"), ("night exterior, wet asphalt, empty", "2752x1536"), ("daylight yard, clean concrete, blue sky, empty", "2752x1536")], 1):
    add("G. Empty scenes", f"scene__{i:02d}.png", size, "PNG", f"Photograph of an empty scene: {s}. No vehicles, no people, no text. Photorealistic.")
for i, s in enumerate(["link preview image, satin black car, one light, room for a headline at left", "square profile image, car nose and light strip", "portrait story background, car low in frame", "wide banner, seam of light across a half-white half-black car"], 1):
    add("H. Sharing images", f"share__{i:02d}.png", ["1200x630", "1080x1080", "1080x1920", "2400x800"][i - 1], "PNG", f"{s}. Black studio, no text, no logos.")

with open(os.path.join(ROOT, "SHOTLIST.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)

groups = {}
for r in rows:
    groups.setdefault(r["group"], []).append(r)
L = ["# EveryWrap shot list", "",
     f"**{len(rows)} images.** Every row is one file the site already has a slot for. The full list with a prompt per file is in `SHOTLIST.csv`.", "",
     "## How to use it",
     "1. Open `SHOTLIST.csv`. Each row has the exact file name, the pixel size and the prompt.",
     "2. Rows with nothing in `depends_on` are generated from text. Do these first and approve them: every other image of that vehicle is built on them.",
     "3. Rows with a file in `depends_on` are edits. Attach that file and use the prompt. This is what keeps the car in the same place in every finish, which the seam needs.",
     "4. Save every file under the name in the `file` column, all in one folder.",
     "5. Run `python3 tools/ingest.py <that folder>`. It resizes, converts and files everything, then rebuilds the manifest. No code changes.",
     "6. After a vehicle's first set is in, add its `nose` and `carBox` to `assets/vehicles.json` (the values per angle are listed at the bottom of this file), then run `python3 tools/make_masks.py <vehicle> satin-black satin-red` for the protection-film masks.", "",
     "## Rules that keep the set usable",
     "- **Same framing inside a vehicle.** Every set of one vehicle must have the same pixel size and the same eight angles. The edit prompts handle this; do not re-frame.",
     "- **No badges, logos, plates, people or text** in any image.",
     "- **PNG at full size.** The ingest script makes the web versions.",
     "- **Fleet vehicles need a transparent background** (they sit on a light theme). ChatGPT can output transparent PNGs directly. Car paint sets sit on the black studio and do not need transparency.",
     "- **Real photos stay real.** Shop, process and customer-car pictures should come from a camera, not a generator. They are not on this list.", "",
     "## What is on the list", "", "| Group | Images | Notes |", "|---|---|---|"]
notes = {"A": "5 vehicles x 8 angles x 6 finishes. 40 are text-to-image, 200 are edits.", "B": "5 vehicles x 8 angles. Lets the tint chapter show clear against dark glass.",
         "C": "Sedan and coupe x 8 angles.", "D": "3 work vehicles x 4 angles x (blank + 2 designs). Replaces the photo panels with a van you can wrap live.",
         "E": "For the sections under the hero.", "F": "Grows the finish picker from 5 to 24.", "G": "Backgrounds for sections and the intro.", "H": "Link previews and social."}
for g, rs in groups.items():
    L.append(f"| {g} | {len(rs)} | {notes[g[0]]} |")
L += ["", f"Total: **{len(rows)}**, which leaves room for retries inside 400.", "", "## Angles", "", "| Frame | View | `nose` value |", "|---|---|---|"]
L += [f"| {a} | {d} | {n} |" for a, d, n in ANGLES]
L += ["", "## Vehicles", "", "| Folder | What to draw | Model EveryWrap has wrapped |", "|---|---|---|"]
L += [f"| `{a}` | {b} | {c} |" for a, b, c in VEHICLES + FLEET]
open(os.path.join(ROOT, "SHOTLIST.md"), "w").write("\n".join(L) + "\n")
print(len(rows), {g: len(r) for g, r in groups.items()})
