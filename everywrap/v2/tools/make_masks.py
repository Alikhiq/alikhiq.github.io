#!/usr/bin/env python3
"""Build paint-protection coverage masks for one vehicle, with no image generation.

It compares two sets that differ only in body paint (for example satin-black and
satin-red). Every pixel that changed is body paint, so the result is a mask of
the painted panels. Three masks are written for frame 000:

    assets/sets/<vehicle>/_masks/ppf-partial.png   bumper and leading edge
    assets/sets/<vehicle>/_masks/ppf-front.png     bumper, hood, fenders, mirrors
    assets/sets/<vehicle>/_masks/ppf-full.png      every painted panel

Usage:  python3 tools/make_masks.py sedan satin-black satin-red
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

def first(veh, st):
    d = os.path.join(ROOT, "assets", "sets", veh, st)
    f = sorted(x for x in os.listdir(d) if x[:3].isdigit())[0]
    return Image.open(os.path.join(d, f)).convert("RGB")

def main(veh, a, b):
    meta = json.load(open(os.path.join(ROOT, "assets", "vehicles.json")))[veh]
    box = meta["carBox"][0] if isinstance(meta["carBox"][0], list) else meta["carBox"]
    nose = meta["nose"][0] if isinstance(meta["nose"], list) else meta["nose"]
    A, B = first(veh, a), first(veh, b)
    W, H = A.size
    d = np.abs(np.asarray(A, dtype=int) - np.asarray(B, dtype=int)).max(axis=2) > 46
    d[int(box[3] * H) + int(0.04 * H):, :] = False          # drop the floor reflection
    base = Image.fromarray((d * 255).astype("uint8")).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(2))
    out = os.path.join(ROOT, "assets", "sets", veh, "_masks")
    os.makedirs(out, exist_ok=True)
    span = box[2] - box[0]
    for name, part in (("ppf-partial", 0.33), ("ppf-front", 0.57), ("ppf-full", 1.0)):
        m = np.asarray(base).copy()
        if part < 1:
            if nose == "left":
                m[:, int((box[0] + span * part) * W):] = 0
            else:
                m[:, : int((box[2] - span * part) * W)] = 0
        al = Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.5)).resize((1280, round(1280 * H / W)), Image.LANCZOS)
        png = Image.new("RGBA", al.size, (255, 255, 255, 0))
        png.putalpha(al)
        png.save(os.path.join(out, name + ".png"), optimize=True)
        print("wrote", name, "coverage", round(float((np.asarray(al) > 128).mean()) * 100, 1), "% of frame")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
