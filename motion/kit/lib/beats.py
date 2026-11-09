# beats.py <audio> -> "BPM OFFSET" (first strong beat, seconds). Installs librosa on first use.
import sys, subprocess
try:
    import librosa
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'librosa']); import librosa
import numpy as np, tempfile, os
# decode anything ffmpeg reads (m4a, mp3, mp4...) to a temporary wav first
wav = os.path.join(tempfile.mkdtemp(), 'a.wav')
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-ac', '1', '-ar', '22050', wav])
y, sr = librosa.load(wav, sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
tempo = float(np.atleast_1d(tempo)[0])
bt = np.asarray(beats); b = 60 / tempo
# phase that best fits all detected beats, folded to the first beat after 0.25 s
ph = np.angle(np.mean(np.exp(2j * np.pi * bt / b))) / (2 * np.pi) * b
off = ph % b
while off < 0.25: off += b
print(f'{tempo:.3f} {off:.3f}')
sys.stderr.write(f'detected {len(bt)} beats; first beats: {", ".join(f"{x:.2f}" for x in bt[:8])}\n')
