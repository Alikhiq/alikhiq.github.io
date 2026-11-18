# NPC series ("If my clients were NPCs in GTA 6")

Finished files are in `videos/npc/`: 6 carousel slides (2160×2700 JPG, 4:5), a hero clip and a wanted-stars clip (1080×1350 MP4 with sound), a wanted GIF for each character, plus `npc-reel-9x16.mp4` (all three heroes, 19.5 s).

## How it's built
- `npc.html` is the slide engine: one template, six layouts (hero, card, talk, phone, wanted, done) plus `seek(t)` for the clips.
- `chars.json` holds each character's text, stats, colors and lines. Edit it and re-render.
- `node render.js stills [me rc ew]` renders the slides to `out/<id>/`. `node render.js clip` renders the clip frames.
- `python3 enc.py` encodes the MP4s with sounds from `../kit/snd`, the GIFs and the 9:16 reel.
- `gen.py` holds the art prompts (Gemini image API). The art in `art/` came from Seedream 4 (Ali, 4K) and Gemini 3.1 Flash Image (Round City HQ, Everywrap, 1K).

## Before posting
- `art/me_*` is an AI stand-in, not Ali's real face. Regenerate it with a selfie as the reference.
- The Everywrap art is a guess that they do vehicle wraps. A car badge in it was blurred out.
- Round City prices come from the rc-01…rc-08 videos. Check they're still current.
- No GTA or Rockstar logos, fonts or characters are used. "GTA 6" appears only as plain hook text.
