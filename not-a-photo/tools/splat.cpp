// Order-independent 2D Gaussian splat rasteriser with hand-written gradients.
// Image model:  acc(p) = sum_i w_i * k_i(p) * [c_i, 1],   k_i(p) = max(0, exp(-d2/2) - cut)
//               d2 = a dx^2 + 2 b dx dy + c dy^2,  (dx,dy) = p + 0.5 - mu_i + off
// Build: g++ -O3 -march=native -ffast-math -fopenmp -shared -fPIC splat.cpp -o libsplat.so
#include <cmath>
#include <cstring>
#include <cstdint>
#include <algorithm>
#include <vector>
#include <omp.h>

namespace {
struct Rows { int y0, y1; };

inline Rows row_range(float my, float a, float b, float c, float R2, int H) {
    float det = a * c - b * b;
    Rows r{0, -1};
    if (!(det > 0) || !(a > 0)) return r;
    float ey = std::sqrt(R2 * a / det);
    int y0 = (int)std::ceil(my - ey - 0.5f), y1 = (int)std::floor(my + ey - 0.5f);
    r.y0 = std::max(y0, 0); r.y1 = std::min(y1, H - 1);
    return r;
}
inline bool span(float mx, float my, float a, float b, float c, float R2, int y, int W, int& x0, int& x1) {
    float dy = (y + 0.5f) - my;
    float B = b * dy;
    float disc = B * B - a * (c * dy * dy - R2);
    if (!(disc > 0)) return false;
    float sq = std::sqrt(disc);
    float lo = (-B - sq) / a, hi = (-B + sq) / a;
    x0 = std::max((int)std::ceil(mx + lo - 0.5f), 0);
    x1 = std::min((int)std::floor(mx + hi - 0.5f), W - 1);
    return x0 <= x1;
}
}  // namespace

extern "C" {

// mu: N*2 (pixels), con: N*3 (a,b,c), col: N*3, wt: N.  acc: H*W*4 (overwritten).
// dom / domv (optional, H*W): index and value of the largest single contribution per pixel.
void splat_forward(int N, int H, int W, const float* mu, const float* con, const float* col,
                   const float* wt, float R2, float* acc, int32_t* dom, float* domv) {
    const float cut = std::exp(-0.5f * R2);
    std::memset(acc, 0, sizeof(float) * (size_t)H * W * 4);
    if (dom) { for (long i = 0; i < (long)H * W; i++) { dom[i] = -1; domv[i] = 0.f; } }
    std::vector<Rows> rr(N);
    for (int i = 0; i < N; i++) rr[i] = row_range(mu[2 * i + 1], con[3 * i], con[3 * i + 1], con[3 * i + 2], R2, H);
    const int BAND = 8;
    const int nb = (H + BAND - 1) / BAND;
    #pragma omp parallel for schedule(dynamic, 1)
    for (int bi = 0; bi < nb; bi++) {
        const int by0 = bi * BAND, by1 = std::min(H, by0 + BAND) - 1;
        for (int i = 0; i < N; i++) {
            const int ya = std::max(rr[i].y0, by0), yb = std::min(rr[i].y1, by1);
            if (ya > yb) continue;
            const float mx = mu[2 * i], my = mu[2 * i + 1];
            const float a = con[3 * i], b = con[3 * i + 1], c = con[3 * i + 2];
            const float w = wt[i], cr = col[3 * i], cg = col[3 * i + 1], cb = col[3 * i + 2];
            for (int y = ya; y <= yb; y++) {
                int x0, x1;
                if (!span(mx, my, a, b, c, R2, y, W, x0, x1)) continue;
                const float dy = (y + 0.5f) - my;
                const float cdy2 = c * dy * dy, bdy2 = 2.f * b * dy;
                float* row = acc + ((size_t)y * W) * 4;
                if (!dom) {
                    #pragma omp simd
                    for (int x = x0; x <= x1; x++) {
                        const float dx = (x + 0.5f) - mx;
                        const float d2 = a * dx * dx + bdy2 * dx + cdy2;
                        float k = std::exp(-0.5f * d2) - cut;
                        k = k > 0.f ? k : 0.f;
                        const float g = w * k;
                        row[4 * x] += g * cr; row[4 * x + 1] += g * cg; row[4 * x + 2] += g * cb; row[4 * x + 3] += g;
                    }
                } else {
                    int32_t* drow = dom + (size_t)y * W; float* vrow = domv + (size_t)y * W;
                    for (int x = x0; x <= x1; x++) {
                        const float dx = (x + 0.5f) - mx;
                        const float d2 = a * dx * dx + bdy2 * dx + cdy2;
                        float k = std::exp(-0.5f * d2) - cut;
                        k = k > 0.f ? k : 0.f;
                        const float g = w * k;
                        row[4 * x] += g * cr; row[4 * x + 1] += g * cg; row[4 * x + 2] += g * cb; row[4 * x + 3] += g;
                        if (g > vrow[x]) { vrow[x] = g; drow[x] = i; }
                    }
                }
            }
        }
    }
}

// gacc: H*W*4 = dL/dacc.  Outputs (overwritten): gmu N*2, gcon N*3, gcol N*3, gwt N.
void splat_backward(int N, int H, int W, const float* mu, const float* con, const float* col,
                    const float* wt, float R2, const float* gacc, float* gmu, float* gcon,
                    float* gcol, float* gwt) {
    const float cut = std::exp(-0.5f * R2);
    #pragma omp parallel for schedule(dynamic, 64)
    for (int i = 0; i < N; i++) {
        const float mx = mu[2 * i], my = mu[2 * i + 1];
        const float a = con[3 * i], b = con[3 * i + 1], c = con[3 * i + 2];
        const float w = wt[i], cr = col[3 * i], cg = col[3 * i + 1], cb = col[3 * i + 2];
        double s_mx = 0, s_my = 0, s_a = 0, s_b = 0, s_c = 0, s_r = 0, s_g = 0, s_bl = 0, s_w = 0;
        Rows r = row_range(my, a, b, c, R2, H);
        for (int y = r.y0; y <= r.y1; y++) {
            int x0, x1;
            if (!span(mx, my, a, b, c, R2, y, W, x0, x1)) continue;
            const float dy = (y + 0.5f) - my;
            const float* grow = gacc + ((size_t)y * W) * 4;
            float t_mx = 0, t_my = 0, t_a = 0, t_b = 0, t_c = 0, t_r = 0, t_g = 0, t_bl = 0, t_w = 0;
            #pragma omp simd reduction(+:t_mx,t_my,t_a,t_b,t_c,t_r,t_g,t_bl,t_w)
            for (int x = x0; x <= x1; x++) {
                const float dx = (x + 0.5f) - mx;
                const float d2 = a * dx * dx + 2.f * b * dx * dy + c * dy * dy;
                const float e = std::exp(-0.5f * d2);
                float k = e - cut;
                const float live = k > 0.f ? 1.f : 0.f;
                k *= live;
                const float gr = grow[4 * x], gg = grow[4 * x + 1], gb = grow[4 * x + 2], gw = grow[4 * x + 3];
                const float t = cr * gr + cg * gg + cb * gb + gw;   // dL/d(w*k)
                const float g = w * k;
                t_r += g * gr; t_g += g * gg; t_bl += g * gb;
                t_w += k * t;
                const float dd2 = -0.5f * e * w * t * live;         // dL/d(d2)
                t_a += dd2 * dx * dx; t_b += dd2 * 2.f * dx * dy; t_c += dd2 * dy * dy;
                t_mx += dd2 * (-2.f * a * dx - 2.f * b * dy);
                t_my += dd2 * (-2.f * b * dx - 2.f * c * dy);
            }
            s_mx += t_mx; s_my += t_my; s_a += t_a; s_b += t_b; s_c += t_c;
            s_r += t_r; s_g += t_g; s_bl += t_bl; s_w += t_w;
        }
        gmu[2 * i] = (float)s_mx; gmu[2 * i + 1] = (float)s_my;
        gcon[3 * i] = (float)s_a; gcon[3 * i + 1] = (float)s_b; gcon[3 * i + 2] = (float)s_c;
        gcol[3 * i] = (float)s_r; gcol[3 * i + 1] = (float)s_g; gcol[3 * i + 2] = (float)s_bl;
        gwt[i] = (float)s_w;
    }
}

// Sum of fragment counts (how many pixel evaluations a frame costs) - used to report overdraw.
long splat_cost(int N, int H, int W, const float* mu, const float* con, float R2) {
    long total = 0;
    #pragma omp parallel for reduction(+:total) schedule(dynamic, 256)
    for (int i = 0; i < N; i++) {
        const float mx = mu[2 * i], my = mu[2 * i + 1];
        const float a = con[3 * i], b = con[3 * i + 1], c = con[3 * i + 2];
        Rows r = row_range(my, a, b, c, R2, H);
        for (int y = r.y0; y <= r.y1; y++) { int x0, x1; if (span(mx, my, a, b, c, R2, y, W, x0, x1)) total += x1 - x0 + 1; }
    }
    return total;
}

}  // extern "C"
