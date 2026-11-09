# layers_alpha.py <dir>: layer captures on black (00001-00004.jpg) -> L1-L4.png with alpha (un-premultiplied "screen" key);
# copies 00000.jpg -> L0.jpg (background) and 00005.jpg -> L5.jpg (all layers).
import sys, shutil, numpy as np
from PIL import Image
d = sys.argv[1]
for i in range(1, 5):
    a = np.asarray(Image.open(f'{d}/{i:05d}.jpg').convert('RGB')).astype(np.float32) / 255
    al = np.clip((a.max(axis=2) - 0.02) / 0.98, 0, 1)
    rgb = np.where(al[..., None] > 1e-3, np.clip(a / np.maximum(al[..., None], 1e-3), 0, 1), 0)
    Image.fromarray((np.dstack([rgb, al]) * 255).astype(np.uint8), 'RGBA').save(f'{d}/L{i}.png')
shutil.copy(f'{d}/00000.jpg', f'{d}/L0.jpg'); shutil.copy(f'{d}/00005.jpg', f'{d}/L5.jpg')
