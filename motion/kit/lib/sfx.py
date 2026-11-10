#!/usr/bin/env python3
# sfx.py OUT.wav TOTAL_DUR "t1,t2,..."  -> builds a light, original SFX bed:
#   a very quiet warm drone for the whole duration + a soft filtered-noise whoosh on each hit time,
#   with a gentle shimmer on the first and last hit. No copyrighted audio. Deterministic.
import sys, subprocess, os, tempfile
out, dur = sys.argv[1], float(sys.argv[2])
hits = [float(x) for x in sys.argv[3].split(',') if x.strip() != ''] if len(sys.argv) > 3 else []
tmp = tempfile.mkdtemp()
def run(args): subprocess.check_call(['ffmpeg', '-v', 'error', '-y'] + args)

# warm drone: two low sines + slow tremolo, very quiet
drone = os.path.join(tmp, 'drone.wav')
run(['-f', 'lavfi', '-i', 'sine=f=98:d=%.3f' % dur, '-f', 'lavfi', '-i', 'sine=f=147:d=%.3f' % dur,
     '-filter_complex', '[0][1]amix=inputs=2,tremolo=f=0.18:d=0.5,lowpass=f=320,volume=0.05[a]', '-map', '[a]', drone])

# one whoosh (pink noise swish, band-limited, fast in / slow out)
whoosh = os.path.join(tmp, 'whoosh.wav')
run(['-f', 'lavfi', '-i', 'anoisesrc=d=0.7:c=pink:a=0.6',
     '-af', 'highpass=f=350,lowpass=f=3800,afade=t=in:d=0.06,afade=t=out:st=0.14:d=0.56,volume=0.32', whoosh])
# one shimmer (airy high sines, quick decay)
shimmer = os.path.join(tmp, 'shimmer.wav')
run(['-f', 'lavfi', '-i', 'sine=f=2100:d=0.9', '-f', 'lavfi', '-i', 'sine=f=3150:d=0.9', '-f', 'lavfi', '-i', 'sine=f=4200:d=0.9',
     '-filter_complex', '[0][1][2]amix=inputs=3,afade=t=in:d=0.02,afade=t=out:st=0.1:d=0.8,volume=0.14[a]', '-map', '[a]', shimmer])

# place drone + a whoosh at each hit, shimmer on first+last
inputs = ['-i', drone]
parts = ['[0:a]']
idx = 1
for i, t in enumerate(hits):
    inputs += ['-i', whoosh]
    parts.append('[%d:a]adelay=%d|%d[w%d]' % (idx, int(t * 1000), int(t * 1000), i))
    idx += 1
for i, t in enumerate(hits):
    if i == 0 or i == len(hits) - 1:
        inputs += ['-i', shimmer]
        parts.append('[%d:a]adelay=%d|%d[s%d]' % (idx, int(t * 1000), int(t * 1000), i))
        idx += 1
labels = ['[0:a]'] + ['[w%d]' % i for i in range(len(hits))] + ['[s%d]' % i for i in (([0, len(hits) - 1]) if len(hits) > 1 else ([0] if hits else []))]
fc = ';'.join(parts[1:]) + (';' if parts[1:] else '') + ''.join(labels) + 'amix=inputs=%d:normalize=0,alimiter=limit=0.9,aformat=sample_rates=48000:channel_layouts=stereo[mix]' % len(labels)
run(inputs + ['-filter_complex', fc, '-map', '[mix]', '-t', '%.3f' % dur, out])
print('sfx:', out, dur, 's,', len(hits), 'hits')
