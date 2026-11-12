// Round City end card, shared by all four showcase videos.
// RCEnd(host, {scale}) builds the DOM inside `host` (an absolutely positioned box); .draw(t) animates it,
// t = seconds since the card starts. Needs lib/common.js (seg, E, splitWords, animWords).
function RCEnd(host, o = {}) {
  const k = o.scale || 1;
  host.classList.add('rc');
  host.innerHTML = `
    <div class="rc__mark">
      <svg viewBox="0 0 200 200" width="${200 * k}" height="${200 * k}">
        <defs><linearGradient id="rcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe8cf"/><stop offset=".45" stop-color="#e9bf95"/><stop offset="1" stop-color="#c48d62"/></linearGradient></defs>
        <circle class="rc__ring" cx="100" cy="100" r="86" fill="none" stroke="url(#rcg)" stroke-width="1.6"/>
        <circle class="rc__ring2" cx="100" cy="100" r="70" fill="none" stroke="rgba(233,191,149,.28)" stroke-width="1"/>
        <line class="rc__hz" x1="40" y1="126" x2="160" y2="126" stroke="url(#rcg)" stroke-width="1.2"/>
        <g class="rc__city" fill="url(#rcg)">
          <rect x="70" y="104" width="7" height="22"/><rect x="80" y="94" width="8" height="32"/><rect x="91" y="84" width="9" height="42"/>
          <rect x="103" y="98" width="8" height="28"/><rect x="114" y="90" width="7" height="36"/><rect x="124" y="108" width="6" height="18"/>
        </g>
        <circle class="rc__bead" cx="100" cy="14" r="3.2" fill="#fff4e4"/>
      </svg>
    </div>
    <div class="rc__by">${o.by || 'Designed &amp; built by'}</div>
    <div class="rc__name">Round City</div>
    <div class="rc__rule"></div>
    <div class="rc__url">${o.url || 'susuinkandglow.com'}</div>`;
  const ring = host.querySelector('.rc__ring'), ring2 = host.querySelector('.rc__ring2'), hz = host.querySelector('.rc__hz');
  const city = host.querySelector('.rc__city'), bead = host.querySelector('.rc__bead');
  const L = 2 * Math.PI * 86, L2 = 2 * Math.PI * 70;
  ring.style.strokeDasharray = L; ring2.style.strokeDasharray = L2;
  const WB = splitWords(host.querySelector('.rc__by')), WN = splitWords(host.querySelector('.rc__name')), WU = splitWords(host.querySelector('.rc__url'));
  const rule = host.querySelector('.rc__rule');
  return {
    draw(t, op = 1) {
      host.style.opacity = op;
      const a = E.inOut(seg(t, 0.0, 1.6));
      ring.style.strokeDashoffset = (L * (1 - a)).toFixed(1);
      ring.setAttribute('transform', 'rotate(-90 100 100)');
      ring2.style.strokeDashoffset = (L2 * (1 - E.inOut(seg(t, 0.3, 1.9)))).toFixed(1);
      ring2.setAttribute('transform', 'rotate(90 100 100)');
      const ang = -Math.PI / 2 + a * Math.PI * 2;
      bead.setAttribute('cx', (100 + 86 * Math.cos(ang)).toFixed(2)); bead.setAttribute('cy', (100 + 86 * Math.sin(ang)).toFixed(2));
      bead.style.opacity = (Math.sin(Math.PI * clamp(a)) * 0.9 + 0.1 * seg(t, 1.6, 2.4) * (1 - seg(t, 2.4, 3.2))).toFixed(3);
      const h = E.outCubic(seg(t, 0.9, 1.9));
      hz.style.strokeDasharray = 120; hz.style.strokeDashoffset = (120 * (1 - h)).toFixed(1);
      const c = E.outQuart(seg(t, 1.2, 2.3));
      city.style.transform = `translateY(${((1 - c) * 26).toFixed(1)}px)`; city.style.opacity = c.toFixed(3);
      city.style.clipPath = 'inset(0 0 0 0)';
      animWords(WB, t, 1.4, 0.06, 1.0, null, { dy: 12 * k, blur: 6 });
      animWords(WN, t, 1.6, 0.12, 1.3, null, { dy: 26 * k, blur: 10 });
      const r = E.outQuart(seg(t, 2.1, 3.3));
      rule.style.transform = `scaleX(${r.toFixed(3)})`; rule.style.opacity = r.toFixed(3);
      animWords(WU, t, 2.4, 0.1, 1.2, null, { dy: 16 * k, blur: 8 });
    },
  };
}
