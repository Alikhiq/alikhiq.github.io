/* Susu Ink & Glow — site interactions (Round City) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const body = document.body;

  /* ---------- loader ---------- */
  const t0 = performance.now();
  const ready = () => {
    const wait = Math.max(0, 1100 - (performance.now() - t0));
    setTimeout(() => { body.classList.remove('is-loading'); body.classList.add('is-ready'); revealAbove(); }, wait);
  };
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
  setTimeout(() => body.classList.add('is-ready'), 3200);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  try {
    if (!reduce && window.Lenis) lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
  } catch (e) { lenis = null; }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollToY = (y, dur = 1.6) => {
    if (lenis) lenis.scrollTo(y, { duration: dur, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------- story geometry ---------- */
  const story = $('#story');
  const track = $('#muse-track');
  const chapters = $$('.chapter');
  const proofs = $$('.proof');
  const rail = $('.rail');
  const railBtns = $$('.rail button');
  const hint = $('.scroll-hint');
  const muse = $('.story__muse');
  const bodyart = $('.bodyart');
  const pan = $('.bodyart__pan');
  const tagEl = $('.bodyart__tag');
  const ART_R = 1100 / 1375;            // navel art aspect (w/h), cropped above the waist
  const JEWEL = [0.753, 0.4627];         // jewel position inside the art
  const START = [0.6, 0.2];             // camera starts at the waist
  const lerp = (a, b, t) => a + (b - a) * t;
  const updateBody = (pr) => {
    // pr runs to 6.5 so the zoom keeps going while chapter 06 is held on screen
    const out = smooth(5.08, 5.55, pr);               // portrait tilts up and away
    const e = smooth(5.3, 5.85, pr);                  // body fades in under it
    const q = reduce ? 1 : smooth(5.3, 6.45, pr);     // pan down + push in
    muse.style.opacity = (1 - out).toFixed(3);
    muse.style.transform = out > 0 && !reduce ? `translateY(${(-out * 9).toFixed(2)}%) scale(${(1 + out * 0.06).toFixed(4)})` : '';
    bodyart.style.opacity = e.toFixed(3);
    bodyart.style.visibility = e > 0.002 ? 'visible' : 'hidden';
    if (e <= 0.002) return;
    const cw = bodyart.clientWidth, ch = bodyart.clientHeight;
    const mob = mobile();
    const bh = ch * (mob ? 1.05 : 1.12), bw = bh * ART_R;
    const s = 1 + q * (mob ? 0.62 : 0.5);
    const fx = lerp(START[0], JEWEL[0], q), fy = lerp(START[1], JEWEL[1], q);
    const tx = cw * (mob ? 0.5 : 0.5) - fx * bw * s;
    const ty = ch * (mob ? 0.5 : 0.5) - fy * bh * s + (1 - e) * ch * 0.12;
    pan.style.width = bw.toFixed(1) + 'px';
    pan.style.height = bh.toFixed(1) + 'px';
    pan.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    tagEl.style.transform = `translateY(-50%) scale(${(1 / s).toFixed(4)})`;
    bodyart.classList.toggle('is-tag', q > 0.62);
  };
  const mobile = () => innerWidth <= 760;
  let STEP = 0, storyTop = 0, storyH = 0;
  const layout = () => {
    const vh = innerHeight;
    STEP = vh * (mobile() ? 0.85 : 0.95);
    storyH = Math.round(STEP * 6 + vh + STEP * 0.5);
    story.style.height = storyH + 'px';
    storyTop = story.getBoundingClientRect().top + scrollY();
  };
  layout();
  addEventListener('resize', () => { layout(); lastP = -1; });
  const chapterY = (i) => storyTop + i * STEP + 2;

  let lastP = -1, lastActive = -1;
  const updateStory = () => {
    const pr = clamp((scrollY() - storyTop) / STEP, 0, 6.5);
    const p = Math.min(pr, 6);
    if (Math.abs(pr - lastP) < 0.0005) return;
    lastP = pr;
    updateBody(pr);
    track.style.top = (-p * 1000).toFixed(1) + 'px';
    const mob = mobile();
    chapters.forEach((el) => {
      const i = +el.dataset.i, d = p - i;
      const vis = 1 - smooth(0.1, 0.42, Math.abs(d));
      const y = -d * (mob ? 30 : 46);
      el.style.opacity = vis.toFixed(3);
      el.style.transform = mob ? `translateY(${y.toFixed(1)}px)` : `translateY(calc(-50% + ${y.toFixed(1)}px))`;
      el.classList.toggle('is-on', vis > 0.55);
    });
    proofs.forEach((el) => {
      const d = p - +el.dataset.for;
      const vis = 1 - smooth(0.05, 0.38, Math.abs(d));
      el.style.opacity = vis.toFixed(3);
      el.style.transform = `translateY(${((1 - vis) * 34 - d * 20).toFixed(1)}px) rotate(${(3 - vis * 5).toFixed(2)}deg)`;
    });
    const active = clamp(Math.round(p), 0, 6);
    rail.classList.toggle('is-on', p > 0.45 && p < 6.45);
    if (active !== lastActive) {
      railBtns.forEach((b) => b.classList.toggle('is-on', +b.dataset.go === active));
      lastActive = active;
    }
    if (hint) hint.style.opacity = (1 - clamp(p * 3, 0, 1)).toFixed(2);
  };
  railBtns.forEach((b) => b.addEventListener('click', () => scrollToY(chapterY(+b.dataset.go))));

  /* ---------- anchors ---------- */
  const sheet = $('#sheet');
  const menuBtn = $('.nav__menu');
  const closeSheet = () => { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); };
  menuBtn.addEventListener('click', () => {
    const open = !sheet.classList.contains('is-open');
    sheet.classList.toggle('is-open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (a.dataset.service) presetService(a.dataset.service);
    if (sheet.classList.contains('is-open')) closeSheet();
    if (id === '#top') { e.preventDefault(); scrollToY(0); return; }
    if (a.dataset.chapter) { e.preventDefault(); scrollToY(chapterY(+a.dataset.chapter)); return; }
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    const y = t.getBoundingClientRect().top + scrollY() - (id === '#book' ? 40 : 70);
    scrollToY(y);
  });

  /* ---------- nav state ---------- */
  const nav = $('#nav');
  const navLinks = $$('.nav__links a');
  const sections = ['story', 'results', 'about', 'prices', 'faq'].map((id) => document.getElementById(id));
  const bookSec = $('#book');
  const updateNav = (y) => {
    nav.classList.toggle('is-solid', y > 40);
    const vh = innerHeight;
    let cur = null;
    sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top < vh * 0.5 && r.bottom > vh * 0.5) cur = s.id; });
    navLinks.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + cur));
    const br = bookSec.getBoundingClientRect();
    body.classList.toggle('show-mbar', y > vh * 0.9 && !(br.top < vh && br.bottom > 0));
  };

  /* ---------- marquee ---------- */
  const mTrack = $('.marquee__track');
  let mx = 0, mw = 0;
  const measureMarquee = () => { mw = mTrack.scrollWidth / 2; };
  measureMarquee(); addEventListener('resize', measureMarquee);
  const updateMarquee = (dt) => {
    if (reduce || !mw) return;
    const v = lenis ? Math.abs(lenis.velocity || 0) : 0;
    mx -= (0.035 + Math.min(v, 60) * 0.012) * dt;
    if (-mx >= mw) mx += mw;
    mTrack.style.transform = `translate3d(${mx.toFixed(2)}px,0,0)`;
  };

  /* ---------- parallax ---------- */
  const para = $$('[data-parallax]');
  const updateParallax = () => {
    if (reduce) return;
    const vh = innerHeight;
    para.forEach((img) => {
      const host = img.parentElement.getBoundingClientRect();
      if (host.bottom < -200 || host.top > vh + 200) return;
      const c = host.top + host.height / 2 - vh / 2;
      img.style.transform = `translate3d(0,${(-c * +img.dataset.parallax).toFixed(1)}px,0)`;
    });
  };

  /* ---------- reveal + split ---------- */
  const splitEl = (el) => {
    let n = 0;
    const walk = (node, gold) => {
      Array.from(node.childNodes).forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', n++);
            if (gold) inner.className = 'g';
            w.appendChild(inner); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c, gold || c.tagName === 'EM');
      });
    };
    walk(el, false);
  };
  $$('[data-split]').forEach(splitEl);
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  const revealTargets = $$('[data-reveal],[data-split]');
  const revealAbove = () => revealTargets.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); });
  revealTargets.forEach((el) => io.observe(el));

  /* ---------- videos ---------- */
  const vio = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; if (!reduce) { const p = v.play(); p && p.catch(() => {}); } }
      else v.pause();
    });
  }, { threshold: 0.35 });
  $$('video.autoplay').forEach((v) => { v.muted = true; vio.observe(v); });

  /* ---------- compare sliders ---------- */
  $$('.compare').forEach((c) => {
    const r = $('.compare__range', c);
    const set = (v) => { c.style.setProperty('--pos', v + '%'); r.value = v; };
    r.addEventListener('input', () => { c.dataset.touched = '1'; set(r.value); });
    const cio = new IntersectionObserver((ents) => {
      if (!ents[0].isIntersecting || c.dataset.touched || reduce) return;
      cio.disconnect();
      const start = performance.now();
      const anim = (t) => {
        if (c.dataset.touched) return;
        const k = Math.min(1, (t - start) / 2200);
        set((50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k)).toFixed(1));
        if (k < 1) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }, { threshold: 0.6 });
    cio.observe(c);
  });

  /* ---------- result filters ---------- */
  $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => c.classList.toggle('is-on', c === chip));
    const f = chip.dataset.filter;
    $$('.gallery .card').forEach((card) => card.classList.toggle('is-out', f !== 'all' && card.dataset.cat !== f));
  }));

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  }

  /* ---------- booking (preview: never submits) ---------- */
  const form = $('#booker');
  const vp = $('.booker__viewport', form);
  const steps = $$('.bstep', form);
  const bar = $$('.booker__progress li', form);
  const stepLbl = $('.booker__step b', form);
  const back = $('[data-back]', form), next = $('[data-next]', form);
  let step = 1;
  const names = { brows: 'Brows', lips: 'Lip blush', pmu: 'Permanent makeup', tattoo: 'Tattoo', piercing: 'Piercing' };
  // Live booking: Susu's existing Supabase project (same public RPCs the old site used).
  const LIVE_HOSTS = ['susuinkandglow.com', 'www.susuinkandglow.com'];
  const LIVE = LIVE_HOSTS.includes(location.hostname);
  const SB_URL = 'https://lhjixpxoljebxuxpruaj.supabase.co';
  const SB_KEY = 'sb_publishable_NeQ4q8XSlWF-I1D0I_U-DA_HbHXZYQB';
  const SERVICE_IDS = { brows: 'microblading', lips: 'lip-blush', pmu: 'permanent-makeup', tattoo: 'tattoo', piercing: 'piercing' };
  const rpc = (fn, body) => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(async (r) => { if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) {} throw new Error(m || `Request failed (${r.status})`); } return r.status === 204 ? null : r.json(); });
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (LIVE) {
    let vid; try { vid = sessionStorage.getItem('susu_visitor_id'); if (!vid) { vid = uuid(); sessionStorage.setItem('susu_visitor_id', vid); } } catch (e) { vid = uuid(); }
    const qr = location.pathname.replace(/\/$/, '') === '/q' || new URLSearchParams(location.search).get('source') === 'qr';
    const path = String(location.pathname || '/').slice(0, 180);
    rpc('record_susu_visit', { p_visitor_id: vid, p_source: qr ? 'qr' : 'web', p_path: path.startsWith('/') ? path : '/' }).catch(() => {});
  }
  let idemKey = uuid();
  const services = () => $$('input[name=service]:checked', form).map((i) => i.value);

  // dates
  const dates = $('.dates', form);
  const fmtD = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const fmtM = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const fmtL = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  for (let k = 1; k <= 14; k++) {
    const d = new Date(); d.setDate(d.getDate() + k);
    const lab = document.createElement('label'); lab.className = 'date';
    lab.innerHTML = `<input type="radio" name="date" value="${localISO(d)}" data-label="${fmtL.format(d)}"><small>${fmtD.format(d)}</small><b>${d.getDate()}</b><em>${fmtM.format(d)}</em>`;
    dates.appendChild(lab);
  }

  const syncOnly = () => {
    const s = services();
    $$('[data-only]', form).forEach((el) => el.classList.toggle('is-shown', el.dataset.only.split(' ').some((k) => s.includes(k))));
    const pl = form.querySelector('input[name=place]:checked');
    $$('[data-place]', form).forEach((el) => el.classList.toggle('is-shown', !!pl && pl.value === el.dataset.place));
    const n = s.length, cnt = $('.tiles__count', form);
    if (cnt) cnt.textContent = n ? `${n} selected` : 'Pick one or more';
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'service' || e.target.name === 'place') syncOnly();
    clearErr(e.target.name === 'date' || e.target.name === 'time' ? 'when' : e.target.name === 'health' ? 'adult' : e.target.name);
  });
  form.addEventListener('input', (e) => clearErr(e.target.name));
  const setErr = (k, msg) => {
    const p = form.querySelector(`[data-err="${k}"]`); if (p) p.textContent = msg;
    const f = p && p.closest('.field'); if (f) f.classList.add('has-err');
  };
  const clearErr = (k) => {
    const p = form.querySelector(`[data-err="${k}"]`); if (!p) return;
    p.textContent = ''; const f = p.closest('.field'); if (f) f.classList.remove('has-err');
  };
  const validate = () => {
    let ok = true;
    if (step === 1 && !services().length) { setErr('service', 'Pick at least one service to continue.'); ok = false; }
    if (step === 2) {
      const d = form.querySelector('input[name=date]:checked'), t = form.querySelector('input[name=time]:checked');
      if (!d || !t) { setErr('when', !d && !t ? 'Pick a day and a time of day.' : !d ? 'Pick a day.' : 'Pick a time of day.'); ok = false; }
    }
    if (step === 3) {
      const nm = form.elements['name'].value.trim(), ph = form.elements['phone'].value.replace(/\D/g, '');
      if (nm.length < 2) { setErr('name', 'Add your name.'); ok = false; }
      if (ph.length < 10 || ph.length > 15) { setErr('phone', 'Enter a 10-digit phone number.'); ok = false; }
      const em = form.elements['email'].value.trim();
      if (em && !/^\S+@\S+\.\S+$/.test(em)) { setErr('email', 'Check the email address.'); ok = false; }
      const pl = form.querySelector('input[name=place]:checked');
      if (!pl) { setErr('place', 'Choose where we should meet.'); ok = false; }
      else if (pl.value === 'client') {
        if (!form.elements['street'].value.trim()) { setErr('street', 'Add the street address.'); ok = false; }
        if (!form.elements['city'].value.trim()) { setErr('city', 'Add the city.'); ok = false; }
        if (!form.elements['postalCode'].value.trim()) { setErr('postalCode', 'Add the ZIP.'); ok = false; }
      }
      const h = form.querySelector('[name=health]');
      const hShown = h.closest('[data-only]').classList.contains('is-shown');
      if (!form.elements['adult'].checked) { setErr('adult', "Please confirm you're 18 or older."); ok = false; }
      else if (hShown && !h.checked) { setErr('adult', 'Please confirm, or text me first if one applies.'); ok = false; }
    }
    if (!ok) { const first = form.querySelector('.err:not(:empty)'); first && first.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 320 }); }
    return ok;
  };
  const summary = () => {
    const d = form.querySelector('input[name=date]:checked'), t = form.querySelector('input[name=time]:checked');
    const ig = form.elements['ig'].value.trim();
    const sv = services().map((k) => names[k]);
    const pl = form.querySelector('input[name=place]:checked');
    const where = pl && pl.value === 'client' ? ['street', 'city'].map((k) => form.elements[k].value.trim()).filter(Boolean).join(', ') : 'My place · I\'ll text the location';
    const rows = [[sv.length > 1 ? 'Services' : 'Service', sv.join(', ')], ['When', `${d ? d.dataset.label : ''} · ${t ? t.value : ''}`], ['Where', where], ['Phone', form.elements['phone'].value.trim()]];
    $('.summary', form).innerHTML = rows.map(([a, b]) => `<div><dt>${a}</dt><dd></dd></div>`).join('');
    $$('.summary dd', form).forEach((dd, i) => { dd.textContent = rows[i][1]; });
    const nmv = form.elements['name'].value.trim(); $('.who', form).textContent = nmv ? ', ' + nmv.split(' ')[0] + '.' : '.';
  };
  const go = (n, dir = 1) => {
    const from = vp.offsetHeight;
    vp.style.height = from + 'px';
    steps.forEach((s) => s.classList.remove('is-on', 'is-back'));
    const target = steps.find((s) => +s.dataset.step === n);
    target.classList.add('is-on'); if (dir < 0) target.classList.add('is-back');
    step = n;
    const to = target.offsetHeight;
    requestAnimationFrame(() => { vp.style.height = to + 'px'; });
    setTimeout(() => { vp.style.height = ''; }, 600);
    bar.forEach((li, i) => li.classList.toggle('is-on', i < Math.min(n, 4)));
    stepLbl.textContent = Math.min(n, 4);
    back.hidden = n === 1 || n === 5;
    next.textContent = n === 4 ? 'Send request' : 'Continue';
    form.classList.toggle('is-done', n === 5);
    if (n === 4) summary();
  };
  const payload = () => {
    const sv = services(), v = (k) => String(form.elements[k].value || '').trim();
    const d = form.querySelector('input[name=date]:checked'), t = form.querySelector('input[name=time]:checked');
    const pl = form.querySelector('input[name=place]:checked').value;
    const ig = v('ig');
    const extra = [];
    if (sv.length > 1) extra.push('Services requested: ' + sv.map((k) => names[k]).join(', '));
    if (ig) extra.push('Instagram: ' + (ig[0] === '@' ? ig : '@' + ig));
    if (v('notes')) extra.push(v('notes'));
    return {
      p_idempotency_key: idemKey,
      p_service_id: SERVICE_IDS[sv[0]],
      p_preferred_date: d.value,
      p_preferred_time: t.value,
      p_place: pl,
      p_client_name: v('name'),
      p_phone: v('phone'),
      p_email: v('email') || null,
      p_address: pl === 'client' ? { street: v('street'), city: v('city'), region: v('region'), postalCode: v('postalCode') } : null,
      p_notes: extra.join('\n\n').slice(0, 2000) || null,
      p_marketing_consent: !!form.elements['optin'].checked,
    };
  };
  const send = async () => {
    clearErr('send');
    if (!LIVE) {
      $('.bdone__title', form).textContent = 'Request ready';
      $('.bdone__text', form).textContent = 'This is the preview copy of the site, so nothing was sent. On susuinkandglow.com this request comes straight to me.';
      go(5, 1); return;
    }
    form.classList.add('is-sending'); next.textContent = 'Sending…';
    try {
      await rpc('submit_susu_booking_request', payload());
      $('.bdone__title', form).textContent = 'Request sent';
      $('.bdone__text', form).textContent = "I'll text you to confirm the time, the location and the price. Your appointment isn't booked until I confirm it with you.";
      go(5, 1);
    } catch (err) {
      setErr('send', "That didn't go through. Please try again, or text me at (202) 290-6115.");
      next.textContent = 'Send request';
    } finally { form.classList.remove('is-sending'); }
  };
  next.addEventListener('click', () => { if (!validate()) return; if (step === 4) send(); else go(step + 1, 1); });
  back.addEventListener('click', () => go(step - 1, -1));
  form.addEventListener('submit', (e) => e.preventDefault());
  $('[data-restart]', form).addEventListener('click', () => { form.reset(); idemKey = uuid(); syncOnly(); go(1, -1); });
  function presetService(s) {
    const r = form.querySelector(`input[name=service][value="${s}"]`);
    if (!r) return;
    r.checked = true; syncOnly(); clearErr('service');
    if (step !== 1 && step !== 5) go(1, -1);
    const tile = r.closest('.tile');
    tile && tile.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  /* ---------- frame loop ---------- */
  let last = performance.now();
  const frame = (t) => {
    const dt = Math.min(64, t - last); last = t;
    if (lenis) lenis.raf(t);
    const y = scrollY();
    updateStory();
    updateNav(y);
    updateParallax();
    updateMarquee(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
