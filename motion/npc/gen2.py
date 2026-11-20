import json, sys, time, urllib.request, os, concurrent.futures as cf
REF="https://tempfile.aiquickdraw.com/workers/images/image_f7a8e8d11cb94ebb8b764f32563e55f6.png"
H={"Content-Type":"application/json","Authorization":"Bearer KIE_API_KEY"}
STYLE=("Photorealistic cinematic still from a next-generation open-world crime game trailer: hyper-detailed real-time graphics realism, "
 "glossy and sharp, sun-blasted saturated color grade (hot orange and magenta sky, teal shadows), anamorphic lens flare, heat haze, "
 "shallow depth of field, 35mm film grain, dramatic and aspirational. Set in Columbus, Ohio. No text, no captions, no logos, no brand badges, no watermarks, no UI. ")
PHONE=("Vertical smartphone footage look, like a viral social-media clip inside a game trailer: slightly wide phone-camera lens, handheld framing, "
 "auto-exposure bloom, realistic, candid, fun. Set in Columbus, Ohio. No text, no captions, no UI overlays, no logos. ")
J={
 "me_hero": STYLE+"A confident young Middle-Eastern-American tech founder (about 30, short curly dark hair, trimmed beard) in a navy bomber jacket, black tee and white sneakers, leaning against a dark navy unbadged muscle car on a bridge over the Scioto River at golden hour, phone glowing in his hand, the downtown Columbus skyline blazing behind him under a huge red-orange sunset, lens flare cutting across the frame. Low angle, main-character energy.",
 "me_night": STYLE+"The same young Middle-Eastern-American tech founder (short curly dark hair, trimmed beard, navy bomber jacket) walking toward camera down a rain-slick Short North street in Columbus at night, laptop under his arm, pink and blue neon signs (no readable words) reflecting in puddles, steam from a grate, motion blur of a passing car.",
 "me_phone": PHONE+"Selfie-style video still: a young Middle-Eastern-American guy (short curly dark hair, trimmed beard) sitting in the driver seat of a car at night, laughing at the camera, laptop open on the passenger seat showing a website, dashboard glow on his face, city lights through the windshield.",
 "me_card": STYLE+"Tight three-quarter portrait of a young Middle-Eastern-American tech founder (about 30, short curly dark hair, trimmed beard, navy bomber jacket) looking just off camera with a slight smirk, warm golden sunset rim light on one side, cool neon blue fill on the other, blurred city bokeh behind. Leave dark negative space on the right side.",
 "rc_hero": STYLE+"A cinematic establishing shot of a small creative software studio on the second floor of a restored red-brick building on a German Village cobblestone street in Columbus at blue hour, big warm-lit window showing monitors and a brass desk lamp inside, a sleek dark navy unbadged coupe parked at the curb, string lights, a food truck glowing down the block, deep blue sky with the last orange glow.",
 "rc_inside": STYLE+"Interior of a modern creative software studio at night: dark wood desk, brass banker's lamp, two monitors full of website designs and code, a phone on a stand, exposed brick, big window behind with rain and blurred Columbus city lights, moody gold and navy lighting, cinematic, nobody in frame.",
 "rc_aerial": STYLE+"Aerial drone shot of downtown Columbus, Ohio at sunset: the Scioto River curving through, bridges, the skyline glowing gold, highways streaking with car lights, a dramatic magenta and orange sky, cinematic map-reveal feeling.",
 "rc_phone": PHONE+"Phone-camera still: a food truck owner proudly holding up her phone toward the camera next to her lit-up food truck at dusk, a long line of happy customers behind her, string lights, golden hour bokeh, candid and joyful.",
 "ew_hero": STYLE+"A tough, stocky vehicle-wrap installer (black work shirt, gloves, squeegee in hand, heat gun on his belt) standing proudly in front of an unbadged sports coupe that is half wrapped: front half satin matte black, rear half mirror chrome reflecting neon. Inside a big garage bay at night with hot pink and cyan neon tube lights, racks of colorful vinyl rolls, light haze. Low angle hero shot.",
 "ew_action": STYLE+"Extreme close-up action shot: gloved hands stretching a sheet of iridescent color-shift vinyl (purple to teal to gold) over the curved fender of an unbadged sports car, heat gun blasting, glowing heat shimmer, neon garage light reflections, macro detail.",
 "ew_shop": STYLE+"Exterior of a vehicle-wrap shop in an industrial area of Columbus at night: big roll-up garage door open and glowing with neon, a freshly wrapped satin-purple unbadged sports car rolling out onto wet asphalt, a candy-red wrapped pickup and a chrome-wrapped coupe parked outside, highway overpass and power lines behind, reflections everywhere.",
 "ew_phone": PHONE+"Phone-camera still: a young guy filming himself in shock with his hands on his head as he sees his car for the first time after a chrome wrap, the mirror-chrome unbadged car gleaming behind him in a garage, neon light, candid reaction.",
}
def create(n):
    body={"model":"nano-banana-pro","input":{"prompt":J[n]+(" Keep the exact same man (face, hair, beard, jacket) as in the reference image." if n.startswith("me_") else ""),"aspect_ratio":"4:5","resolution":"2K","output_format":"png","image_input":[REF] if n.startswith("me_") else []}}
    r=urllib.request.Request("https://api.kie.ai/api/v1/jobs/createTask",data=json.dumps(body).encode(),headers=H)
    d=json.load(urllib.request.urlopen(r)); 
    if d.get("code")!=200: return n,None,d
    return n,d["data"]["taskId"],None
def wait(n,tid):
    for _ in range(120):
        d=json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={tid}",headers=H)))["data"]
        if d["state"]=="success":
            url=json.loads(d["resultJson"])["resultUrls"][0]; os.makedirs("raw2",exist_ok=True)
            urllib.request.urlretrieve(url,f"raw2/{n}.png"); return n,"ok"
        if d["state"]=="fail": return n,"fail "+str(d.get("failMsg"))
        time.sleep(8)
    return n,"timeout"
names=sys.argv[1:] or list(J)
jobs=[]
for n in names:
    n,t,err=create(n); print(n,t or err,flush=True)
    if t: jobs.append((n,t))
with cf.ThreadPoolExecutor(12) as ex:
    for r in ex.map(lambda a: wait(*a), jobs): print(*r,flush=True)
