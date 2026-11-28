# Audit 1 of 3: art direction and brief fit

Reviewer lens: one strong idea, real choice between concepts, client's words, phone first, commercial credibility, copy, relatability. Buildability and prompt wording are out of scope (loops 2 and 3).

Reference check: the supplied car is a low, wide, mid-engine concept coupe. Its tyre sidewalls carry "KHRONOS" lettering and green marks (visible in car-ref-side.png). That is a logo on the car and breaks constraint 2; every frame should show plain black sidewalls.

Phone element limit (brief, constraint 3): 7 elements. They are the wordmark, the switch, one headline, one service selector, one finish selector, one primary button and one assistant input.

---

## Concept 1 · One Light: 6.5 / 10

The single idea (a vinyl seam travelling over the car) is strong and true to the trade: it is what a wrap actually looks like halfway done. The frames around it are the most template-like of the three.

1. **HIGH: there is no service selector on the phone, and the logic of the scroll is unclear.** The desktop has a chapter rail. The phone only has a label, "01 / 05  Wrap", that does nothing. The idea also mixes two scroll meanings: the seam moving nose to tail, and scrolling through five service chapters. The client asked that picking a service changes the scene, so it has to be a visible, tappable choice.
   Change: make the seam *the transition between services*. Each chapter change pulls a seam across the car from the old treatment to the new one: wrap to PPF, PPF to tint, and so on. On the phone, replace the label "01 / 05  Wrap" with a tappable stepper "‹  01 Wrap  ›" (swipe or tap arrows) that sits directly above the finish dots, in thumb reach.
2. **HIGH: the car does not fill the phone screen.** "fills the upper two-thirds of the screen" with the headline "overlapping the bottom" repeats the round-1 layout of a car band on top and UI below.
   Change: replace it with "the car fills the full screen height, cropped at the front wheel and the rear haunch, with the UI floating over the floor reflection in the bottom 35%."
3. **MED: the bottom bar is cramped at 390 px.** An input plus a button side by side gives the button about 120 px, which makes the one main action the smallest thing on screen.
   Change: stack them. The input goes on one line and a full-width "Get my price" button sits under it, the lowest element on the screen.
4. **MED: the finish dots include "iridescent purple-teal".** This is the purple AI-site cue the brief bans, and it fights the black, bone and amber palette.
   Change: replace "gloss black, grey, red, iridescent purple-teal" with "gloss black, satin grey, gloss white, satin red".
5. **MED: the commercial copy is generic.** "Make it work." says nothing about vans. The rail mixes a category ("Fleet") with vehicle types.
   Change: replace "Make it work." with "Your van is a billboard." Replace the rail "01 Fleet / 02 Box trucks / 03 Food trucks / 04 Signs" with "01 Vans / 02 Box trucks / 03 Food trucks / 04 Signs".
6. **LOW: it reads as a generic AI template.** Bone serif on black, a numbered 01–05 chapter rail and an amber tick are the default "luxury" award-site kit. The seam is what makes this concept its own, so give it the most visual weight.
   Change: make the seam's glowing line and its lifted film edge the brightest thing in the frame, brighter than the headline. Halve the size of the rail labels.

Copy: "Satin black. Done right." is fine and plain, and it can be kept. In the subline, change "Vinyl wrap, installed by hand in Columbus, Ohio." to "Any car, wrapped by hand in Columbus, Ohio." This is the relatability fix (see the cross-concept section).

---

## Concept 2 · Finish Library: 7.5 / 10 (strongest)

This concept has the clearest single idea. The finish name is the set: giant "SATIN BLACK" type stands behind the car. A visitor would screenshot it, and it is the only concept where the bestseller is the headline *and* the architecture. The weak points are crowding on the phone and contrast.

1. **HIGH: the satin black car sits in front of black letters.** In the hero state, the bestseller case, the car's silhouette disappears into the type.
   Change: replace "enormous tight condensed black sans-serif capital letters" with "enormous tight condensed capitals in a warm grey two steps darker than the backdrop (tone-on-tone)", so the black car stands out sharply against them. Say that the letters darken only when a light finish is chosen.
2. **HIGH: the phone repeats round 1 (car in a band, a stack of controls below).** Under the car sit, in order: the service word row, the card carousel, the input and the button. That is four bands in the bottom 45% of the screen. It is at the 7-element limit and it is cramped.
   Change: move the service words row ("Wrap PPF Tint Kits Fleet") up to the top, directly under the wordmark and switch line. Services change less often than finishes, so they can live at the top. Keep only the card row, the input and the button at the bottom, and make the car larger.
3. **MED: "drag onto the car" is the wrong gesture for a phone, and the hint is decoration.** Dragging out of a horizontal carousel competes with scrolling the carousel. The handwritten hint reads as a gimmick.
   Change: remove "A small handwritten-style hint beside the lifted card: 'drag onto the car'". The interaction becomes "tap a card: it lifts, flies to the car, and the film wipes across the body". Dragging stays as a desktop extra.
4. **MED: the commercial sample cards do not mean anything.** Cards labelled "Vans", "Box trucks" and so on, each showing "a colour chip and a pattern strip", are not something a fleet manager picks.
   Change: replace "each showing a colour chip and a pattern strip" with "each card a small thumbnail of a real finished job". Tapping a card brings that photo to the front of the stack.
5. **MED: the swatch name "Nardo Grey" is an OEM paint name, and the brief says no brand names.**
   Change: replace "Nardo Grey" with "Satin Grey".
6. **LOW: the pill button runs against the brief's "rounded pills on everything".**
   Change: replace "a solid black pill button" with "a solid black square-cornered button". Also replace "solid cobalt pill" with "solid cobalt square-cornered button".

Copy: "YOUR FLEET" is fine. Consider "YOUR VANS" if the job photos are mostly vans. The personal theme has no line of copy that says where the shop is or what it does. Add one small line under the cards: "Wrapped by hand in Columbus, Ohio." (desktop only).

---

## Concept 3 · Light Tunnel: 6 / 10

This is the closest match to the client's "viral wrap artist" references: motion, light and point of view. The commercial frame ("YOUR BRAND IN MOTION" with billboards streaming past) is the best commercial idea of the three. The personal frame is missing a function and leans on clichés.

1. **HIGH: there is no finish selector.** The frame shows "FINISH 01 / 05" and "SATIN BLACK" as monospaced readouts, but there is nothing to tap. The brief requires one finish or level selector.
   Change: turn the readout into the control. Replace "Small monospaced readouts near the car… 'FINISH 01 / 05' and 'SATIN BLACK'" with "a finish stepper directly above the gear selector: '‹  SATIN BLACK  ›' with a tiny '01 / 05'". On the phone the same stepper sits above the dial, and swiping across the car also changes the finish.
2. **HIGH: changing service does not change the scene.** A "burst of speed" looks the same for every service, so it fails "service picking changes the scene".
   Change: give each gear its own tunnel state, using only effects the kit can render:
   - WRAP: the arches stream past.
   - PPF: one bright arch sweeps slowly to show the gloss.
   - TINT: the arches dim and the glass goes dark.
   - KITS: the camera drops to bumper height.
   - FLEET: the switch to the commercial theme.
3. **HIGH: this palette and layout overlap Concept 1.** Both use black, white and amber, a white "Get my price" bottom right and the input bottom left. Side by side, they read as two crops of one site.
   Change: replace amber with taillight red as the one accent ("'WRAP' (lit amber" becomes "'WRAP' (lit red"), and make the arches cool white. On desktop, centre the CTA cluster under the dial instead of bottom-right.
4. **MED: the personal headline is a cliché.** "SATIN BLACK IN MOTION" describes a parked car, and it takes the line that fits the commercial frame much better.
   Change: replace "'SATIN BLACK' 'IN MOTION'" with "'GO SATIN' 'BLACK.'" Keep "IN MOTION" only for commercial.
5. **MED: the phone camera is head-on, which hides the wrap.** The sides are where film shows. Head-on, the car is a thin slab about 30% of the screen tall, under a two-line headline.
   Change: replace "faces the viewer head-on, low camera, filling the width" with "low front three-quarter, nose toward the bottom-left, filling the width and half the height". Cut the headline to one line on the phone.
6. **LOW: the desktop subline repeats the dial, and the commercial dial labels are confusing.** The subline lists the same five services as the dial. In the commercial dial, "FLEET" overlaps "VANS", and "BOX" and "FOOD" are unclear.
   Change: replace "'Vinyl wrap · PPF · Tint · Body kits · Columbus, Ohio'" with "'Any car, wrapped by hand in Columbus, Ohio.'" Replace "'FLEET' (lit cobalt) 'VANS' 'BOX' 'FOOD' 'SIGNS'" with "'VANS' (lit cobalt) 'BOX TRUCKS' 'FOOD TRUCKS' 'SIGNS'".

Generic-AI risk: italic condensed caps combined with monospaced readouts in the style of a heads-up display read as a gaming or AI template. Fix 1 removes the readouts, which also removes the cue.

---

## Cross-concept

- **The commercial theme is the same in all three.** Each one is a white studio with cobalt, navy and orange and photo panels. Push them apart:
  - Concept 1 commercial: warm concrete grey, navy and safety yellow (workwear).
  - Concept 2 commercial: cool white and cobalt.
  - Concept 3 commercial: white tunnel, red arches and navy.
- **Fleet credibility.** A fleet manager trusts finished real jobs and wants consistency across vehicles, not mood.
  - Every commercial frame should show at least one *sharp* photo panel. Concept 3 already does this with its nearest billboard.
  - Use one plain line, "Vans, box trucks, food trucks. One look across the fleet."
  - Do not show "no readable lettering" placeholders as the final look. The real photos have lettering, and that is the proof.
  - Size the panels so a 960 px photo is never stretched past about 1.2×. On desktop that means panels no wider than about 40% of the frame.
- **Assistant input wording.** All three use "Tell me your fleet…" on the commercial frame, which differs from the fixed "Tell me your car…". It is the better line, but it is a change to constraint 5, so the client has to sign it off.
- **The car is a supercar, not the customer's car.** A Columbus visitor with a CR-V should not feel the site is for someone else. Use the same fix in all three:
  - (a) Never call the hero "your car".
  - (b) Use "Any car" in the subline, as written above.
  - (c) Put the upload input ("Tell me your car…" with the camera icon) visually next to the car, not off in a corner, because it is the bridge from showpiece to *their* car.
  - (d) Per concept: in Concept 2 the lab framing makes the car read as a display model, which handles this best. Concept 1's booth reads as "our booth, any car", which is fine. Concept 3's tunnel is pure fantasy, so its subline matters most.
- **Satin black.** Satin finishes show soft, wide highlights, not mirror streaks. Concepts 1 and 3 should not sell satin with gloss-style reflections, or the photo lies about the product.
- **One action.** All three have exactly one primary button. On the phone it must be the lowest, widest element, which only Concept 2 nearly achieves.
