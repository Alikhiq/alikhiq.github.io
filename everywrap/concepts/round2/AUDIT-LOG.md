# Audit log: three loops before generating

Each loop was run by a separate reviewer that had not seen the earlier drafts being written. Full reviewer notes: `audit-1.md`, `audit-2.md`, `audit-3.md`.

## Loop 1: art direction and brief fit (v1 to v2)
Scores on v1: One Light 6.5, Finish Library 7.5, Light Tunnel 6.

Applied:
- All: plain black tyre sidewalls (the model's tyres carry "KHRONOS" lettering).
- All: the three commercial themes were the same white, cobalt and orange. Now One Light is concrete grey, navy and safety yellow; Finish Library is cool white and cobalt; Light Tunnel is white, navy and red.
- All: subline changed to "Any car, wrapped by hand in Columbus, Ohio." so the concept supercar does not read as "exotics only". The "Tell me your car…" input moved next to the car.
- All: "Nardo Grey" renamed "Satin Grey".
- One Light: phone gained a service stepper; the car now fills the phone screen; input stacked over a full-width button; the seam is now the transition between services; commercial headline is "Your van is a billboard."
- Finish Library: the giant letters are now tone-on-tone warm grey so the satin black car stays readable in front of them; phone service row moved to the top; the "drag onto the car" hint removed; commercial cards are job thumbnails; square-cornered buttons.
- Light Tunnel: gained a finish stepper; each service now changes how the lights behave; accent changed from amber to taillight red so it no longer overlaps One Light; headline "GO SATIN BLACK."; phone camera is a low three-quarter view.

Not applied:
- Replacing the colour-shift finish with gloss white in One Light. Colour-shift wraps are real EveryWrap jobs and the five finishes should match across concepts.

Needs the owner's sign-off:
- The commercial input reads "Tell me your fleet…" instead of the shared "Tell me your car…".

## Loop 2: buildability (v2 to v3)
The reviewer inspected the real car model and the kit, then marked every element as straightforward, doable with a named technique, or not deliverable.

Applied:
- Vinyl seam: no "lifted film edge" (there is no cloth simulation). It is now a straight flat cut with a thin glowing line, which matches the tested shader.
- Phone framing: the car is about 4.4 m long and 1.3 m tall, so it cannot fill a portrait screen top to bottom. It now spans the full width at 40 to 50 percent of the height (a third in Light Tunnel), with text above and below. This overrides loop 1's "car fills the phone screen".
- Reflections: floor reflections are faint and fade out; on satin paint the tunnel lights show as broad soft bands, not crisp lines. The car is never motion-blurred.
- Sample cards in Finish Library are flat swatch cards (built in HTML), not thick curling film.
- Job photos are only 480 to 960 px, so every photo panel is capped at about a third of the frame height.
- Commercial labels now match the real photos on file: vans, buses, food trucks, boats. There is no box-truck or signage photo.
- "Kitted" removed from the One Light signature: the model has no body-kit geometry. Body kits can only be shown as carbon trim on this car.

Build notes carried forward (not prompt changes): both paint materials must be patched for light colours; drop the flake normal map on gloss finishes; blank the tyre sidewall texture and the licence plate, which carry Khronos logos.

Confidence that each can be built: One Light medium-high, Finish Library high, Light Tunnel medium (moving reflections on phones are the risk).

## Loop 3: prompt wording (v3 to v4)
Lens: will the image model draw exactly what each prompt says, first try? Copy, layout and direction were not changed.

Applied:
- Every prompt restructured in the same order: format, scene, car, layout bands (phone frames), a numbered list of the exact on-screen text, other UI, palette.
- Phone frames now state the layout as vertical bands in percent of screen height, to force a true portrait page.
- Risky characters replaced: the ellipsis is three periods, the stepper arrows are described as chevron icons, the Personal/Commercial switch is a two-segment toggle with no divider character.
- The car block says to copy only the body shape from the reference renders, not their floor, backdrop, tyre lettering or plate.
- Bug fixed: the shared ending told every frame to include the reference car, which would have put the supercar into the commercial frames. Commercial frames now say it does not appear.
- Global exclusions in one place: browser window, device frame, status bar, extra words, concept names, logos, watermark, people, robot avatars.

Generation settings from this loop: commercial frames run with no reference images; the two One Light personal frames get the white render of the car as a third reference.

Flagged as most likely to still fail: the half-white car in One Light, the busy Finish Library phone frame, and invented lettering on vehicles in the commercial photo panels.

## Result check after generating
All nine frames rendered on the first attempt with every on-screen string spelled correctly, no browser frame, no stray titles and no invented lettering on vehicles.

Known deviations from the prompts, left as they are:
- One Light commercial and Light Tunnel commercial: the nearest photo panel is larger than the one-third cap. The real job photos are too small for that, so the build will show them smaller.
- Finish Library desktop: the car covers most of the word "BLACK". The build should keep the car smaller or raise the letters.
- Light Tunnel commercial: the arches came out round; the personal frames use rectangular arches.
- Vehicle photos in all commercial frames are placeholders. The build uses EveryWrap's real job photos.
