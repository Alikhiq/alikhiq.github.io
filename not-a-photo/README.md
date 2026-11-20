# Not a Photo

A walk down a dark neon hall past eight pictures of one person. None of them is a photo. Each is
thousands of blobs of colour that were fitted to a photo by gradient descent, starting from noise.

Every picture stands in its own gate of blue neon. From the far end of the hall it is still the
noise it started as, a cloud of coloured blobs. As you walk towards it, it replays its own training:
the cloud settles into a rough shape, then a likeness, then the finished picture just as you arrive.
Keep walking and the blobs part around you as you pass through.

Open `index.html` through any web server (GitHub Pages serves it as is). Plain HTML, CSS and
JavaScript with WebGL 2, no libraries, no build step.

## Moving

| | |
| --- | --- |
| Scroll, or swipe up | walk forward (back down to go back) |
| Space, or the ▶ button | start or stop the walk on its own |
| Drag | look around |
| Arrow keys / WASD | walk and turn |
| 1 to 8 | jump to a picture |
| H | hide everything but the picture |
| F | full screen |
| Q | render size: AUTO, 4K, 8K |
| C, or the camera button | save a still at 4K (8K when 8K is on) |
| M | sound |

The walk starts by itself if you don't touch anything.

## Resolution

Nothing in the hall is an image, so nothing gets blurry when it is drawn bigger: every pixel is worked
out from the blobs at the size it is drawn. **AUTO** draws at your screen's own pixel count, up to
3840 pixels across, and steps down if your graphics card cannot keep up. **4K** and **8K** draw at
exactly that size whatever the screen is. The still button draws one frame at 3840×2160 (or 7680×4320
with 8K on) and hands it over as a PNG. 8K needs a graphics card that allows 8192-pixel textures; most
desktop cards do.

## How a picture is drawn

Each blob is thirteen bytes: where it sits, how wide and tall it is, which way it is turned, its
colour, how much it counts, and how far it is from the camera. A pixel's colour is the weighted average
of every blob that reaches it:

```
colour(pixel) = Σ wᵢ · kᵢ(pixel) · colourᵢ  /  Σ wᵢ · kᵢ(pixel)        kᵢ = a soft-edged ellipse
```

In the hall each blob lies in its picture's plane, pushed forward or back by its depth, so a picture
has real relief and parallax as you move. `js/render.js` adds every blob of a picture into a
floating-point buffer, then a second pass divides the totals out and lays the result over the scene.
The floor shows each picture's reflection and a pool of its own colour.

## How the blobs learned

The blobs were not placed by hand. They were fitted by gradient descent, the same loop that trains a
neural network, pointed at a few thousand ellipses instead:

1. Start from noise: random positions, random sizes, random colours.
2. Draw the blobs. Compare the result with the photo, pixel by pixel.
3. Work out, for every number in every blob, which way to nudge it to make the picture less wrong, and nudge it.
4. Repeat. Every few hundred steps, drop new, smaller blobs where the picture is still worst.

The stages a picture moves through as you approach are saved snapshots of that one training run. The
step, loss and blob counts shown in the corner are its real numbers at each stage; between stages the
page interpolates.

| # | Picture | Fitted at | Blobs at each stage | Steps | Match to photo |
| --- | --- | --- | --- | --- | --- |
| 1 | The Table | 720×960 | 1,500 → 5,000 → 14,000 → 40,000 | 2,600 | 36.2 dB |
| 2 | Coffee Run | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 45.7 dB |
| 3 | LAN Night | 600×880 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 43.9 dB |
| 4 | Home Table | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 45.3 dB |
| 5 | Red Shades | 600×744 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 36.8 dB |
| 6 | Leopard Print | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 37.4 dB |
| 7 | White Ghutra | 600×784 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 42.6 dB |
| 8 | The Lake | 600×800 | 1,500 → 5,000 → 14,000 → 40,000 | 2,600 | 45.8 dB |

188,000 blobs in their final stages, 3.7 MB of data in total. "Match to photo" is PSNR
against the photo at the fitted size (for the six portraits, against the person cut out of the
background), after the blobs were squeezed into 13 bytes each. Above 40 dB the two are hard to tell
apart side by side; the lower scores are the pictures with the most fine texture (stubble, denim,
leopard print, the air hockey cabinet).

## What is where

| | |
| --- | --- |
| `index.html`, `style.css` | The page |
| `js/data.js` | Reads the blob files |
| `js/render.js` | Draws the hall, the pictures, the neon, the glow (WebGL 2) |
| `js/world.js` | Where everything stands, the path, and how far along its training each picture is |
| `js/app.js` | Loading, moving, render size, stills, sound |
| `data/` | The blobs: one `.bin` per picture and a `manifest.json` describing them |
| `tools/` | The training pipeline that produced `data/` |

There are no image files here, and the photos the blobs were fitted to are not in this repository.

## Training a new picture

The pipeline is in `tools/`. It needs Python 3 with PyTorch, a C++ compiler, and (for cutting a person
out of the background and estimating depth) `rembg` and `transformers`.

```sh
pip install -r tools/requirements.txt
sh tools/build.sh                              # compiles the blob rasteriser (tools/libsplat.so)
mkdir -p work/photos && cp me.jpg work/photos/coffee.jpg
# describe the crop and where the face is in tools/looks.py, then:
python tools/prep.py   work coffee             # 1. cut-out and depth
python tools/fit.py    work coffee             # 2. gradient descent, a few minutes on a laptop CPU
python tools/export.py work data coffee        # 3. pack into data/coffee.bin and update the manifest
```

`tools/splat.cpp` is what makes training quick enough without a graphics card: it draws the blobs and
also computes, by hand-derived calculus, how the error changes with every blob parameter
(`tools/gradcheck.py` checks that calculus against finite differences). `tools/build_single.py` packs
the whole walkthrough into one HTML file, for sending to someone.
