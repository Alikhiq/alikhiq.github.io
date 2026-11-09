# beatnotes.py BPM OFFSET -> prints the Markdown beat sheet for the "Beauty" edit
import sys
bpm, off = float(sys.argv[1]), float(sys.argv[2]); b = 60 / bpm; B = lambda n: off + n * b
ev = {0: 'first downbeat (black; logo begins assembling)', 4: 'light sweep across the logo', 6: '3D logo glint',
      8: 'CUT: site hero on the phone; portrait starts drawing itself', 12: 'light sweep', 14: 'BLINK',
      16: 'CUT: lands on 01 Microblading & Microshading', 18: 'BLINK', 20: 'CUT: lands on 02 Lip Blush', 22: 'BLINK',
      24: 'CUT: lands on 03 Permanent Makeup (eye close-up)', 26: 'BLINK', 28: 'CUT: prices on ivory paper',
      32: 'CUT: booking form', 33: 'tick: Brows', 34: 'tick: Lip blush', 35: 'tick: PMU', 36: 'tick: Tattoo + light sweep',
      40: 'CUT: footer jewel, "Ready when you are."', 44: 'CUT: Round City end card', 48: 'light sweep', 52: 'end'}
print(f'# "Beauty" beat grid\n\n- BPM: **{bpm:g}** (beat = {b:.4f} s)\n- First-beat offset: **{off:g} s**\n- Blink interval: 4 beats = {4*b:.4f} s (the `blink` attribute on `<muse-story>`), eyes fully closed on beats 14, 18, 22, 26\n- Video length: {B(52):.3f} s\n- Chapter scrolls glide during the beat before each cut and land on the downbeat.\n')
print('| Beat | Time (s) | Frame @30 | What happens |\n|---:|---:|---:|---|')
for n in range(0, 53):
    if n in ev or n % 4 == 0: print(f'| {n} | {B(n):.3f} | {round(B(n)*30)} | {ev.get(n, "")} |')
print('\nAll beat times (s): ' + ', '.join(f'{B(n):.3f}' for n in range(53)))
