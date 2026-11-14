"""Check the hand-written gradients in splat.cpp against finite differences, and time a training step.

Usage: gradcheck.py
"""
import torch, time, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import splat
torch.manual_seed(0)
N, H, W = 40, 24, 32
P = {'xy': torch.rand(N, 2) * torch.tensor([W, H]), 'ls': torch.log(torch.rand(N, 2) * 3 + 0.8), 'th': torch.rand(N) * 3.14,
     'col': torch.randn(N, 3), 'wt': torch.randn(N)}
tgt = torch.rand(H, W, 3); m = torch.rand(H, W)
def loss(P):
    rgb, a, Sw = splat.render(P, H, W)
    return ((rgb * a[..., None] - tgt) ** 2).sum() + ((a - m) ** 2).sum()
for k in P: P[k].requires_grad_(True)
L = loss(P); L.backward()
eps = 2e-3; worst = 0
for k in P:
    g = P[k].grad.flatten(); num = torch.zeros_like(g)
    flat = P[k].detach().flatten()
    for j in range(min(flat.numel(), 30)):
        Pp = {kk: v.detach().clone() for kk, v in P.items()}; Pm = {kk: v.detach().clone() for kk, v in P.items()}
        Pp[k].view(-1)[j] += eps; Pm[k].view(-1)[j] -= eps
        num[j] = (loss(Pp) - loss(Pm)) / (2 * eps)
    n = min(flat.numel(), 30)
    err = (g[:n] - num[:n]).abs().max().item(); sc = num[:n].abs().max().item()
    worst = max(worst, err / (sc + 1e-9))
    print(f'{k:4s} max|analytic-numeric| {err:.5f}  (scale {sc:.3f})  rel {err/(sc+1e-9):.4f}')
print('WORST rel', worst)
# speed test
N, H, W = 20000, 640, 480
P = {'xy': torch.rand(N, 2) * torch.tensor([W, H]), 'ls': torch.log(torch.rand(N, 2) * 2.5 + 0.8), 'th': torch.rand(N) * 3.14,
     'col': torch.randn(N, 3), 'wt': torch.randn(N)}
for k in P: P[k].requires_grad_(True)
tgt = torch.rand(H, W, 3)
t = time.time()
for _ in range(10):
    rgb, a, Sw = splat.render(P, H, W); L = (rgb - tgt).abs().mean(); L.backward()
dt = (time.time() - t) / 10
c = splat.cost(P['xy'], splat.conic(P['ls'], P['th']), H, W)
print(f'20k blobs 480x640: {dt*1000:.1f} ms/step, fragments {c/1e6:.2f}M, overdraw {c/(H*W):.1f}x')
