#!/usr/bin/env python3
"""Mo Tint "Controlled" v2 sound design: ElevenLabs SFX (eleven_text_to_sound_v3) placed on the picture's events.
Every clip is peak-normalised, then placed with a gain (dB), optional trim/fades, and hits are aligned on their
loudest transient ('peak' anchor). Output: 48 kHz stereo WAV, loudness-normalised later with ffmpeg loudnorm.
usage: mix_mtk_v2.py <sfx_dir> <out.wav>"""
import subprocess, sys
import numpy as np

SR, DUR = 48000, 42.0
SFX, OUT = sys.argv[1], sys.argv[2]

def load(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{SFX}/{name}.mp3', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    pk = np.abs(a).max() or 1.0
    return a / pk * 0.89  # -1 dBFS

CACHE = {}
def clip(name):
    if name not in CACHE: CACHE[name] = load(name)
    return CACHE[name]

bus = np.zeros((int(SR * DUR) + SR, 2), dtype=np.float32)

def place(name, t, db=0.0, anchor='start', trim=None, fin=0.0, fout=0.0, start=0.0, rate=None):
    a = clip(name)
    if start: a = a[int(start * SR):]
    if trim: a = a[:int(trim * SR)]
    a = a.copy()
    if fin: n = min(len(a), int(fin * SR)); a[:n] *= np.linspace(0, 1, n)[:, None]
    if fout: n = min(len(a), int(fout * SR)); a[-n:] *= np.linspace(1, 0, n)[:, None]
    off = 0
    if anchor == 'peak': off = int(np.argmax(np.abs(a).sum(axis=1)))
    i0 = int(t * SR) - off
    if i0 < 0: a = a[-i0:]; i0 = 0
    i1 = min(len(bus), i0 + len(a))
    bus[i0:i1] += a[:i1 - i0] * (10 ** (db / 20))

# ---- bed: low drone under the whole piece (intro swell, dark acts, end)
place('drone_2', 0.0, -13, trim=6.2, fin=0.8, fout=1.2)
place('drone_1', 5.2, -19, trim=15.0, fin=1.2, fout=2.5)
place('drone_2', 18.5, -20, trim=16.0, fin=2.0, fout=2.5)
place('drone_1', 33.5, -19, trim=8.5, fin=0.8, fout=2.0)
# ---- 0-5.6 intro: chrome glint down the bolt, glass hum on the obsidian, riser -> impact on the reveal, wipe
place('chrome_1', 0.15, -5, fout=0.6)
place('glass_1', 1.45, -11, trim=1.7, fin=0.15, fout=0.5)
place('riser_1', 2.95, -5)
place('impact_2', 4.42, -3, anchor='peak', fout=1.5)
place('whoosh_2', 4.80, -4)
place('shimmer_2', 5.30, -11, trim=2.2, fout=0.8)
# ---- tint story
place('chime_1', 7.00, -10, fout=1.0)                 # LIGHT: bloom sparkle
place('shimmer_1', 6.95, -12, trim=1.6, fout=0.6)
place('sizzle_2', 8.45, -5, fin=0.05, fout=0.6)        # HEAT
place('car_1', 10.45, -6, anchor='peak', fout=0.8)     # GLARE: headlights pass
place('film_2', 11.40, -6, trim=2.8, fin=0.1, fout=0.5)  # film draws down
for k in range(7): place('tick_1', 11.75 + k * 0.33, -17)  # VLT readout steps
place('impact_1', 14.05, -15, anchor='peak', fout=1.2)    # PRIVACY: dark thud
place('whoosh_1', 14.50, -15)                          # tint bar sweep
place('lock_2', 15.72, -4, anchor='peak')               # CONTROLLED: snap
place('tick_2', 16.28, -14)                            # gold rule lands
place('sizzle_1', 17.35, -12, fin=0.2, fout=0.8)        # heat streaks return
place('whoosh_2', 18.40, -10)                          # OUT. flies in
place('slam_2', 18.63, -2, anchor='peak')               # OUT. hits the wall
place('breeze_1', 20.90, -9, trim=4.8, fin=0.8, fout=1.2)  # YOU STAY COOL: AC breeze
place('chime_2', 22.40, -6, fout=1.2)                   # COOL. sparkle
for i in range(5): place('tick_2', 25.80 + i * 0.12, -11)  # swatches land
place('whoosh_1', 26.55, -13)                          # ANY SHADE.
place('slam_2', 27.70, -3, anchor='peak')               # SAME PRICE.
place('slot_1', 30.55, -6, fout=0.4)                    # $299 odometer
# ---- ending: OPEN FOR BOOKINGS map -> BOOK NOW end card
place('whoosh_1', 33.68, -10)                          # iris into the map
place('pin_1', 34.58, -3, anchor='peak')                # pin lands on the shop
place('slam_2', 34.55, -9, anchor='peak')               # BOOKINGS. lands
place('pull_1', 34.60, -7, fin=0.2, fout=0.8)           # camera pulls back over the neighbourhood
for tt in (34.72, 35.02, 35.12, 35.62, 36.12): place('tick_1', tt, -16)  # landmark tags
place('whoosh_2', 37.35, -4)                           # wipe to the end card
place('chrome_1', 37.95, -8, fout=0.8)                  # light sweep across the paper set
place('slam_2', 38.55, -3, anchor='peak')               # BOOK NOW.
place('slot_2', 39.05, -6, trim=1.4, fout=0.3)          # phone digits roll
place('whoosh_1', 40.00, -17)                          # underline traces
place('typing_1', 40.20, -11, trim=1.3, fout=0.2)       # URL typed
place('chime_1', 41.25, -14, fout=0.6)                  # button

mix = bus[:int(SR * DUR)]
fade = int(0.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
pk = np.abs(mix).max(); mix = mix / pk * 0.89 if pk > 0.89 else mix
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', OUT], input=pcm, check=True)
print('wrote', OUT, f'{DUR}s', 'peak', round(float(pk), 3))
