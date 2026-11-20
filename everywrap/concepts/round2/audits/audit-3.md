# Audit loop 3: prompt mechanics (v3 to v4)

Scope: only whether Nano Banana 2.1 will draw what each prompt means on the first try. Creative direction, copy, layout and loop-2 limits are unchanged.

## Structural pattern applied to all nine
1. Format line first: "Flat UI screenshot of a website hero section, desktop, landscape 16:9" or, for phones, a portrait sentence that says taller than wide, no bars, no phone body, no status bar, no notch.
2. SCENE, then CAR (personal frames only) in labelled blocks.
3. Phones get a LAYOUT block of vertical bands in percent of screen height. This makes the model build a portrait stack and stops it from letterboxing a landscape image.
4. ON-SCREEN TEXT is a numbered list that says "exactly these text elements, nothing else". It gives each string in straight double quotes with its position and colour. Strings no longer sit in the middle of paragraphs.
5. OTHER UI (no text) holds elements that must not carry labels, such as the finish dots.
6. PALETTE last. The `shared_tail` holds the global negatives.

v4 frames run about 1,850 to 2,600 characters plus a 890-character tail. That is longer than v3, but every late instruction is now in a labelled list, which this model family follows better than long prose.

## Global fixes
- **Commercial frames and the references (most important).** v3's `shared_tail` said "The car is exactly the car in the reference images", and it was appended to the commercial frames too. With the references attached, that invited the model to put the supercar into the van gallery. Two fixes: every commercial frame now opens with "THE SPORTS CAR ... DOES NOT APPEAR ANYWHERE IN THIS FRAME", and the tail's car rules are scoped with "IF THE SPORTS CAR APPEARS".
- **Reference contamination.** Every car block now says to use references 1 and 2 only for body shape, proportions, wheels and details, and not to copy their grey floor, black backdrop, lighting or framing. The tail adds no licence plate and nothing copied from the references except the car.
- **Nose and tail.** In reference 1 the nose points toward the viewer and to the right. Each car block now names that orientation, and One Light names which side of the seam is which: FRONT HALF right of the seam is satin black, REAR HALF left of the seam is gloss white.
- **Contrast.** Each headline states its contrast (for example "bone white, high contrast on the black"). The tail adds "light text only on dark areas and dark text only on light areas".
- **Toggle.** The `PERSONAL | COMMERCIAL` switch is now "a two-segment toggle with two separate labels", with the active segment and its colours spelled out and "no divider character". In v3 the commercial frames only said "the switch with COMMERCIAL active", which left the labels to chance.
- **Wordmark.** The wordmark is described as "one word: "EVERYWRAP"" to prevent "EVERY WRAP".
- **Extra negatives in the tail.** Robot, mascot and avatar; page titles; phone status bar; laptop or monitor frame. The tail also forbids any text not in the list, and v4 prompts never contain the concept names.

## Glyph substitutions (meaning unchanged)
| v3 | v4 | Why |
|---|---|---|
| `Tell me your car…` / `…fleet…` (single ellipsis glyph) | `Tell me your car...` (three periods) | The single glyph often renders as a smudge or drops out. The build can still use the real glyph. |
| `‹  01 Wrap  ›`, `‹  SATIN BLACK  ›` | "a small left-chevron arrow icon, the label "01 Wrap", a small right-chevron arrow icon" | The arrows are drawn as icons, not typed as characters, so they cannot be misspelled. |
| `PERSONAL \| COMMERCIAL` | Two separate labels in a two-segment toggle | Stops a literal pipe or "I" between the words. |
| `01 / 05` in small monospaced type | Kept, with "thin but clearly legible monospaced type" | It is short enough to keep. Watch it anyway. |

## Per frame

### 1-one-light D-personal
- The seam halves now name their sides (right/nose satin black, left/tail gloss white) and the seam continues over the roof. v3's "roof included" was ambiguous.
- The rail now says "01 Wrap" is bright and "the other four are dim". In v3, "(dim)" sat after '05 Fleet' only.
- The finish dots moved to OTHER UI (no text) so the model does not invent labels for them.
- Gloss white is stated as "clearly white even though the reference car is dark".

### 1-one-light M-personal
- Added a LAYOUT block of vertical bands (car at 20 to 66 percent of the height, input and button at 87 to 98 percent).
- The stepper arrows are now icons.
- The same seam side labels as on desktop.

### 1-one-light D-commercial
- Added the no-sports-car line, the photo lettering rule (no letters, numbers, phone numbers, logos, plates or people) and "(not larger)" on the panel size.
- The toggle labels are explicit, with COMMERCIAL filled navy. The rail colours are explicit.

### 2-finish-library D-personal
- Added "light background, not the dark backdrop of the references", since this is the frame most likely to inherit the references' black backdrop.
- Added "both words stay readable" for the tone-on-tone letters.
- The sample card labels are now one ordered left-to-right list.

### 2-finish-library M-personal
- Added a LAYOUT block.
- The carousel cards had no labels in v3, which invites garbled text. They are now "Satin Black" (lifted) and "Gloss Black", plus a third card cut off by the right edge with its label hidden. These are the same finish names as the desktop frame, with no new copy.

### 2-finish-library D-commercial
- Added the no-sports-car line and the photo rule. The job-photo thumbnails also follow the no-lettering rule.
- The prints "overlap only the lower part of the letters" so YOUR FLEET stays readable.
- The toggle labels are explicit.

### 3-light-tunnel D-personal
- v3 placed the stepper "beside the car", with no side given. v4 puts it "on its right", the only free area, since the headline is upper left.
- The arrows are icons. The two bottom rows are numbered in order.

### 3-light-tunnel M-personal
- Added a LAYOUT block. The v3 wording, with the car low in the lower half and four UI rows below it, would have caused overlaps. The bands keep the car centre in the lower half (42 to 72 percent).
- The arrows are icons.

### 3-light-tunnel D-commercial
- Added the no-sports-car line and the photo rule.
- The toggle labels are explicit, and the button text colour is explicit (white on red).

## Most likely to still fail, and what to check
1. **1-one-light D-personal and M-personal (half white car).** The model may keep the whole car dark, make the white half grey, put the white on the nose side, or draw a curled film edge. Check that the white is on the tail side and that the seam is straight and flat. Fix: pass `ref/car-q-white.png` (the same model already rendered white) as a third reference for these two frames, with a note that the rear half takes the paint of reference 3.
2. **2-finish-library M-personal.** It is the densest phone frame: giant letters behind the car, a card carousel, a service row and two controls. Check that SATIN and BLACK are spelled correctly and not hidden by the car, that the card labels are not garbled, and that the frame is a true portrait stack.
3. **3-light-tunnel D-commercial (and all commercial frames).** The billboard and panel photos may grow invented lettering, phone numbers or fake brand names, and the streaking may turn into heavy blur. Light Tunnel is the worst case because its billboards are large and in perspective. Check every vehicle photo for readable text, check that no sports car appears, and check that the nearest billboard stays at about a third of the frame height.

Also watch: `01 / 05` in small monospaced type (Light Tunnel), and the bone-white toggle segment against black (One Light).

## Not fixable by wording alone
- **The references are attached to the commercial frames.** v4's wording counters this, but the cleanest fix is a setup change: generate the three D-commercial frames with no reference images.
- **Gloss white on a dark reference.** Wording helps. The white render reference above is the reliable fix.
- **Readable lettering on wrapped vehicles.** Real wraps are mostly lettering, so some leakage is likely. If it happens, it is cheaper to blur the panel or swap in the real job photo in the mockup than to regenerate.
- **The ellipsis.** The mockup will show three periods. The build should use the real glyph.
