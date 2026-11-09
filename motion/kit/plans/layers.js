// Captures the hero as separate layers on black (for the exploded-view video). Use with --list 4,4.001,...,4.005
window.PLAN = { w: 432, h: 768, dsf: 2.5, mobile: true, dur: 5, y: () => 0 };
(() => {
  const L = [
    '.story__stage, .story__glow, .story__scrim, .grain',   // 0 background
    'muse-story',                                          // 1 line-art portrait (WebGL)
    '.chapter--hero',                                      // 2 typography + buttons
    '#nav',                                                // 3 nav
    '.mbar',                                               // 4 Book bar
  ];
  window.PLAN.after = async (t) => {
    const i = Math.round((t - 4) * 1000);
    let st = document.getElementById('layerstyle');
    if (!st) { st = document.createElement('style'); st.id = 'layerstyle'; document.head.appendChild(st); }
    if (i >= L.length) { st.textContent = ''; return; }
    const sel = L[i].split(',').map((s) => s.trim());
    st.textContent = `html,body{background:#000!important} body *{visibility:hidden!important} ` +
      sel.map((s) => i === 0 ? `${s}{visibility:visible!important}` : `${s},${s} *{visibility:visible!important}`).join(' ');
  };
})();
