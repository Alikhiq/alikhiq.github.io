# EveryWrap hero preview

A working preview of the new everywrap.com hero. Open `index.html` from a web server (it loads images from `img/`).

## What works
- **Launch intro** (about 3 seconds): fast cuts of real EveryWrap jobs, then the hero. Tap to skip. Plays once per browser session; "Replay the intro" is in the footer.
- **Personal / Commercial switch**: a diagonal wipe between the dark personal theme and the light commercial theme. Type, colors, buttons, gallery and assistant copy all change with it.
- **Vinyl wrap**: five finishes on the showroom car, plus a Before / after view where you drag the seam to wrap the car in the chosen finish.
- **PPF**: partial front, full front and full body coverage highlighted on the car.
- **Window tint**: 70, 35, 20 and 5 percent, shown on the glass.
- **Body kits**: drag to compare the stock car with a kit.
- **Commercial**: whole fleet, vans, box trucks and food trucks, each with its own camera move.
- **Get my price**: a three-step form (car, service, contact).
- **Upload my car**: photo and finish picker that hands off to the price form.
- **Assistant bar**: reads plain requests such as "2021 Charger satin black wrap price", switches the scene and pre-fills the price form.

## What is not real yet
- Nothing is sent anywhere. The price form ends on a summary that says so.
- The assistant is scripted rules in the page, not a language model.
- The uploaded photo is not re-rendered in the chosen finish. That needs an image model behind a server endpoint.
- No prices are shown. Pricing has not been supplied.
- The hero scenes are generated visualizer renders and are labelled as such on the page. The gallery photos are real EveryWrap work from the Instagram archive.

## Files
- `index.html`: the whole page (markup, styles, script).
- `img/plates/`: hero scenes and the PPF coverage masks.
- `img/work/`: real job photos used by the intro and the gallery.
- `concepts/`: the four approved hero concepts and their prompts.
