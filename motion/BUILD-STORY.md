# How susuinkandglow.com was built (facts for "making of" videos)

Built by Round City for Susu Ink & Glow, a solo brow / lip blush / PMU / fine-line tattoo / piercing artist working all around Columbus, Ohio. The build was done with **Claude Code** (Anthropic's agentic coding tool) working autonomously in a cloud session, directed by the Round City owner over chat from their phone: they described what they wanted, sent phone screenshots of problems, and approved choices; Claude Code wrote the code, generated and checked the visuals, tested in a headless browser, opened and merged pull requests, and deployed.

Sequence (all true):
1. **Starting point:** a static preview zip from a Claude chat. Claude Code unpacked it, found the real site's hosting, and rewrote all copy in Susu's own first-person voice ("I'll text you to confirm"), set the Columbus location, and replaced unknown prices with "Get an estimate".
2. **Portrait & imagery:** re-rendered Susu's studio photo into a painted portrait (kie.ai); cropped the body-piercing illustration above the waist.
3. **Footer:** a Fable agent designed a new closing-scene footer with a three.js gold hoop-and-pearl jewel.
4. **Booking:** multi-service selection; booking wired to Susu's existing booking system (Supabase RPC) and verified with a signature check that saved nothing, then one friendly test booking.
5. **Icons:** first 3D gold icons; Tripo3D models (client didn't like them) → four concept sheets (crystal, porcelain, gold wire, blush) → client picked **crystal & gold**, cut straight from the approved sheet.
6. **Going live:** found the domain in the client's Vercel account, created a Vercel project from the GitHub repo, kept Susu's private Studio-access owner app working at `/owner` and the QR link at `/q`, switched DNS, verified live.
7. **3D logo intro:** an Opus agent extruded the real SUSU logo SVG in three.js: crystal faces, gold bevels, glints, light sweep, gold dust, flying into the nav logo.
8. **Typography:** a 3D crystal headline was rejected on the client's phone; a Tripo3D headline model came back warped and was not used; three full type systems were shown on the real pages; client chose **Playfair Display + DM Sans**; then every supporting text style was tuned.
9. **Phone polish:** fixed scroll stutter (smooth-scroll off on touch, story no longer resizes when Safari's address bar moves) and text sliding under the Book bar on iPhone (the text now measures where the Book bar really is).
10. **Ads:** three vertical ads rendered frame-by-frame from the site's own code (3D logo, blinking portrait, crystal icons, real client work).

Numbers: 9 merged pull requests on the site; every change tested in Chromium at phone and desktop sizes before going live.

Do not invent other facts (no reviews, client counts, timelines in hours, awards).
