// Mo Tint kinetic type: every line gets a motion that means something (deterministic, pure function of t).
// Needs lib/common.js globals: $, $$, E, seg, lerp, rng, clamp.
(function () {
  const GLYPHS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%/+-=·';
  const C = (x) => clamp(x, 0, 1);
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const PAPER = [242, 239, 229], GOLD = [246, 202, 75], CALIPER = [198, 59, 47], BAY = [10, 11, 9];

  // split a .word into masked letters (letters rise out of an invisible slot)
  function letters(el) { const txt = el.textContent; el.innerHTML = [...txt].map((c) => `<span class="c">${c === ' ' ? '&nbsp;' : c}</span>`).join(''); el.classList.add('mask'); return [...el.querySelectorAll('.c')]; }
  // scramble-decode for the mono labels ("|" = line break)
  function decode(el, t, a, b, o = {}) {
    if (!el.dataset.src) el.dataset.src = el.innerHTML.replace(/<br\s*\/?>/gi, '|');
    const src = el.dataset.src, n = src.length, dur = o.d ?? 0.9;
    const k = C((t - a) / dur), q = b == null ? 0 : C((t - b) / 0.45);
    const fr = Math.floor(t * 30), R = rng(fr * 7 + n);
    let out = '';
    for (let i = 0; i < n; i++) { const ch = src[i]; if (ch === '|') { out += '<br>'; continue; }
      const on = k * (n + 6) - i;            // reveal sweeps left -> right, with a short scramble ahead of it
      out += ch === ' ' || ch === '·' ? ch : on >= 6 ? ch : on > 0 ? GLYPHS[Math.floor(R() * GLYPHS.length)] : '&nbsp;'; }
    el.innerHTML = out; el.style.opacity = (C(k * 3) * (1 - E.inOutSine(q))).toFixed(3);
    el.style.letterSpacing = `${(0.32 + 0.12 * (1 - E.outExpo(k))).toFixed(3)}em`;
  }
  const exitK = (t, b, i, n, d = 0.45) => (b == null ? 0 : E.inOutSine(C((t - b - i * 0.012) / d)));

  // LIGHT. : letters burn in from a white bloom, tracking closes, then cool to paper
  function light(cs, t, a, b) { cs.forEach((c, i) => { const k = E.outExpo(C((t - a - i * 0.035) / 0.9)); const hot = 1 - C((t - a - 0.15 - i * 0.035) / 0.9); const q = exitK(t, b, i);
    c.style.transform = `translateY(${((1 - k) * 105).toFixed(1)}%)`; c.style.opacity = (C(k * 2) * (1 - q)).toFixed(3);
    c.style.color = rgb(mix(PAPER, [255, 255, 255], hot));
    c.style.textShadow = hot > 0.02 ? `0 0 ${(30 * hot).toFixed(1)}px rgba(255,248,224,${(0.95 * hot).toFixed(2)}), 0 0 ${(90 * hot).toFixed(1)}px rgba(255,236,190,${(0.7 * hot).toFixed(2)})` : 'none';
    c.style.filter = q > 0.01 ? `blur(${(q * 10).toFixed(1)}px) brightness(${(1 + q * 2).toFixed(2)})` : 'none'; });
    if (cs[0]) cs[0].parentNode.style.letterSpacing = `${(-0.02 + 0.22 * (1 - E.outExpo(C((t - a) / 1.0)))).toFixed(3)}em`; }

  // HEAT. : rises through a shimmer, red-hot -> gold -> paper
  function heat(el, cs, t, a, b) { const k0 = C((t - a) / 1.1);
    cs.forEach((c, i) => { const k = E.outExpo(C((t - a - i * 0.04) / 0.8)); const q = exitK(t, b, i);
      const w = Math.sin(t * 9 + i * 1.7) * 4 * (1 - k0 * 0.7);
      c.style.transform = `translate(${w.toFixed(1)}px, ${((1 - k) * 105).toFixed(1)}%)`; c.style.opacity = (C(k * 2) * (1 - q)).toFixed(3);
      const h = C((t - a - 0.3) / 0.9); c.style.color = rgb(h < 0.5 ? mix(CALIPER, GOLD, h * 2) : mix(GOLD, PAPER, (h - 0.5) * 2));
      c.style.textShadow = `0 0 ${(26 * (1 - h)).toFixed(1)}px rgba(246,120,50,${(0.8 * (1 - h)).toFixed(2)})`; c.style.filter = q > 0.01 ? `blur(${(q * 8).toFixed(1)}px)` : 'none'; });
    $('#txtTurb').setAttribute('baseFrequency', `0.012 ${(0.06 + 0.02 * Math.sin(t * 3)).toFixed(4)}`);
    $('#txtDisp').setAttribute('scale', (14 * (1 - E.outCubic(k0)) + 3).toFixed(2)); el.style.filter = t > a - 0.1 && t < (b ?? 99) + 0.6 ? 'url(#txtHeat)' : 'none'; }

  // GLARE. : an anamorphic streak sweeps left -> right and leaves the word behind it
  function glare(el, t, a, b) { const k = E.inOut(C((t - a) / 0.75)); const q = E.inOut(C((t - b) / 0.5));
    const x0 = 60, x1 = 1020; const rev = lerp(x0, x1, k), hide = lerp(x0, x1, q);
    el.style.clipPath = `polygon(${hide}px -40px, ${rev}px -40px, ${rev}px 260px, ${hide}px 260px)`; el.style.opacity = 1;
    el.querySelectorAll('.c').forEach((c) => { c.style.transform = 'none'; c.style.opacity = 1; c.style.filter = 'none'; c.style.color = ''; });
    const s = $('#glStreak'); const on = (k > 0 && k < 1) || (q > 0 && q < 1); s.style.visibility = on ? 'visible' : 'hidden';
    s.style.left = ((q > 0 ? hide : rev) - 700).toFixed(1) + 'px'; s.style.opacity = on ? (0.6 + 0.4 * Math.sin(t * 40)).toFixed(2) : 0; }

  // generic masked rise (used under the effects that need a plain entrance)
  function rise(cs, t, a, b, o = {}) { const st = o.st ?? 0.03, d = o.d ?? 0.85;
    cs.forEach((c, i) => { const k = E.outExpo(C((t - a - i * st) / d)); const q = exitK(t, b, i);
      c.style.transform = `translateY(${((1 - k) * 105 - q * 20).toFixed(1)}%)`; c.style.opacity = (C(k * 2) * (1 - q)).toFixed(3);
      c.style.filter = q > 0.01 ? `blur(${(q * 8).toFixed(1)}px)` : 'none'; }); }

  // PRIVACY. : the word lands, then a tint bar draws down over it (with the gold squeegee edge)
  function privacy(cs, t, a, b) { rise(cs, t, a, b, { st: 0.028 }); const k = E.inOut(C((t - a - 0.55) / 0.6)); const q = E.inOutSine(C((t - b) / 0.45));
    const bar = $('#privBar'); bar.style.height = (k * 172).toFixed(1) + 'px'; bar.style.opacity = (1 - q).toFixed(3); bar.style.visibility = k > 0 && q < 1 ? 'visible' : 'hidden';
    const sq = $('#privSq'); sq.style.top = (1214 + k * 172).toFixed(1) + 'px'; sq.style.opacity = (C(k * 6) * (1 - C((k - 0.92) / 0.08)) * (1 - q)).toFixed(3); }

  // CONTROLLED. : snaps into place on a precise beat, a gold rule draws under it
  function controlled(cs, t, a, b) { cs.forEach((c, i) => { const k = C((t - a - i * 0.045) / 0.32); const q = exitK(t, b, i);
      c.style.transform = `scale(${(1 + 0.6 * (1 - E.outExpo(k))).toFixed(3)})`; c.style.opacity = (C(k * 3) * (1 - q)).toFixed(3); c.style.filter = q > 0.01 ? `blur(${(q * 8).toFixed(1)}px)` : (k < 1 ? `blur(${((1 - k) * 6).toFixed(1)}px)` : 'none'); });
    const r = $('#ctrlRule'); const rk = E.outExpo(C((t - a - 0.55) / 0.7)); const q = E.inOutSine(C((t - b) / 0.45)); r.style.transform = `scaleX(${rk.toFixed(3)})`; r.style.opacity = ((rk > 0 ? 1 : 0) * (1 - q)).toFixed(3); }

  // HEAT STAYS OUT. : "OUT." hits from the right like a wall
  function staysOut(cs, t, a, b) { let split = cs.length; for (let i = cs.length - 1; i >= 0; i--) if (cs[i].textContent.trim() === '') { split = i + 1; break; }
    cs.forEach((c, i) => { const q = exitK(t, b, i); if (i < split) { const k = E.outExpo(C((t - a - i * 0.025) / 0.8)); c.style.transform = `translateY(${((1 - k) * 105).toFixed(1)}%)`; c.style.opacity = (C(k * 2) * (1 - q)).toFixed(3); }
      else { const a2 = a + 0.75 + (i - split) * 0.03; const k = C((t - a2) / 0.28); const kk = E.outExpo(k); const shake = k >= 1 ? Math.exp(-(t - a2 - 0.28) * 14) * Math.sin((t - a2) * 70) * 7 : 0;
        c.style.transform = `translateX(${((1 - kk) * 420 + shake).toFixed(1)}px) skewX(${(-18 * (1 - kk)).toFixed(1)}deg)`; c.style.opacity = (C(k * 3) * (1 - q)).toFixed(3); c.style.color = rgb(mix([255, 255, 255], GOLD, C((t - a2 - 0.2) / 0.5))); }
      c.style.filter = q > 0.01 ? `blur(${(q * 8).toFixed(1)}px)` : 'none'; }); }

  // COOL. : settles softly, then drifts in the breeze with a cool shimmer
  function cool(cs, t, a, b) { cs.forEach((c, i) => { const k = E.outCubic(C((t - a - i * 0.08) / 1.2)); const q = exitK(t, b, i); const sway = C((t - a - 0.6) / 1.0);
      const y = (1 - k) * -60 + Math.sin(t * 1.7 + i * 0.8) * 7 * sway, r = Math.sin(t * 1.3 + i * 1.1) * 2.2 * sway, x = Math.sin(t * 1.1 + i) * 4 * sway;
      c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`; c.style.opacity = (k * (1 - q)).toFixed(3);
      const sh = Math.max(0, Math.sin(t * 2.4 - i * 0.9)) ** 6; c.style.filter = `brightness(${(1 + 0.45 * sh).toFixed(2)})${(1 - k) > 0.02 ? ` blur(${((1 - k) * 12).toFixed(1)}px)` : ''}${q > 0.01 ? ` blur(${(q * 8).toFixed(1)}px)` : ''}`;
      c.style.textShadow = `0 0 ${(24 * sh).toFixed(1)}px rgba(214,236,255,${(0.6 * sh).toFixed(2)})`; }); }

  // ANY SHADE. : a wave of tint runs through the letters (70 -> 05 VLT), then they clear
  function anyShade(cs, t, a, b) { rise(cs, t, a, b, { st: 0.03 });
    cs.forEach((c, i) => { const w = C((t - a - 0.7 - i * 0.07) / 0.9); const d = Math.sin(Math.PI * w); c.style.color = rgb(mix(PAPER, [26, 28, 24], 0.9 * d)); c.style.textShadow = d > 0.05 ? `0 0 0 rgba(0,0,0,0), 0 2px 0 rgba(242,239,229,${(0.35 * d).toFixed(2)})` : 'none'; }); }
  // SAME PRICE. : gold slam with a camera-shake on the line above
  function samePrice(cs, t, a, b, other) { cs.forEach((c, i) => { const k = C((t - a - i * 0.018) / 0.3); const kk = E.outExpo(k); const q = exitK(t, b, i);
      c.style.transform = `scale(${(1 + 1.2 * (1 - kk)).toFixed(3)})`; c.style.opacity = (C(k * 3) * (1 - q)).toFixed(3); c.style.filter = q > 0.01 ? `blur(${(q * 8).toFixed(1)}px)` : (k < 1 ? `blur(${((1 - kk) * 14).toFixed(1)}px)` : 'none'); });
    const hit = t - a - 0.3; const sh = hit > 0 ? Math.exp(-hit * 12) * Math.sin(hit * 80) * 9 : 0; other.style.transform = `translateY(${sh.toFixed(1)}px)`; }

  // odometer digits (price + phone)
  function odometer(el) { const txt = el.textContent; el.innerHTML = [...txt].map((ch) => /\d/.test(ch)
      ? `<span class="odo" data-d="${ch}"><span class="strip">${Array.from({ length: 30 }, (_, j) => `<span>${j % 10}</span>`).join('')}</span></span>`
      : `<span class="c">${ch}</span>`).join(''); return [...el.children]; }
  function roll(parts, t, a, b, o = {}) { const st = o.st ?? 0.07, d = o.d ?? 1.2; let di = 0;
    parts.forEach((p, i) => { const q = exitK(t, b, i);
      if (p.classList.contains('odo')) { const target = 20 + +p.dataset.d; const k = E.outExpo(C((t - a - 0.1 - di * st) / d)); di++;
        p.firstChild.style.transform = `translateY(${(-target * k).toFixed(3)}em)`; p.style.opacity = (C((t - a - di * st * 0.5) / 0.2) * (1 - q)).toFixed(3); p.style.filter = k < 0.98 ? `blur(${((1 - k) * 5).toFixed(1)}px)` : 'none'; }
      else { const k = E.outExpo(C((t - a - i * 0.02) / 0.7)); p.style.opacity = (k * (1 - q)).toFixed(3); p.style.transform = `translateY(${((1 - k) * 40).toFixed(1)}px)`; } }); }

  // typewriter with a block cursor
  function typewrite(el, t, a, o = {}) { if (!el.dataset.src) el.dataset.src = el.textContent; const s = el.dataset.src; const n = Math.floor(C((t - a) / (o.d ?? 1.4)) * s.length);
    const blink = (Math.floor(t * 2.2) % 2 === 0) || n < s.length; el.innerHTML = s.slice(0, n) + `<span class="cur" style="opacity:${t > a - 0.3 && blink && t < a + (o.d ?? 1.4) + 1.6 ? 1 : 0}"></span>`; el.style.opacity = t >= a - 0.3 ? 1 : 0; }
  function fineLines(el, t, a, b) { if (!el.dataset.src) { el.dataset.src = el.innerHTML; el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l) => `<span class="ln">${l}</span>`).join('<br>'); }
    [...el.querySelectorAll('.ln')].forEach((l, i) => { const k = E.outExpo(C((t - a - i * 0.18) / 0.8)); const q = exitK(t, b, 0); l.style.opacity = (k * (1 - q)).toFixed(3); l.style.transform = `translateY(${((1 - k) * 18).toFixed(1)}px)`; l.style.display = 'inline-block'; }); el.style.opacity = 1; }

  window.MTKT = { letters, decode, light, heat, glare, rise, privacy, controlled, staysOut, cool, anyShade, samePrice, odometer, roll, typewrite, fineLines };
})();
