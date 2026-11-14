"""Which photo becomes which look, and how each one is cropped.

Photos are read from <work>/photos/<look>.jpg (or $NAP_PHOTOS). They are inputs only: nothing here
copies a photo into the walkthrough - it ships the fitted blobs and nothing else.
"""
import os
import numpy as np
from PIL import Image, ImageOps

# crop: x0,y0,x1,y1 in percent of the photo.  face: same units - where detail matters most, and the
# pivot for the 3D turn.  cut: True = person cut out of the background, False = the whole frame.
LOOKS = {
    'coffee':  dict(crop=(28, 22, 74, 68),  face=(43, 25, 57, 39.5),  cut=True,  width=600),
    'pc':      dict(crop=(60, 27, 100, 71), face=(77, 30.5, 94, 47),  cut=True,  width=600),
    'arcade':  dict(crop=(10, 1, 90, 81),   face=(36, 5, 59, 28),     cut=True,  width=600),
    'shades':  dict(crop=(0, 22, 84, 100),  face=(15, 29, 58, 65),    cut=True,  width=600),
    'leopard': dict(crop=(3, 2, 88, 87),    face=(23, 6, 48, 30),     cut=True,  width=600),
    'ghutra':  dict(crop=(0, 6, 96, 100),   face=(42, 18, 63, 47),    cut=True,  width=600),
    'lean':    dict(crop=(0, 0, 100, 100),  face=(36, 20.5, 50, 33),  cut=False, width=720),
    'lake':    dict(crop=(0, 0, 100, 100),  face=(50, 28, 75, 50),    cut=False, width=600),
}

def photo(work, name):
    d = os.environ.get('NAP_PHOTOS') or os.path.join(work, 'photos')
    return ImageOps.exif_transpose(Image.open(os.path.join(d, name + '.jpg'))).convert('RGB')

def load(work, name, width=None):
    """Returns rgb (h,w,3 float32), matte (h,w), raw depth (h,w), face box in crop coords, cut flag."""
    L = LOOKS[name]
    im = photo(work, name)
    W, H = im.size
    x0, y0, x1, y1 = L['crop']
    box = (round(W * x0 / 100), round(H * y0 / 100), round(W * x1 / 100), round(H * y1 / 100))
    fw = width or L['width']
    fh = int(round(fw * (box[3] - box[1]) / (box[2] - box[0]) / 4)) * 4
    rgb = np.asarray(im.crop(box).resize((fw, fh), Image.LANCZOS), dtype=np.float32) / 255
    matte = np.asarray(Image.open(f'{work}/prep/{name}_matte.png').crop(box).resize((fw, fh), Image.LANCZOS), dtype=np.float32) / 255
    dep = np.load(f'{work}/prep/{name}_depth.npy').astype(np.float32)
    dep = np.asarray(Image.fromarray(dep).crop(box).resize((fw, fh), Image.BICUBIC), dtype=np.float32)
    f = L['face']
    face = ((f[0] - x0) / (x1 - x0), (f[1] - y0) / (y1 - y0), (f[2] - x0) / (x1 - x0), (f[3] - y0) / (y1 - y0))
    return rgb, matte, dep, face, L['cut']
