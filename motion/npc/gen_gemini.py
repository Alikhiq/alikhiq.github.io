"""Regenerate the NPC art with Google AI Studio (Gemini image models) instead of kie.ai.
Usage: python3 gen_gemini.py [names...]   (default: all)   -> art/<name>.png
Optional: put a real photo at ref/ali.jpg to use Ali's real face for the me_* shots."""
import json, sys, os, base64, urllib.request, urllib.error, concurrent.futures as cf
sys.argv[0]  # prompts come from gen2.py
src = open(os.path.join(os.path.dirname(__file__) or ".", "gen2.py")).read()
ns = {}; exec(src.split("def create")[0].replace('REF="', 'REF_URL="'), ns)
J = ns["J"]
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")
KEY = os.environ.get("GEMINI_API_KEY", "dummy")  # the session proxy injects the real key
def ref_part(n):
    if not n.startswith("me_"): return []
    p = "ref/ali.jpg" if os.path.exists("ref/ali.jpg") else ("art/me_hero.jpg" if n != "me_hero" else None)
    if not p: return []
    return [{"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(open(p, "rb").read()).decode()}},
            {"text": "Use this exact man (face, hair, beard) as the person in the image."}]
def run(n):
    body = {"contents": [{"parts": ref_part(n) + [{"text": J[n]}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "4:5", "imageSize": "2K"}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    try: d = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e: return n, f"HTTP {e.code}: {json.loads(e.read())['error']['message'][:160]}"
    for c in d.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            if "inlineData" in p:
                open(f"art/{n}.png", "wb").write(base64.b64decode(p["inlineData"]["data"])); return n, "ok"
    return n, "no image returned"
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, sys.argv[1:] or list(J)): print(*r)
