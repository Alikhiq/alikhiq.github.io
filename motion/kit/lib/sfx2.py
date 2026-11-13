#!/usr/bin/env python3
# sfx2.py EVENTS.json OUT_FULL.wav OUT_SFX.wav [music.mp3] [music_gain_db]
# Motion-synced sound design for rcx.html videos: whoosh on every cut (peak on the cut), riser ending on each price hit,
# bass impact on each hit, soft pops on list items, glitch into the end card and a shimmer on the logo.
# Writes a music + SFX mix and an SFX-only mix (for posting with a trending song added in Instagram).
# Sounds: ElevenLabs sound effects and music generated for Round City (work/snd/).
import sys, os, json, subprocess
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
SND = os.path.join(HERE, '..', 'snd')  

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def trim_lead(x, thr=0.02):
    env = np.abs(x).max(axis=1); idx = np.argmax(env > thr) if (env > thr).any() else 0
    return x[max(0, idx - int(0.004 * SR)):]

def peak_at(x):  # seconds from start to the loudest 20 ms window
    env = np.abs(x).max(axis=1); w = int(0.02 * SR)
    sm = np.convolve(env, np.ones(w) / w, mode='same'); return int(np.argmax(sm))

def place(buf, clip, start_sample, gain):
    if start_sample < 0: clip = clip[-start_sample:]; start_sample = 0
    end = min(len(buf), start_sample + len(clip))
    if end > start_sample: buf[start_sample:end] += clip[:end - start_sample] * gain

ev = json.load(open(sys.argv[1])); out_full, out_sfx = sys.argv[2], sys.argv[3]
music = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != '-' else None
mgain = 10 ** (float(sys.argv[5]) / 20) if len(sys.argv) > 5 else 10 ** (-6 / 20)
N = int(ev['dur'] * SR) + 1
sfx = np.zeros((N, 2), np.float32)
S = {k: load(os.path.join(SND, k + '.mp3')) for k in ['whoosh', 'riser', 'impact', 'pop', 'shimmer', 'glitch']}
S['pop'] = trim_lead(S['pop']); S['impact'] = trim_lead(S['impact'])
wp = peak_at(S['whoosh'])
for c in ev['cuts']:
    if abs(c - ev['end']) < 1e-3:
        place(sfx, S['glitch'], int(c * SR) - peak_at(S['glitch']), 0.55)
    else:
        place(sfx, S['whoosh'], int(c * SR) - wp, 0.8)
for r in ev.get('risers', []):
    place(sfx, S['riser'], int(r * SR) - len(S['riser']), 0.32)
for h in ev.get('hits', []):
    place(sfx, S['impact'], int(h * SR), 0.9)
for p in ev.get('pops', []):
    place(sfx, S['pop'], int(p * SR), 0.6)
place(sfx, S['shimmer'], int((ev['end'] + 0.9) * SR), 0.7)
place(sfx, S['impact'], int((ev['end'] + 1.6) * SR), 0.45)

def finish(x, path):
    pk = np.abs(x).max()
    if pk > 0.89: x = x * (0.89 / pk)
    fo = int(0.6 * SR); x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', path], input=x.astype(np.float32).tobytes(), check=True)

finish(sfx.copy(), out_sfx)
mix = sfx.copy()
if music:
    m = load(music)
    while len(m) < N: m = np.concatenate([m, m])
    m = m[:N].copy(); fi = int(0.25 * SR); m[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(1.5 * SR); m[-fo:] *= np.linspace(1, 0.15, fo)[:, None]
    # duck the music under each impact
    duck = np.ones(N, np.float32)
    for h in ev.get('hits', []) + [ev['end'] + 1.6]:
        a = int(h * SR); b = min(N, a + int(0.5 * SR))
        if a < N: duck[a:b] = np.minimum(duck[a:b], np.linspace(0.45, 1, b - a))
    mix = mix * 0.85 + m * mgain * duck[:, None]
finish(mix, out_full)
print('mixed', os.path.basename(out_full), round(ev['dur'], 2))
