# NPC series ("If my clients were NPCs in GTA 6"), v2 photoreal

Finished files are in `videos/npc/`:
- `ali/`, `roundcity/`, `everywrap/`: carousel slides (2160×2700 JPG, 4:5; 7 for Ali and Everywrap, 6 for Round City), two 4:5 video slides with sound, and a GIF loop for each
- `npc-trailer-reel-9x16.mp4`: a 23 s Reel cut like a game trailer (letterboxed clips, title cards, name captions, impact sounds on the cuts)

## How it's built
- `art/`: 12 photoreal stills from Nano Banana Pro on kie.ai (prompts in `gen2.py`). Ali's four shots use `me_hero` as the face reference so he's the same person in each.
- `clips/`: 5 s image-to-video clips (Kling 2.6 on kie.ai) of me_hero, me_night, ew_hero, ew_phone, rc_hero and rc_aerial
- `npc.html` + `chars.json`: the slide engine. Edit the text in `chars.json`, then run `node render.js stills`.
- `overlay.js`: renders the transparent HUD layers and Reel cards into `overlays/`
- `comp.py`: puts the clips and overlays together with sounds from `../kit/snd` to make the video slides and the Reel. Paths: clips/, overlays/, output final/.

## Before posting
- Ali's face is an AI stand-in. Regenerate it with a real photo of him as the reference image (`image_input` in `gen2.py`).
- Everywrap is assumed to be a vehicle-wrap shop. A Toyota badge (hero) and a BMW roundel (shop) were painted out.
- `@614lux` on Ali's phone-clip slide and the Round City prices both need checking.
- No GTA or Rockstar logos, fonts, characters or places are used. "GTA 6" appears only as plain hook text.
