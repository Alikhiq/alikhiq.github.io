import json, sys, base64, urllib.request, concurrent.futures as cf, os
BASE = ("Painted open-world video game loading-screen illustration, bold black ink outlines, cel-shaded, "
        "high-contrast dramatic lighting, saturated colors, comic-poster composition, film grain, ultra-detailed, "
        "vertical 4:5 framing. Absolutely no text, no letters, no logos, no watermarks, no UI. ")
JOBS = {
 # ME
 "me_hero": BASE + "Heroic low-angle full-body shot of a young Middle-Eastern-American tech founder (around 30) walking toward camera across a rooftop in Columbus, Ohio at sunset. "
   "He is mostly backlit so his face is in deep shadow with a warm rim light, wearing a dark navy bomber jacket, black tee, dark jeans and clean white sneakers, a smartphone glowing in one hand, laptop bag over the shoulder. "
   "Behind him a huge blood-red and orange sunset sky fills the frame over the Columbus downtown skyline and the Scioto river, birds, glowing city lights starting to come on. Cinematic, confident, main-character energy.",
 "me_card": BASE + "Waist-up character portrait for a character-select screen: a young Middle-Eastern-American tech founder (around 30) at night, standing three-quarter view with arms crossed, "
   "face lit from below by the cool blue glow of floating holographic phone screens and code windows around him, warm gold rim light from behind. Navy and champagne-gold palette. "
   "Dark navy background with soft bokeh city lights. Leave clear empty dark space on the right third of the image.",
 # ROUND CITY HQ
 "rc_hq": BASE + "A game 'safehouse' location: a small creative software studio on the second floor of a German Village brick building in Columbus, Ohio at blue hour, seen from the street at a low angle. "
   "Big warm window glowing gold, inside you can see a dark wood desk with a brass banker's lamp, two monitors and a phone on a stand. Navy-blue evening sky, wet brick street reflecting gold light, "
   "a food truck with string lights parked out front, a sleek navy car at the curb. Moody, cozy, cinematic, navy and champagne-gold palette.",
 "rc_desk": BASE + "Close interior shot of a creative studio desk at night: brass banker's lamp casting a gold pool of light, laptop open with glowing screen, a phone on a stand, "
   "coffee cup, sketches of website layouts and logo ideas pinned on the wall, rain on the window with blurred navy city lights of Columbus beyond. Navy and gold palette, quiet, focused, 'the plan' mission-briefing mood.",
 "rc_phone": BASE + "First-person view: a hand holding a modern smartphone up in front of a busy Columbus, Ohio street at golden hour, the phone screen is completely blank solid white, "
   "screen facing camera and filling the center third of the frame, street with brick buildings, cars, people and string lights softly out of focus behind. Navy and gold accents.",
 # EVERYWRAP
 "ew_hero": BASE + "Heroic low-angle shot of a vehicle wrap installer (stocky man in a black work shirt, gloves, squeegee in hand, heat gun on his belt) standing proudly in front of a sports car "
   "that is half wrapped: the front half matte black, the rear half mirror chrome reflecting neon. Inside a big garage bay at night, pink and electric-cyan neon tubes on the walls, "
   "rolls of colored vinyl on racks, vinyl scraps flying in the air, haze. Cool, confident, like a game character reveal.",
 "ew_shop": BASE + "A game map location: exterior of a vehicle wrap shop in an industrial part of Columbus, Ohio at night, big roll-up garage door open and glowing with neon, "
   "a bright satin-purple wrapped sports car pulling out of the bay, a candy-red wrapped truck and a chrome-wrapped coupe parked outside, wet asphalt reflections, palm-free Midwest street with power lines and a highway overpass behind.",
 "ew_action": BASE + "Dynamic action close-up: gloved hands stretching a sheet of iridescent color-shift vinyl over the curved fender of a sports car with a heat gun blasting, "
   "the vinyl shifting from purple to teal to gold, sparks of light, neon garage lighting, motion lines, shallow depth of field.",
}
KEY = "dummy"
def run(name, prompt):
    out = f"{name}.png"
    if os.path.exists(out): return name, "exists"
    body = {"contents":[{"parts":[{"text":prompt}]}],
            "generationConfig":{"responseModalities":["IMAGE"],"imageConfig":{"aspectRatio":"4:5","imageSize":"2K"}}}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type":"application/json","x-goog-api-key":KEY})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        return name, f"HTTP {e.code} {e.read()[:300]}"
    for c in d.get("candidates",[]):
        for p in c.get("content",{}).get("parts",[]):
            if "inlineData" in p:
                open(out,"wb").write(base64.b64decode(p["inlineData"]["data"])); return name, "ok"
    return name, "no image: " + json.dumps(d)[:300]
names = sys.argv[1:] or list(JOBS)
with cf.ThreadPoolExecutor(8) as ex:
    for n, r in ex.map(lambda n: run(n, JOBS[n]), names): print(n, r)
