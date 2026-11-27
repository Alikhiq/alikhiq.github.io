"""Step 1 - per photo: an alpha matte (rembg, BiRefNet-portrait) and a relative depth map
(Depth Anything V2 small), cached at full photo resolution in <work>/prep/.

Usage: prep.py <work> <look>     (one look per process: the matting model's memory grows across images)
"""
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import looks

WORK, name = sys.argv[1], sys.argv[2]
os.environ.setdefault('U2NET_HOME', WORK + '/models/rembg')
os.environ.setdefault('HF_HOME', WORK + '/models/hf')
os.makedirs(WORK + '/prep', exist_ok=True)
im = looks.photo(WORK, name)
W, H = im.size

from rembg import new_session, remove
matte = remove(im, session=new_session('birefnet-portrait'), only_mask=True, post_process_mask=False).convert('L')
matte.save(f'{WORK}/prep/{name}_matte.png')

from transformers import pipeline
d = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf')(im)['predicted_depth']
d = np.asarray(d, dtype=np.float32)
if d.ndim == 3: d = d[0]
d = np.asarray(Image.fromarray(d).resize((W, H), Image.BICUBIC), dtype=np.float32)
np.save(f'{WORK}/prep/{name}_depth.npy', d.astype(np.float16))
print(name, (W, H), 'matte mean', float(np.asarray(matte).mean() / 255), flush=True)
