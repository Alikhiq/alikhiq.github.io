"""ctypes wrapper + torch autograd Function around libsplat.so"""
import ctypes, os, math, numpy as np, torch
_here = os.path.dirname(os.path.abspath(__file__))
_lib = ctypes.CDLL(os.path.join(_here, 'libsplat.so'))
_f = ctypes.POINTER(ctypes.c_float); _i = ctypes.POINTER(ctypes.c_int32)
_lib.splat_forward.argtypes = [ctypes.c_int] * 3 + [_f] * 4 + [ctypes.c_float, _f, _i, _f]
_lib.splat_backward.argtypes = [ctypes.c_int] * 3 + [_f] * 4 + [ctypes.c_float] + [_f] * 5
_lib.splat_cost.argtypes = [ctypes.c_int] * 3 + [_f] * 2 + [ctypes.c_float]
_lib.splat_cost.restype = ctypes.c_long

R = 2.5
R2 = R * R
CUT = math.exp(-0.5 * R2)
TAU = 0.2

def _p(t): return ctypes.cast(t.data_ptr(), _f)
def _c(t): return t.detach().contiguous().float()

def forward_raw(mu, con, col, wt, H, W, want_dom=False):
    mu, con, col, wt = _c(mu), _c(con), _c(col), _c(wt)
    acc = torch.empty(H, W, 4)
    if want_dom:
        dom = torch.empty(H, W, dtype=torch.int32); domv = torch.empty(H, W)
        _lib.splat_forward(mu.shape[0], H, W, _p(mu), _p(con), _p(col), _p(wt), R2, _p(acc),
                           ctypes.cast(dom.data_ptr(), _i), _p(domv))
        return acc, dom, domv
    _lib.splat_forward(mu.shape[0], H, W, _p(mu), _p(con), _p(col), _p(wt), R2, _p(acc), None, None)
    return acc

def cost(mu, con, H, W):
    mu, con = _c(mu), _c(con)
    return _lib.splat_cost(mu.shape[0], H, W, _p(mu), _p(con), R2)

class SplatFn(torch.autograd.Function):
    @staticmethod
    def forward(ctx, mu, con, col, wt, H, W):
        mu, con, col, wt = _c(mu), _c(con), _c(col), _c(wt)
        ctx.save_for_backward(mu, con, col, wt); ctx.hw = (H, W)
        acc = torch.empty(H, W, 4)
        _lib.splat_forward(mu.shape[0], H, W, _p(mu), _p(con), _p(col), _p(wt), R2, _p(acc), None, None)
        return acc
    @staticmethod
    def backward(ctx, gacc):
        mu, con, col, wt = ctx.saved_tensors; H, W = ctx.hw
        gacc = _c(gacc); N = mu.shape[0]
        gmu = torch.empty(N, 2); gcon = torch.empty(N, 3); gcol = torch.empty(N, 3); gwt = torch.empty(N)
        _lib.splat_backward(N, H, W, _p(mu), _p(con), _p(col), _p(wt), R2, _p(gacc), _p(gmu), _p(gcon), _p(gcol), _p(gwt))
        return gmu, gcon, gcol, gwt, None, None

def conic(ls, th, scale=1.0):
    s = torch.exp(ls) * scale
    i1 = 1.0 / (s[:, 0] ** 2); i2 = 1.0 / (s[:, 1] ** 2)
    c, sn = torch.cos(th), torch.sin(th)
    return torch.stack([c * c * i1 + sn * sn * i2, c * sn * (i1 - i2), sn * sn * i1 + c * c * i2], 1)

def render(P, H, W, scale=1.0, off=(0.0, 0.0)):
    """P: dict xy (px at scale 1), ls (log sigma), th, col (logit), wt (logit). Returns rgb (H,W,3), alpha (H,W), Sw."""
    mu = P['xy'] * scale + torch.tensor(off, dtype=torch.float32)
    acc = SplatFn.apply(mu, conic(P['ls'], P['th'], scale), torch.sigmoid(P['col']), torch.sigmoid(P['wt']), H, W)
    Sw = acc[..., 3]
    rgb = acc[..., :3] / (Sw[..., None] + 1e-6)
    alpha = 1.0 - torch.exp(-Sw / TAU)
    return rgb, alpha, Sw
