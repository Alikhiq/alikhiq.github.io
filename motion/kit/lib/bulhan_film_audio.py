#!/usr/bin/env python3
# bulhan_film_audio.py VOICE.mp3 OUT.wav -> 90 s mix: narration (starts at 3 s) over a quiet synthesised drone, soft whooshes into each live-action shot.
import sys, os, subprocess, numpy as np
SR = 48000; DUR = 90; HERE = os.path.dirname(os.path.abspath(__file__)); SND = os.path.join(HERE, '..', 'snd')
CLIPS = [21.4, 34.8, 57.2, 66.6]
def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
t = np.arange(DUR * SR) / SR; rng = np.random.default_rng(11); L = np.zeros_like(t); R = np.zeros_like(t)
for i, (f, g) in enumerate([(73.42, .30), (110.0, .22), (146.83, .20), (174.61, .11), (220.0, .09), (293.66, .05), (440.0, .02)]):
    sw = 0.55 + 0.45 * np.sin(2 * np.pi * t / (13 + 4 * i) + rng.uniform(0, 6))
    for det, ch in ((-0.2, L), (0.2, R)): ch += g * sw * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6))
bed = np.stack([L, R], 1).astype(np.float32) * 0.17
vo = load(sys.argv[1]); vo *= 0.9 / max(1e-6, np.abs(vo).max())
x = np.zeros((DUR * SR, 2), np.float32); a = 3 * SR; n = min(len(vo), len(x) - a); x[a:a + n] += vo[:n]
env = np.zeros(DUR * SR, np.float32); env[a:a + n] = np.abs(vo[:n]).max(1)
w = int(0.6 * SR); env = np.convolve(env, np.ones(w, np.float32) / w, mode='same'); duck = 1 - 0.55 * np.clip(env / 0.08, 0, 1)
x += bed * duck[:, None]
def put(s, at, gain):
    pk = int(np.argmax(np.abs(s).max(1))); a0 = max(0, int(at * SR) - pk); m = min(len(s), len(x) - a0); x[a0:a0 + m] += s[:m] * gain
wh = load(os.path.join(SND, 'whoosh.mp3')); sh = load(os.path.join(SND, 'shimmer.mp3'))
for c in CLIPS: put(wh, c + 0.5, 0.13)
put(sh, 1.5, 0.2); put(sh, 82.5, 0.16)
fade = np.minimum(1, np.minimum(t / 2, (DUR - t) / 3.5)).astype(np.float32); x *= fade[:, None]
x = np.tanh(x * 1.1) / 1.1
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', sys.argv[2]], input=x.tobytes(), check=True)
