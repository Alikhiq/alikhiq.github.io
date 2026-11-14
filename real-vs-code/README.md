# Real vs Code

Air hockey against a version of you that is made of code.

Your opponent starts each round as a slab of coloured noise. Every goal you score trains it: the noise
pulls itself into a rough shape, then a likeness, then, at match point, something close to a photograph.
The sharper it gets, the better it plays. Beat all six looks and you have trained every one of them.

Open `index.html` through any web server (GitHub Pages serves it as is). There is nothing to install and
nothing to build. It is plain HTML, CSS and JavaScript, with no libraries.

## There is no photo in here

Nothing in this folder is an image file. Each look is a list of blobs, and a blob is thirteen bytes:
where it sits, how wide and tall it is, which way it is turned, its colour, how much it counts, and how
far it is from the camera. The picture on screen is what you get when a few thousand of them overlap:

```
colour(pixel) = Σ wᵢ · kᵢ(pixel) · colourᵢ  /  Σ wᵢ · kᵢ(pixel)        kᵢ = a soft-edged ellipse
```

Every blob votes for its own colour, most strongly at its centre, and each pixel takes the weighted
average. `js/blobs.js` draws that with WebGL: all the blobs are added into a floating-point buffer, then a
second pass divides the totals out. Because the picture is recomputed from the blobs every frame, the
game can do things a photo cannot: slide every blob from one training stage to the next, throw them
apart when you score, and shift them by depth so the head turns to follow the puck.

## How the blobs learned

The blobs were not placed by hand. They were fitted by gradient descent, the same loop that trains a
neural network, pointed at a few thousand ellipses instead:

1. Start from noise: random positions, random sizes, random colours.
2. Draw the blobs. Compare the result with the photo, pixel by pixel.
3. Work out, for every number in every blob, which way to nudge it to make the picture less wrong, and nudge it.
4. Repeat. Every few hundred steps, drop new, smaller blobs where the picture is still worst.

The stages you play through are saved snapshots of that one training run, so when the opponent sharpens
after a goal it is moving between real points on the path it took. The step, loss and blob counts shown
at each stage are the real numbers from the run; between stages the game interpolates.

| Look | Fitted at | Blobs at each stage | Steps | Match to photo | Data |
| --- | --- | --- | --- | --- | --- |
| Coffee Run | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 45.7 dB | 344 KB |
| LAN Night | 600×880 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 43.9 dB | 344 KB |
| Home Table | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 45.3 dB | 344 KB |
| Red Shades | 600×744 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 36.8 dB | 344 KB |
| Leopard Print | 600×800 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 37.4 dB | 344 KB |
| White Ghutra | 600×784 | 80 → 400 → 2,000 → 6,500 → 18,000 | 2,550 | 42.6 dB | 344 KB |
| The Table (title) | 720×960 | 1,500 → 5,000 → 14,000 → 40,000 | 2,600 | 36.2 dB | 787 KB |
| The Lake (ending) | 600×800 | 1,500 → 5,000 → 14,000 → 40,000 | 2,600 | 45.8 dB | 787 KB |

That is 188,000 blobs in their final stages and 3.7 MB of data in total. "Match to photo" is PSNR against
the photo at the fitted size (for the six opponents, against the cut-out person), measured after the blobs
were squeezed into 13 bytes each. Above 40 dB the two are hard to tell apart side by side; the lower
scores are the looks with the most fine texture (stubble, denim, leopard print, the cabinet artwork).

## What is where

| | |
| --- | --- |
| `index.html`, `style.css` | The page and every screen in it |
| `js/blobs.js` | Decodes the blob files and draws them (WebGL 2) |
| `js/table.js` | The room, the table, the puck and mallets, drawn in perspective on a canvas |
| `js/physics.js` | Puck and mallet physics, and the opponent's brain (its skill rises with every goal you score) |
| `js/audio.js` | Every sound, synthesised with Web Audio |
| `js/game.js` | Rounds, scoring, screens, input |
| `data/` | The blobs: one `.bin` per look and a `manifest.json` describing them |
| `tools/` | The training pipeline that produced `data/` |

## Controls

Drag (or move the mouse) to steer your mallet; arrow keys or WASD also work. `P` pauses, `M` mutes.
In The Lab you can scrub any look from noise to finished, drag it to turn it, and tap it to scatter it.

## Training a new look

The pipeline is in `tools/`. It needs Python 3 with PyTorch, a C++ compiler, and (for cutting a person
out of the background and estimating depth) `rembg` and `transformers`. The photos are inputs only and
are not kept in this repository.

```sh
pip install -r tools/requirements.txt
sh tools/build.sh                              # compiles the blob rasteriser (tools/libsplat.so)
mkdir -p work/photos && cp me.jpg work/photos/coffee.jpg
# describe the crop and where the face is in tools/looks.py, then:
python tools/prep.py   work coffee             # 1. cut-out and depth
python tools/fit.py    work coffee             # 2. gradient descent, a few minutes on a laptop CPU
python tools/export.py work data coffee        # 3. pack into data/coffee.bin and update the manifest
```

`tools/splat.cpp` is the part that makes this quick enough to run without a graphics card: it draws the
blobs and also computes, by hand-derived calculus, how the error changes with every blob parameter
(`tools/gradcheck.py` checks that calculus against finite differences).
`tools/build_single.py` packs the whole game into one HTML file if you want to send it to someone.
`tools/ai_battery.js` and `tools/ai_rounds.js` are how the opponent's difficulty was tuned: the first
fires a fixed set of shots at it at each skill level, the second plays whole rounds against scripted
stand-ins for a casual, a decent and a sharp player.
