#!/usr/bin/env python3
"""Scan assets/sets and write assets/manifest.json.

Folder convention (this is all the site needs to pick up new images):

    assets/sets/<vehicle>/<set>/<NNN>.png|webp|jpg     one file per angle, 000 = front three-quarter
    assets/sets/<vehicle>/_masks/<name>.png            optional coverage masks (white on transparent)
    assets/vehicles.json                               nose direction and car box per vehicle

Run from the v2 folder:  python3 tools/build_manifest.py
It also checks every set of one vehicle has the same pixel size and frame count,
and reports sets listed in SHOTLIST.csv that are still missing.
"""
import csv, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SETS = os.path.join(ROOT, "assets", "sets")
EXT = (".png", ".webp", ".jpg", ".jpeg")

def size(path):
    try:
        from PIL import Image
        with Image.open(path) as im:
            return im.size, ("A" in im.getbands() or im.mode in ("LA", "PA"))
    except Exception:
        return None, None

def main():
    meta = json.load(open(os.path.join(ROOT, "assets", "vehicles.json")))
    out, problems = {"version": 1, "vehicles": {}}, []
    for veh in sorted(os.listdir(SETS)):
        vdir = os.path.join(SETS, veh)
        if not os.path.isdir(vdir):
            continue
        m = meta.get(veh)
        if not m:
            problems.append(f"{veh}: no entry in assets/vehicles.json (need nose and carBox)")
            continue
        entry = {k: m[k] for k in ("label", "body", "nose", "carBox", "anchorY") if k in m}
        entry["sets"], entry["masks"] = {}, {}
        sizes, counts = set(), set()
        for st in sorted(os.listdir(vdir)):
            sdir = os.path.join(vdir, st)
            if not os.path.isdir(sdir):
                continue
            files = sorted(f for f in os.listdir(sdir) if f.lower().endswith(EXT))
            if st == "_masks":
                for f in files:
                    entry["masks"][os.path.splitext(f)[0]] = f"sets/{veh}/_masks/{f}"
                continue
            frames = [f for f in files if re.match(r"^\d{3}\.", f)]
            if not frames:
                problems.append(f"{veh}/{st}: no frames named 000.png, 001.png ...")
                continue
            dims, alpha = size(os.path.join(sdir, frames[0]))
            if dims:
                sizes.add(dims)
            counts.add(len(frames))
            entry["sets"][st] = {"kind": "cutout" if alpha else "plate", "frames": [f"sets/{veh}/{st}/{f}" for f in frames]}
        if len(sizes) > 1:
            problems.append(f"{veh}: sets have different pixel sizes {sorted(sizes)}; every set of one vehicle must match")
        if len(counts) > 1:
            problems.append(f"{veh}: sets have different frame counts {sorted(counts)}")
        entry["frames"] = max(counts) if counts else 0
        out["vehicles"][veh] = entry
    json.dump(out, open(os.path.join(ROOT, "assets", "manifest.json"), "w"), indent=1)
    have = {(v, s) for v, e in out["vehicles"].items() for s in e["sets"]}
    shot = os.path.join(ROOT, "SHOTLIST.csv")
    missing = 0
    if os.path.exists(shot):
        want = {(r["vehicle"], r["set"]) for r in csv.DictReader(open(shot)) if r.get("vehicle") and r.get("set")}
        missing = len(want - have)
    print(f"manifest: {len(out['vehicles'])} vehicles, {sum(len(e['sets']) for e in out['vehicles'].values())} sets, "
          f"{sum(len(s['frames']) for e in out['vehicles'].values() for s in e['sets'].values())} frames; "
          f"{missing} shot-list sets still to generate")
    for p in problems:
        print("PROBLEM:", p)
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
