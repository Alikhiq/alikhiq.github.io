"""Step 2 - gradient descent: fit thousands of 2D Gaussian blobs to a photo, starting from pure noise.

Every step the blobs are drawn, the picture is compared with the photo, and each blob's position,
size, angle, colour and weight are nudged downhill (Adam). At the end of each level, new blobs are
dropped where the picture is still most wrong, and the state is saved - those saved levels are the
stages the game morphs between.

Usage: fit.py <work> <look> [key=value ...]      e.g.  fit.py work coffee 'levels=[40,200,1000]'
Writes <work>/fit/<look>.npz (every level), a preview strip and stats JSON.
"""
import sys, os, json, math, time
import numpy as np, torch, torch.nn.functional as F
from PIL import Image
S = sys.argv[1]          # work directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import splat

torch.set_num_threads(4)

import looks

CUT_CFG = dict(                      # a person cut out of the background (the six opponents)
    levels=[80, 400, 2000, 6500, 18000],
    steps=[250, 300, 400, 500, 1100],
    scales=[0.25, 0.25, 0.5, 1.0, 1.0],
)
FULL_CFG = dict(                     # a whole photo (title and ending)
    levels=[1500, 5000, 14000, 40000],
    steps=[300, 400, 600, 1300],
    scales=[0.25, 0.5, 1.0, 1.0],
)
CFG = dict(
    seed=1, face_w=3.0, ssim_w=0.2, alpha_w=0.5, smin=0.4, max_aspect=8.0,
    fade_side=0.05, fade_bottom=0.08, shrink=0.6, extra_steps=0,
)

def parse_cli(cfg, args):
    for a in args:
        k, v = a.split('=', 1)
        cfg[k] = json.loads(v)
    return cfg

# ---------------------------------------------------------------- losses
_win = None
def _window():
    global _win
    if _win is None:
        g = torch.tensor([math.exp(-(i - 5) ** 2 / (2 * 1.5 ** 2)) for i in range(11)])
        g = g / g.sum()
        _win = (g[:, None] * g[None, :])[None, None].repeat(3, 1, 1, 1)
    return _win

def ssim_map(x, y):
    """x,y: (H,W,3) -> SSIM map (3,H,W)"""
    x = x.permute(2, 0, 1)[None]; y = y.permute(2, 0, 1)[None]
    w = _window()
    mx = F.conv2d(x, w, padding=5, groups=3); my = F.conv2d(y, w, padding=5, groups=3)
    sxx = F.conv2d(x * x, w, padding=5, groups=3) - mx * mx
    syy = F.conv2d(y * y, w, padding=5, groups=3) - my * my
    sxy = F.conv2d(x * y, w, padding=5, groups=3) - mx * my
    C1, C2 = 0.01 ** 2, 0.03 ** 2
    return (((2 * mx * my + C1) * (2 * sxy + C2)) / ((mx * mx + my * my + C1) * (sxx + syy + C2)))[0]

def shift_img(img, off):
    """Sample img (H,W,C) at p - off (bilinear), so it lines up with a render done with offset `off`."""
    H, W, C = img.shape
    theta = torch.tensor([[[1.0, 0.0, -2.0 * off[0] / W], [0.0, 1.0, -2.0 * off[1] / H]]])
    grid = F.affine_grid(theta, (1, C, H, W), align_corners=False)
    return F.grid_sample(img.permute(2, 0, 1)[None], grid, mode='bilinear', padding_mode='border', align_corners=False)[0].permute(1, 2, 0)

# ---------------------------------------------------------------- optimiser
class Adam:
    def __init__(self, P): self.m = {k: torch.zeros_like(v) for k, v in P.items()}; self.v = {k: torch.zeros_like(v) for k, v in P.items()}; self.t = {k: torch.zeros(v.shape[0]) for k, v in P.items()}
    def grow(self, P):
        for k, v in P.items():
            n = v.shape[0] - self.m[k].shape[0]
            if n > 0:
                self.m[k] = torch.cat([self.m[k], torch.zeros((n,) + v.shape[1:])]); self.v[k] = torch.cat([self.v[k], torch.zeros((n,) + v.shape[1:])])
                self.t[k] = torch.cat([self.t[k], torch.zeros(n)])
    def reset(self, idx):
        for k in self.m: self.m[k][idx] = 0; self.v[k][idx] = 0; self.t[k][idx] = 0
    def step(self, P, G, lr, mult=None, b1=0.9, b2=0.999):
        for k in P:
            g = G[k]
            self.t[k] += 1
            self.m[k].mul_(b1).add_(g, alpha=1 - b1); self.v[k].mul_(b2).addcmul_(g, g, value=1 - b2)
            t = self.t[k].view((-1,) + (1,) * (g.dim() - 1))
            mh = self.m[k] / (1 - b1 ** t); vh = self.v[k] / (1 - b2 ** t)
            upd = mh / (vh.sqrt() + 1e-12) * lr[k]
            if mult is not None and k in mult: upd = upd * mult[k]
            P[k] -= upd

# ---------------------------------------------------------------- main fit
def fit(name, cfg):
    torch.manual_seed(cfg['seed']); np.random.seed(cfg['seed'])
    rgb, matte, _, face, cut = looks.load(S, name, cfg.get('width'))
    rgb = torch.tensor(rgb); matte = torch.tensor(matte)
    H, W = rgb.shape[:2]
    yy, xx = torch.meshgrid((torch.arange(H) + 0.5) / H, (torch.arange(W) + 0.5) / W, indexing='ij')
    if cut:
        ss = lambda t: (t.clamp(0, 1) ** 2) * (3 - 2 * t.clamp(0, 1))
        fs, fb = cfg['fade_side'], cfg['fade_bottom']
        matte = matte * ss(xx / fs) * ss((1 - xx) / fs) * ss((1 - yy) / fb)
        matte = torch.where(matte < 0.004, torch.zeros_like(matte), matte)
    else:
        matte = torch.ones(H, W)
    fx0, fy0, fx1, fy1 = face
    cx, cy, rx, ry = (fx0 + fx1) / 2, (fy0 + fy1) / 2, (fx1 - fx0) / 2, (fy1 - fy0) / 2
    imp = 1.0 + cfg['face_w'] * torch.exp(-0.5 * (((xx - cx) / (rx * 0.9)) ** 4 + ((yy - cy) / (ry * 0.9)) ** 4))
    full = torch.cat([rgb, matte[..., None], imp[..., None]], -1)       # (H,W,5)
    matte_blur = F.avg_pool2d(matte[None, None], 9, 1, 4)[0, 0]
    pyr = {}
    def target(scale):
        if scale not in pyr:
            if scale == 1.0: pyr[scale] = full
            else:
                h, w = int(round(H * scale)), int(round(W * scale))
                pyr[scale] = F.interpolate(full.permute(2, 0, 1)[None], size=(h, w), mode='area')[0].permute(1, 2, 0).contiguous()
        return pyr[scale]

    N0 = cfg['levels'][0]
    base = 0.55 * math.sqrt(H * W / N0)
    P = {
        'xy': torch.rand(N0, 2) * torch.tensor([W, H], dtype=torch.float32),
        'ls': torch.log(base * torch.exp(0.35 * torch.randn(N0, 2))),
        'th': torch.rand(N0) * math.pi,
        'col': torch.logit(torch.rand(N0, 3) * 0.8 + 0.1),
        'wt': torch.zeros(N0),
    }
    birth = torch.zeros(N0, dtype=torch.int32)
    opt = Adam(P)
    smin, smax = cfg['smin'], 0.35 * W
    la = math.log(cfg['max_aspect'])

    def clamp_():
        P['ls'].clamp_(math.log(smin), math.log(smax))
        dlt = P['ls'][:, 0] - P['ls'][:, 1]
        ex = (dlt.abs() - la).clamp_min(0) * torch.sign(dlt) * 0.5
        P['ls'][:, 0] -= ex; P['ls'][:, 1] += ex
        P['wt'].clamp_(-7, 7); P['col'].clamp_(-7, 7)
        P['xy'][:, 0].clamp_(-0.05 * W, 1.05 * W); P['xy'][:, 1].clamp_(-0.05 * H, 1.05 * H)

    def loss_fn(scale, jitter=True, bg=None):
        T = target(scale); h, w = T.shape[:2]
        off = (float(np.random.rand() - 0.5), float(np.random.rand() - 0.5)) if jitter else (0.0, 0.0)
        Tj = shift_img(T, off) if jitter else T
        t_rgb, t_m, t_imp = Tj[..., :3], Tj[..., 3], Tj[..., 4]
        Q = {k: v.clone().requires_grad_(True) for k, v in P.items()}
        p_rgb, p_a, Sw = splat.render(Q, h, w, scale, off)
        if bg is None: bg = torch.rand(3)
        cp = p_rgb * p_a[..., None] + (1 - p_a[..., None]) * bg
        ct = t_rgb * t_m[..., None] + (1 - t_m[..., None]) * bg
        l1 = ((cp - ct).abs().mean(-1) * t_imp).sum() / t_imp.sum()
        dss = ((1 - ssim_map(cp, ct)).mean(0) * t_imp).sum() / t_imp.sum()
        la_ = ((p_a - t_m).abs() * t_imp).sum() / t_imp.sum()
        L = (1 - cfg['ssim_w']) * l1 + cfg['ssim_w'] * dss + cfg['alpha_w'] * la_
        return L, Q, (cp, ct, p_a, t_m, t_imp)

    def evaluate():
        with torch.no_grad():
            T = target(1.0)
            mu = P['xy']; con = splat.conic(P['ls'], P['th'])
            acc, dom, domv = splat.forward_raw(mu, con, torch.sigmoid(P['col']), torch.sigmoid(P['wt']), H, W, True)
            Sw = acc[..., 3]; p_rgb = acc[..., :3] / (Sw[..., None] + 1e-6); p_a = 1 - torch.exp(-Sw / splat.TAU)
            bg = torch.tensor([0.5, 0.5, 0.5])
            cp = p_rgb * p_a[..., None] + (1 - p_a[..., None]) * bg
            ct = T[..., :3] * T[..., 3:4] + (1 - T[..., 3:4]) * bg
            mse = ((cp - ct) ** 2).mean().item()
            l1 = (cp - ct).abs().mean().item(); dss = (1 - ssim_map(cp, ct)).mean().item()
            err = ((p_rgb * p_a[..., None] - T[..., :3] * T[..., 3:4]).abs().sum(-1) + (p_a - T[..., 3]).abs()) * T[..., 4]
            fragments = splat.cost(mu, con, H, W)
            return dict(psnr=-10 * math.log10(mse), l1=l1, dssim=dss, loss=(1 - cfg['ssim_w']) * l1 + cfg['ssim_w'] * dss,
                        overdraw=fragments / (H * W)), err, dom, cp, p_a

    def densify(n_new, level, recycle=True):
        nonlocal birth
        st, err, dom, _, _ = evaluate()
        e = F.avg_pool2d(err[None, None], 3, 1, 1)[0, 0].flatten() + 1e-8
        w = torch.sigmoid(P['wt'])
        dead = torch.zeros(P['xy'].shape[0], dtype=torch.bool)
        if recycle:
            cnt = torch.bincount(dom.flatten()[dom.flatten() >= 0].long(), minlength=P['xy'].shape[0])
            dead = (w < 0.03) | (cnt == 0) if cfg.get('recycle_hidden', True) else (w < 0.02)
        n_dead = int(dead.sum())
        total = n_new + n_dead
        if total <= 0: return 0
        idx = torch.multinomial(e, total, replacement=False)
        py = (idx // W).float(); px = (idx % W).float()
        T = target(1.0)
        tc = T[..., :3].reshape(-1, 3)[idx].clamp(0.02, 0.98)
        di = dom.flatten()[idx].long()
        gm = torch.exp(P['ls'].mean(1))
        fallback = 0.5 * math.sqrt(H * W / (P['xy'].shape[0] + n_new))
        s_new = torch.where(di >= 0, gm[di.clamp_min(0)] * cfg['shrink'], torch.full_like(px, fallback)).clamp(smin * 1.5, fallback * 3)
        new = {
            'xy': torch.stack([px + torch.rand(total), py + torch.rand(total)], 1),
            'ls': torch.log(s_new)[:, None].repeat(1, 2) + 0.05 * torch.randn(total, 2),
            'th': torch.rand(total) * math.pi,
            'col': torch.logit(tc),
            'wt': torch.zeros(total),
        }
        if n_dead:
            di_ = torch.nonzero(dead).flatten()
            for k in P: P[k][di_] = new[k][:n_dead]
            opt.reset(di_); birth[di_] = level
        if n_new:
            for k in P: P[k] = torch.cat([P[k], new[k][n_dead:]])
            birth = torch.cat([birth, torch.full((n_new,), level, dtype=torch.int32)])
            opt.grow(P)
        return n_dead

    snaps = []; stats = []; curve = []
    def snapshot(level, step):
        st, _, _, cp, p_a = evaluate()
        st.update(level=level, step=step, n=int(P['xy'].shape[0]))
        stats.append(st)
        snaps.append({k: v.clone().numpy() for k, v in P.items()} | {'birth': birth.clone().numpy()})
        print(f"  == level {level}: step {step}  blobs {st['n']}  PSNR {st['psnr']:.2f}  loss {st['loss']:.4f}  overdraw {st['overdraw']:.1f}x", flush=True)
        return cp, p_a

    t0 = time.time(); step = 0; frames = []
    clamp_()
    cp, pa = snapshot(0, 0); frames.append(cp)
    nl = len(cfg['levels'])
    for li in range(nl):
        n_target, n_steps, scale = cfg['levels'][li], cfg['steps'][li], cfg['scales'][li]
        if li == nl - 1: n_steps += cfg['extra_steps']
        n_add = n_target - P['xy'].shape[0]
        rounds = 0 if n_add <= 0 else (3 if n_add > 1500 else 2)
        round_gap = max(20, int(n_steps * 0.12))
        first = (li == 0)
        hi = dict(xy=0.12 if first else 0.06, ls=0.04 if first else 0.025, th=0.04 if first else 0.025, col=0.10 if first else 0.04, wt=0.05 if first else 0.03)
        lo = dict(xy=0.012, ls=0.004, th=0.004, col=0.008, wt=0.006)
        if li == nl - 1: lo = {k: v * 0.4 for k, v in lo.items()}
        added = 0
        for s in range(n_steps):
            if rounds and s % round_gap == 0 and s // round_gap < rounds:
                r = s // round_gap
                k = n_add // rounds if r < rounds - 1 else n_add - added
                nd = densify(k, li + 1, recycle=True); added += k
            if cut and s == int(n_steps * 0.8):
                with torch.no_grad():       # blobs stranded outside the silhouette: switch them off
                    ix = P['xy'][:, 0].clamp(0, W - 1).long(); iy = P['xy'][:, 1].clamp(0, H - 1).long()
                    stray = matte_blur[iy, ix] < 0.02
                    P['wt'][stray] = -7.0
            f = s / max(1, n_steps - 1)
            c = 0.5 * (1 + math.cos(math.pi * f))
            lr = {k: lo[k] + (hi[k] - lo[k]) * c for k in hi}
            L, Q, _ = loss_fn(scale)
            L.backward()
            G = {k: Q[k].grad for k in P}
            gm = torch.exp(P['ls'].mean(1)).clamp(0.5, 24.0)
            with torch.no_grad():
                opt.step(P, G, lr, mult={'xy': gm[:, None]})
                clamp_()
            step += 1
            if step % 10 == 0: curve.append((step, float(L.detach())))
            if step % 100 == 0:
                print(f'    step {step} L{li + 1} n={P["xy"].shape[0]} loss {float(L):.4f}  {time.time() - t0:.0f}s', flush=True)
        cp, pa = snapshot(li + 1, step); frames.append(cp)

    os.makedirs(f'{S}/fit', exist_ok=True)
    out = {}
    for i, sn in enumerate(snaps):
        for k, v in sn.items(): out[f'L{i}_{k}'] = v
    tag = cfg.get('tag', '')
    np.savez_compressed(f'{S}/fit/{name}{tag}.npz', H=H, W=W, nlevels=len(snaps), **out)
    T = target(1.0); bg = torch.tensor([0.5, 0.5, 0.5])
    ct = T[..., :3] * T[..., 3:4] + (1 - T[..., 3:4]) * bg
    strip = torch.cat(frames + [ct], 1).clamp(0, 1).numpy()
    Image.fromarray((strip * 255).astype(np.uint8)).save(f'{S}/fit/{name}{tag}_levels.jpg', quality=90)
    pair = torch.cat([ct, frames[-1]], 1).clamp(0, 1).numpy()
    Image.fromarray((pair * 255).astype(np.uint8)).save(f'{S}/fit/{name}{tag}_pair.png')
    json.dump(dict(stats=stats, curve=curve, cfg=cfg, H=H, W=W, seconds=time.time() - t0), open(f'{S}/fit/{name}{tag}.json', 'w'))
    print(f'done {name} in {time.time() - t0:.0f}s', flush=True)

if __name__ == '__main__':
    base = dict(CFG); base.update(CUT_CFG if looks.LOOKS[sys.argv[2]]['cut'] else FULL_CFG)
    cfg = parse_cli(base, sys.argv[3:])
    fit(sys.argv[2], cfg)
