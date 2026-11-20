#!/usr/bin/env python3
# bulhan_audio.py OUT.wav  -> 300 s ambient bed (synthesised drone in D) + kit whoosh on each chapter cut + shimmer on the title.
import sys, os, subprocess, numpy as np
SR = 48000; DUR = 300; HERE = os.path.dirname(os.path.abspath(__file__)); SND = os.path.join(HERE, '..', 'snd')
CUTS = [18, 46, 80, 114, 146, 176, 210, 236, 256, 284]
def load(n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SND, n), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
t = np.arange(DUR * SR) / SR; rng = np.random.default_rng(7)
L = np.zeros_like(t); R = np.zeros_like(t)
# D minor-ish drone: D2 A2 D3 F3 A3 with slow, independent swells
for i, (f, g) in enumerate([(73.42, .30), (110.0, .22), (146.83, .20), (174.61, .10), (220.0, .09), (293.66, .05)]):
    sw = 0.55 + 0.45 * np.sin(2 * np.pi * t / (17 + 5 * i) + rng.uniform(0, 6))
    for det, ch in ((-0.18, L), (0.18, R)):
        ch += g * sw * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6))
x = np.stack([L, R], 1).astype(np.float32) * 0.16
fade = np.minimum(1, np.minimum(t / 3, (DUR - t) / 4)).astype(np.float32); x *= fade[:, None]
def put(s, at, gain):
    pk = int(np.argmax(np.abs(s).max(1))); a = max(0, int(at * SR) - pk); n = min(len(s), len(x) - a); x[a:a + n] += s[:n] * gain
wh = load('whoosh.mp3'); sh = load('shimmer.mp3')
for c in CUTS: put(wh, c, 0.22)
put(sh, 2.0, 0.25); put(sh, 293.0, 0.2)
x = np.tanh(x * 1.2) / 1.2
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', sys.argv[1]], input=x.tobytes(), check=True)
