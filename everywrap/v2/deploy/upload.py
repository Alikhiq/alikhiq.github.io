#!/usr/bin/env python3
"""Upload the built site to the R2 bucket the Worker serves from.

Run tools/build_site.py --live first. Needs CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_API_TOKEN
unless the network already signs requests to the Cloudflare API.
Only the public files are sent: the generator, the source data and the notes stay here.
Files removed from the site are not removed from the bucket.
"""
import concurrent.futures as cf, os, subprocess, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUCKET = "everywrap-site"
PUBLIC = ["index.html", "desk", "styles.css", "favicon.svg", "site.webmanifest", "sitemap.xml", "robots.txt", "data/work.json",
          "js", "assets", "vinyl-wrap", "paint-protection-film", "window-tint", "body-kits", "commercial", "design-print", "pricing", "work"]
TYPES = {"html": "text/html; charset=utf-8", "css": "text/css", "js": "text/javascript", "json": "application/json", "svg": "image/svg+xml",
         "webp": "image/webp", "jpg": "image/jpeg", "png": "image/png", "mp4": "video/mp4", "xml": "application/xml", "txt": "text/plain",
         "webmanifest": "application/manifest+json"}

def files():
    for item in PUBLIC:
        full = os.path.join(ROOT, item)
        if os.path.isfile(full):
            yield item
        for d, _, names in os.walk(full):
            for n in names:
                yield os.path.relpath(os.path.join(d, n), ROOT)

def put(key):
    account, token = os.environ["CLOUDFLARE_ACCOUNT_ID"], os.environ.get("CLOUDFLARE_API_TOKEN")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/{BUCKET}/objects/{urllib.parse.quote(key)}"
    cmd = ["curl", "-sS", "-o", os.devnull, "-w", "%{http_code}", "-X", "PUT", url, "-H", "content-type: " + TYPES.get(key.rsplit(".", 1)[-1].lower(), "application/octet-stream"),
           "--data-binary", "@" + os.path.join(ROOT, key)]
    if token:
        cmd += ["-H", "Authorization: Bearer " + token]
    for _ in range(4):
        code = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
        if code == "200":
            return None
    return key, code

if __name__ == "__main__":
    todo = sorted(set(files()))
    with cf.ThreadPoolExecutor(8) as pool:
        bad = [x for x in pool.map(put, todo) if x]
    print(f"{len(todo)} files, {len(bad)} failed", bad[:5])
    sys.exit(1 if bad else 0)
