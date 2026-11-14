"""Step 3 - quantise the fitted blobs into the game's binary format (13 bytes a blob) and check what that costs.

Usage: export.py <work> <outdir> look [look ...]
Per look:  <outdir>/<look>.bin  = for every level, struct-of-arrays:
    x u16[n] | y u16[n] | ls1 u8[n] | ls2 u8[n] | th u8[n] | r u8[n] | g u8[n] | b u8[n] | w u8[n] | z u8[n] | born u8[n]
and an entry in <outdir>/manifest.json.
"""
import sys, os, json, math
import numpy as np, torch
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt
S, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import splat, looks

POS_PAD = 0.05          # positions cover [-5%, 105%] of the frame
LS_MIN, LS_MAX = math.log(0.25), math.log(260.0)   # log sigma range (pixels at fit resolution)

def quantise(lv, W, H, depth, zlo, zhi):
    n = lv['xy'].shape[0]
    x = np.clip((lv['xy'][:, 0] / W + POS_PAD) / (1 + 2 * POS_PAD), 0, 1)
    y = np.clip((lv['xy'][:, 1] / H + POS_PAD) / (1 + 2 * POS_PAD), 0, 1)
    qx = np.round(x * 65535).astype(np.uint16); qy = np.round(y * 65535).astype(np.uint16)
    ls = np.clip((lv['ls'] - LS_MIN) / (LS_MAX - LS_MIN), 0, 1)
    qls = np.round(ls * 255).astype(np.uint8)
    th = np.mod(lv['th'], math.pi) / math.pi
    qth = (np.round(th * 256).astype(np.int32) % 256).astype(np.uint8)
    col = 1 / (1 + np.exp(-lv['col']))
    qcol = np.round(col * 255).astype(np.uint8)
    w = 1 / (1 + np.exp(-lv['wt']))
    qw = np.round(np.sqrt(w) * 255).astype(np.uint8)
    qw[w < 0.004] = 0
    ix = np.clip(lv['xy'][:, 0], 0, W - 1).astype(int); iy = np.clip(lv['xy'][:, 1], 0, H - 1).astype(int)
    z = np.clip((depth[iy, ix] - zlo) / (zhi - zlo + 1e-9), 0, 1)
    qz = np.round(z * 255).astype(np.uint8)
    return dict(x=qx, y=qy, ls1=qls[:, 0], ls2=qls[:, 1], th=qth, r=qcol[:, 0], g=qcol[:, 1], b=qcol[:, 2], w=qw, z=qz)

def dequantise(q, W, H):
    xy = np.stack([(q['x'] / 65535 * (1 + 2 * POS_PAD) - POS_PAD) * W, (q['y'] / 65535 * (1 + 2 * POS_PAD) - POS_PAD) * H], 1)
    ls = np.stack([q['ls1'], q['ls2']], 1) / 255 * (LS_MAX - LS_MIN) + LS_MIN
    th = q['th'] / 256 * math.pi
    col = np.stack([q['r'], q['g'], q['b']], 1) / 255
    w = (q['w'] / 255) ** 2
    return xy.astype(np.float32), ls.astype(np.float32), th.astype(np.float32), col.astype(np.float32), w.astype(np.float32)

def render_np(xy, ls, th, col, w, H, W):
    con = splat.conic(torch.tensor(ls), torch.tensor(th))
    acc = splat.forward_raw(torch.tensor(xy), con, torch.tensor(col), torch.tensor(w), H, W)
    Sw = acc[..., 3]
    rgb = acc[..., :3] / (Sw[..., None] + 1e-6)
    a = 1 - torch.exp(-Sw / splat.TAU)
    return rgb.numpy(), a.numpy()

def main():
    os.makedirs(OUT, exist_ok=True)
    mpath = f'{OUT}/manifest.json'
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'looks': {}}
    man.update(R=splat.R, tau=splat.TAU, posPad=POS_PAD, lsMin=LS_MIN, lsMax=LS_MAX)
    for name in sys.argv[3:]:
        d = np.load(f'{S}/fit/{name}.npz'); st = json.load(open(f'{S}/fit/{name}.json'))
        H, W, nl = int(d['H']), int(d['W']), int(d['nlevels'])
        rgb, matte, depth, face, cut = looks.load(S, name, W)
        assert rgb.shape[:2] == (H, W)
        if cut:
            # depth for the 3D turn: take it from inside the silhouette only, and carry it outwards, so blobs on
            # the outline move with the person instead of being dragged back towards the (far away) background
            inside = matte > 0.5
            idx = distance_transform_edt(~inside, return_distances=False, return_indices=True)
            depth = depth[idx[0], idx[1]]
        depth = gaussian_filter(depth, sigma=(0.015 if cut else 0.02) * W)
        sel = depth[matte > 0.5] if cut else depth.flatten()
        zlo, zhi = np.percentile(sel, 1), np.percentile(sel, 99)
        if cut:
            yy, xx = np.meshgrid((np.arange(H) + 0.5) / H, (np.arange(W) + 0.5) / W, indexing='ij')
            ss = lambda t: np.clip(t, 0, 1) ** 2 * (3 - 2 * np.clip(t, 0, 1))
            matte = matte * ss(xx / st['cfg']['fade_side']) * ss((1 - xx) / st['cfg']['fade_side']) * ss((1 - yy) / st['cfg']['fade_bottom'])
        else:
            matte = np.ones((H, W), np.float32)
        bg = 0.5
        ct = rgb * matte[..., None] + (1 - matte[..., None]) * bg
        blob = bytearray(); levels = []
        final_img = None
        for li in range(nl):
            lv = {k: d[f'L{li}_{k}'] for k in ('xy', 'ls', 'th', 'col', 'wt', 'birth')}
            q = quantise(lv, W, H, depth, zlo, zhi)
            born = (lv['birth'] == li).astype(np.uint8) if li > 0 else np.zeros(len(lv['wt']), np.uint8)
            for k in ('x', 'y', 'ls1', 'ls2', 'th', 'r', 'g', 'b', 'w', 'z'): blob += q[k].tobytes()
            blob += born.tobytes()
            # what did quantising cost?
            p_rgb, p_a = render_np(*dequantise(q, W, H), H, W)
            cp = p_rgb * p_a[..., None] + (1 - p_a[..., None]) * bg
            psnr_q = -10 * math.log10(((cp - ct) ** 2).mean())
            s = st['stats'][li]
            levels.append(dict(n=int(len(lv['wt'])), step=int(s['step']), loss=round(float(s['loss']), 5),
                               psnr=round(psnr_q, 2), live=int((q['w'] > 0).sum())))
            print(f'{name} L{li}: n={len(lv["wt"])} live={int((q["w"] > 0).sum())} born={int(born.sum())}  PSNR float {s["psnr"]:.2f} -> quantised {psnr_q:.2f}', flush=True)
            final_img = cp
        open(f'{OUT}/{name}.bin', 'wb').write(blob)
        # depth of the face (pivot for the 3D turn)
        fx0, fy0, fx1, fy1 = face
        fz = depth[int(fy0 * H):int(fy1 * H), int(fx0 * W):int(fx1 * W)]
        zpivot = float(np.clip((np.median(fz) - zlo) / (zhi - zlo + 1e-9), 0, 1))
        curve = st['curve']; stepn = max(1, len(curve) // 90)
        man['looks'][name] = dict(file=f'{name}.bin', bytes=len(blob), W=W, H=H, cut=bool(cut), levels=levels,
                                  face=[round(float(v), 4) for v in face], zPivot=round(zpivot, 4),
                                  curve=[[int(c[0]), round(float(c[1]), 4)] for c in curve[::stepn]])
        os.makedirs(f'{S}/export', exist_ok=True)
        pair = np.concatenate([ct, final_img], 1)
        Image.fromarray((np.clip(pair, 0, 1) * 255).astype(np.uint8)).save(f'{S}/export/{name}_pair.png')
        print(f'  -> {name}.bin {len(blob) / 1024:.0f} KB, zPivot {zpivot:.3f}', flush=True)
    json.dump(man, open(mpath, 'w'), separators=(',', ':'))

if __name__ == '__main__':
    main()
