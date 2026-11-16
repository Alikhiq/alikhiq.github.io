#!/usr/bin/env python3
"""Move freshly generated images into the site.

Put the generated files in one folder, named exactly as SHOTLIST.csv says:

    <vehicle>__<set>__<NNN>.png        for example  sedan__satin-black__000.png

then run:   python3 tools/ingest.py path/to/that/folder

Each file is resized to at most 2400 px wide, saved as WebP (transparency is
kept), and filed under assets/sets/<vehicle>/<set>/<NNN>.webp. Older files for
the same slot are replaced. The manifest is rebuilt at the end.
"""
import os, re, subprocess, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PAT = re.compile(r"^([a-z0-9-]+)__([a-z0-9-]+)__(\d{3})\.(png|webp|jpe?g)$", re.I)

def main(src):
    done = skipped = 0
    for f in sorted(os.listdir(src)):
        m = PAT.match(f)
        if not m:
            print("skipped (name does not match vehicle__set__NNN):", f)
            skipped += 1
            continue
        veh, st, n = m.group(1).lower(), m.group(2).lower(), m.group(3)
        im = Image.open(os.path.join(src, f))
        im = im.convert("RGBA" if ("A" in im.getbands()) else "RGB")
        if im.width > 2400:
            im = im.resize((2400, round(im.height * 2400 / im.width)), Image.LANCZOS)
        d = os.path.join(ROOT, "assets", "sets", veh, st)
        os.makedirs(d, exist_ok=True)
        for old in os.listdir(d):
            if old.startswith(n + "."):
                os.remove(os.path.join(d, old))
        im.save(os.path.join(d, n + ".webp"), quality=86, method=6)
        done += 1
    print(f"ingested {done}, skipped {skipped}")
    return subprocess.call([sys.executable, os.path.join(ROOT, "tools", "build_manifest.py")])

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
