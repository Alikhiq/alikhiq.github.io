# v2 carousels: "the alternative to..." hooks, current site screens only, no AI faces. Reuses frame + per-brand CSS from build.py.
import os, build
from build import RC, top, foot, page, HERE
CSS = {k: v[1] for k, v in build.D.items()}
X = """.ph{border-radius:36px;border:10px solid #111;overflow:hidden;box-shadow:0 50px 110px -30px rgba(0,0,0,.8),0 0 0 1.5px rgba(255,255,255,.18);background:#111;position:absolute;z-index:4}
.ph img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1.5px solid currentColor}
.vs>div{padding:38px 22px 38px 0;border-bottom:1px solid rgba(128,128,128,.4);font-size:39px;line-height:1.25}
.vs>div:nth-child(even){padding-left:26px;border-left:1.5px solid currentColor;font-weight:600}
.vs .hd{font:500 21px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;opacity:.75;font-weight:500!important}
.tag{display:inline-block;font:500 21px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;padding:10px 18px;border-radius:40px;border:1.5px solid currentColor}"""

def ph(src, left, topp, w, rot=0, h=None, pos='top'):
    h = h or int((w - 20) * 1.679 + 20)
    return f'<div class="ph" style="left:{left}px;top:{topp}px;width:{w}px;height:{h}px;transform:rotate({rot}deg)"><img src="../sh/{src}.jpg" style="object-position:{pos}"></div>'

def vs(a, b, rows):
    return f'<div class="vs"><div class="hd">{a}</div><div class="hd">{b}</div>' + ''.join(f'<div>{x}</div><div>{y}</div>' for x, y in rows) + '</div>'

D = {}

# ── HNY (premium): the Toast alternative ──
N = 6; T = lambda: top('#FFF4E6', 'HNY')
D['02-hny-collab'] = ('HNY', CSS['02-hny-collab'] + X, [
  f'<img class="bg" src="../p/hny-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(13,11,11,.8) 0%,rgba(13,11,11,.15) 38%,rgba(13,11,11,.3) 58%,rgba(13,11,11,.96) 100%)"></div>{T()}'
  f'<div class="c h" style="left:72px;right:72px;bottom:150px"><div class="label amb" style="margin-bottom:22px">Halal New York Gyro · Columbus</div><h1 style="font-size:138px">They didn’t<br>buy Toast.<br><span class="red">They own this.</span></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:radial-gradient(100% 70% at 80% 0%,#2a1712 0%,#0d0b0b 65%)"></div>{T()}'
  f'<div class="c h" style="left:72px;right:72px;top:180px"><h2 style="margin-bottom:44px">Rented software<br>vs. <span class="amb">their own.</span></h2>'
  + vs('Off-the-shelf POS', 'Built for HNY', [('Made for every restaurant', 'Made around five trailers'), ('You adapt to the software', 'The software adapts to the kitchen'), ('A support queue', 'One local builder who picks up'), ('Changes when the vendor decides', 'Changes when the owner asks')]) +
  f'</div>{foot(2,N)}',
  f'<img class="bg" src="../p/hny-a.jpg" style="filter:blur(18px) brightness(.32);transform:scale(1.15)">{T()}'
  f'<div class="c h" style="left:72px;right:72px;top:180px"><h2>The front door.</h2><p style="margin-top:18px">A bilingual site: menu, catering, and a pickup trailer to choose.</p></div>'
  + ph('x-hny-home', 40, 610, 330, -4) + ph('x-hny-menu', 375, 520, 330, 0) + ph('x-hny-loc', 710, 610, 330, 4) +
  f'<div class="c h" style="left:72px;bottom:130px"><span class="status amb" style="background:rgba(13,11,11,.8)">Live · halalnygyro.com</span></div>{foot(3,N)}',
  f'<img class="bg" src="../p/hny-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(13,11,11,.92) 0%,rgba(13,11,11,.55) 38%,rgba(13,11,11,.2) 60%,rgba(13,11,11,.85) 100%)"></div>{T()}'
  f'<div class="c h" style="left:72px;right:72px;top:180px"><h2>Every order<br>has a <span class="amb">status.</span></h2><p style="margin-top:16px">Private ordering and kitchen software, behind the site.</p></div>'
  f'<div class="c tix" style="left:72px;right:60px;top:690px">'
  f'<div class="tk" style="transform:rotate(-3deg)"><span class="k">Step 1</span><b>Request</b>Customer sends the order</div>'
  f'<div class="tk" style="transform:rotate(1.5deg);margin-top:30px"><span class="k">Step 2</span><b>Approved</b>Accepted with its price</div>'
  f'<div class="tk" style="transform:rotate(-1deg)"><span class="k">Step 3</span><b>Kitchen</b>Shared prep status</div>'
  f'<div class="tk" style="transform:rotate(2.5deg);margin-top:40px"><span class="k">Step 4</span><b>Done</b>Fulfilled and on record</div></div>{foot(4,N)}',
  f'<div class="shade" style="background:radial-gradient(100% 70% at 20% 0%,#2a1712 0%,#0d0b0b 65%)"></div>{T()}'
  f'<div class="c h" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:50px">The owner stays<br>in <span class="red">control.</span></h2>'
  f'<div class="li"><span>01</span>Catalog and price controls</div>'
  f'<div class="li"><span>02</span>Accepted orders keep their price when the menu changes</div>'
  f'<div class="li"><span>03</span>Records the owner can review</div>'
  f'<div class="li" style="border-bottom:2px solid rgba(255,181,71,.4)"><span>04</span>Period reports, ready to export</div></div>{foot(5,N)}',
  f'<img class="bg" src="../p/hny-b.jpg" style="filter:brightness(.4)"><div class="shade" style="background:linear-gradient(0deg,rgba(13,11,11,.95) 10%,rgba(13,11,11,.3) 70%)"></div>{T()}'
  f'<div class="c h" style="left:72px;right:72px;bottom:170px"><h1 style="font-size:112px">One builder.<br>Local.<br><span class="amb">Not corporate.</span></h1><p style="margin-top:26px">Want a system that fits your restaurant? Talk with Ali.</p><p style="margin-top:22px;color:#FFB547;font:500 36px Inter Tight">roundcity.co</p></div>{foot(6,N,"Link in bio")}',
])

# ── Blite (most premium): not a template store ──
N = 6; T = lambda c='#141416': top(c, 'Blite')
D['03-blite-collab'] = ('Blite', CSS['03-blite-collab'] + X, [
  f'<img class="bg" src="../p/blite-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(244,239,231,.0) 40%,rgba(244,239,231,.95) 74%)"></div>{T()}'
  f'<div class="c b" style="left:72px;right:72px;bottom:150px"><div class="label ox" style="margin-bottom:22px">Blite · Sterling Heights</div><h1 style="font-size:118px">Not a template store.<br><span class="ox">A fitting room.</span></h1></div>{foot(1,N,"Swipe →")}',
  f'{T()}<div class="c b" style="left:72px;right:72px;top:180px"><h2>Eighty looks.<br>Four occasions.</h2><p style="margin-top:16px">Casual, formal, wedding, tuxedo. Built around pieces in the store.</p></div>'
  f'<div class="c frame" style="left:72px;right:72px;top:560px;border-radius:14px"><div class="bar"><i></i><i></i><i></i></div><img src="../sh/blite-d1.jpg"></div>'
  f'<div class="c b" style="left:72px;bottom:130px"><span class="status ox">Live · blite.app</span></div>{foot(2,N)}',
  f'<img class="bg" src="../p/blite-b.jpg"><div class="shade" style="background:rgba(20,6,10,.45)"></div>{T("#F6F3EE")}'
  f'<div class="c b" style="left:72px;right:72px;top:180px;color:#F6F3EE"><h2>Shop the floor<br>from your phone.</h2></div>'
  + ph('x-blite-shop', 80, 430, 450, -3) + ph('x-blite-product', 550, 500, 450, 3) + foot(3, N),
  f'{T()}<div class="c b" style="left:72px;right:72px;top:180px"><h2>Book a fitting.<br>Or measure at home.</h2><p style="margin-top:16px">The store confirms every booking by phone or text.</p></div>'
  + ph('x-blite-book', 80, 500, 450, -3) + ph('x-blite-measure', 550, 570, 450, 3) + foot(4, N),
  f'<img class="bg" src="../p/blite-a.jpg" style="filter:blur(14px);transform:scale(1.1)"><div class="shade" style="background:rgba(244,239,231,.72)"></div>{T()}'
  f'<div class="c b" style="left:72px;width:500px;top:230px"><h2>“What are you dressing for?”</h2><p style="margin-top:26px">Tell the stylist the occasion and the date. It pulls complete looks from the store.</p></div>'
  + ph('x-blite-fit-2', 570, 330, 450, 3) + foot(5, N),
  f'<img class="bg" src="../p/blite-a.jpg" style="object-position:30% 50%"><div class="shade" style="background:rgba(244,239,231,.6)"></div>{T()}'
  f'<div class="c b" style="left:72px;right:72px;top:400px;text-align:center"><img src="../blite-wordmark.svg" style="width:560px;filter:invert(1)"><p style="margin:44px 0 38px;color:#141416">Visit us in Sterling Heights</p><span class="btn">Visit blite.app</span>'
  f'<p style="margin-top:70px;font-size:27px">Built for one store by one local builder.<br>Round City · roundcity.co</p></div>{foot(6,N,"blite.app")}',
])

# ── Susu (most premium): owns her booking ──
U = '../susu/'; N = 6; T = lambda c='#F7EEE6': top(c, 'Susu Ink & Glow')
D['04-susu-collab'] = ('Susu', CSS['04-susu-collab'] + X, [
  f'<img class="bg" src="../p/susu-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(42,26,28,.25) 0%,rgba(42,26,28,.78) 62%,rgba(42,26,28,.95) 100%)"></div>{T()}'
  f'<div class="c u" style="left:0;right:0;top:210px;text-align:center"><img src="{U}susu-logo-gold.svg" style="width:430px"></div>'
  f'<div class="c u" style="left:72px;right:72px;bottom:150px"><h1 style="font-size:104px">Booking apps rent you a page. <i>Susu owns hers.</i></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:radial-gradient(110% 80% at 50% 0%,#4a2c2c 0%,#2a1a1c 65%)"></div>{T()}'
  f'<div class="c u" style="left:72px;right:72px;top:180px"><h2 style="margin-bottom:44px">A page on an app<br>vs. <i>her own studio.</i></h2>'
  + vs('Salon booking app', 'Built for Susu', [('A profile next to everyone else', 'susuinkandglow.com, hers alone'), ('Their layout, their brand', 'Her gold logo, her voice'), ('Fixed booking steps', 'Pick one service or several'), ('Their system holds the clients', 'Bookings land in her own system')]) +
  f'</div>{foot(2,N)}',
  f'<img class="bg" src="../p/susu-b.jpg" style="filter:brightness(.35) blur(6px);transform:scale(1.1)">{T()}'
  f'<div class="c u" style="left:72px;right:72px;top:180px"><h2>Drawn in gold,<br><i>service by service.</i></h2></div>'
  + ph('x-susu-home-3', 40, 590, 330, -4) + ph('x-susu-home-2', 375, 510, 330, 0) + ph('x-susu-home', 710, 590, 330, 4) +
  f'<div class="c u" style="left:72px;bottom:130px"><span class="status" style="color:#E7B98C;background:rgba(42,26,28,.8)">Live · susuinkandglow.com</span></div>{foot(3,N)}',
  f'<div class="shade" style="background:#241617"></div>{T()}'
  f'<div class="c u" style="left:72px;width:480px;top:240px"><h2>Book in<br><i>four steps.</i></h2><p style="margin-top:28px">Brows, lip blush, PMU, tattoo, piercing. Pick one or several.</p><p style="margin-top:28px">$100 deposit for permanent makeup. Susu texts to confirm.</p></div>'
  + ph('x-susu-book', 560, 300, 460, 3) + foot(4, N),
  f'<img class="bg" src="{U}susu-portrait.webp" style="object-position:50% 20%"><div class="shade" style="background:linear-gradient(0deg,rgba(42,26,28,.96) 0%,rgba(42,26,28,.5) 30%,rgba(42,26,28,0) 52%)"></div>{T()}'
  f'<div class="c u" style="left:72px;right:72px;bottom:150px"><div class="q">“I’ll text you to confirm.”</div><p style="margin-top:22px">Clear starting prices, in her own words. One artist, start to finish.</p></div>{foot(5,N)}',
  f'<img class="bg" src="../p/susu-b.jpg" style="transform:scaleX(-1)"><div class="shade" style="background:rgba(42,26,28,.66)"></div>{T()}'
  f'<div class="c u" style="left:72px;right:72px;top:380px;text-align:center"><img src="{U}susu-logo-gold.svg" style="width:480px"><h2 style="margin-top:56px;font-size:72px">susuinkandglow.com</h2>'
  f'<p style="margin-top:26px">Columbus, Ohio · By appointment</p><p style="margin-top:50px;font-size:28px">Own your booking too. One local builder.<br>Round City · roundcity.co</p></div>{foot(6,N,"@susuinkandglow")}',
])

# ── Round City ad: stop renting software that doesn't fit ──
N = 6; T = lambda: top('#F3EEE3')
D['01-roundcity-ad'] = ('RC ad', CSS['01-roundcity-ad'] + X, [
  f'<img class="bg" src="../p/rc-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(11,18,30,.9) 0%,rgba(11,18,30,.4) 46%,rgba(11,18,30,0) 60%,rgba(11,18,30,.6) 100%)"></div>{T()}'
  f'<div class="c rc" style="left:72px;right:72px;top:190px"><div class="label" style="color:var(--gold);margin-bottom:30px">Software + automation · Columbus</div><h1 style="font-size:124px">Stop renting software that <em>doesn’t fit.</em></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:radial-gradient(120% 80% at 80% 0%,#16243b 0%,#0b121e 60%)"></div>{T()}'
  f'<div class="c rc" style="left:72px;right:72px;top:180px"><h2 style="margin-bottom:40px">Instead of the usual, they got <em style="color:var(--gold)">their own.</em></h2>'
  + vs('Instead of', 'We built', [('A one-size POS', 'HNY’s ordering + kitchen system'), ('A salon booking app', 'Susu’s own site and booking'), ('A template store', 'Blite’s Fitting Room'), ('A page builder', 'A site made for your business')]) +
  f'</div>{foot(2,N)}',
  f'<div class="shade" style="background:#0b121e"></div>{T()}'
  f'<div class="c rc" style="left:72px;right:72px;top:180px"><h2>Real businesses.<br><em style="color:var(--gold)">Live today.</em></h2></div>'
  + ph('x-hny-home', 40, 590, 330, -4) + ph('x-blite-shop', 375, 510, 330, 0) + ph('x-susu-home', 710, 590, 330, 4) +
  f'<div class="c rc" style="left:72px;right:72px;bottom:120px;font:500 21px JetBrains Mono;letter-spacing:.1em;color:rgba(243,238,227,.75);text-transform:uppercase;background:#0b121e;padding:8px 0">Halal New York Gyro · Blite · Susu Ink &amp; Glow</div>{foot(3,N)}',
  f'<img class="bg" src="../p/rc-b.jpg" style="object-position:70% 50%"><div class="shade" style="background:linear-gradient(90deg,rgba(11,18,30,.97) 0%,rgba(11,18,30,.9) 60%,rgba(11,18,30,.4) 100%)"></div>{T()}'
  f'<div class="c rc" style="left:72px;width:800px;top:230px"><h1 style="font-size:116px">One builder.<br>Local.<br><em>Not corporate.</em></h1><p style="margin-top:40px">Ali learns your workflow, builds around it, tests it with your team and stays through the handover.</p></div>{foot(4,N)}',
  f'<div class="shade" style="background:radial-gradient(120% 80% at 20% 0%,#16243b 0%,#0b121e 60%)"></div>{T()}'
  f'<div class="c rc" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:40px">Clear prices, in writing.</h2>'
  f'<div class="row"><b>Custom software + systems</b><span>Custom quote</span></div>'
  f'<div class="row"><b>Websites</b><span>From $3,500</span></div>'
  f'<div class="row"><b>Food carts + trucks</b><span>From $1,499</span></div>'
  f'<div class="row"><b>Content + campaigns</b><span>From $1,750</span></div>'
  f'<div class="row" style="border-bottom:1px solid rgba(207,164,59,.35)"><b>Brand + graphic system</b><span>$4,500</span></div></div>{foot(5,N)}',
  f'<div class="shade" style="background:var(--navy)"></div>{T()}'
  f'<div class="c rc" style="left:72px;right:72px;top:260px"><div style="width:150px;height:150px;margin-bottom:60px">{RC}</div><h1 style="font-size:100px">Tell us what’s slowing your business down.</h1>'
  f'<p style="margin-top:44px;color:var(--gold);font:500 40px Inter Tight">Talk with Ali · roundcity.co</p><p style="margin-top:14px;font-size:28px">(614) 618-4644 · ali@roundcity.co<br>Columbus, Ohio · Dearborn &amp; Sterling Heights, Michigan</p></div>{foot(6,N,"Link in bio")}',
])

# ── MoTintKing (standard) ──
N = 4; T = lambda: top('#F5F5F7', 'MoTintKing')
D['05-motintking-collab'] = ('MoTint', CSS['05-motintking-collab'] + X, [
  f'<img class="bg" src="../p/motint-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(7,7,8,.6) 0%,rgba(7,7,8,0) 35%,rgba(7,7,8,0) 50%,rgba(7,7,8,.96) 100%)"></div>{T()}'
  f'<div class="c m" style="left:72px;right:72px;bottom:150px"><h1 style="font-size:104px">A tint shop<br>shouldn’t look<br>like a <span class="red">template.</span></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:#0b0b0d"></div>{T()}'
  f'<div class="c" style="left:170px;right:170px;top:170px"><img src="../motint-brand.webp" style="width:100%;border-radius:10px;display:block"></div>'
  f'<div class="c m" style="left:72px;right:72px;bottom:150px"><h2>Its own identity.</h2><p style="margin-top:14px">Logo system, website, service pages and a quote journey.</p></div>{foot(2,N)}',
  f'<img class="bg" src="../p/motint-a.jpg" style="filter:blur(10px) brightness(.35);transform:scale(1.1)">{T()}'
  f'<div class="c m" style="left:72px;right:72px;top:220px"><h2>Built for<br>the bay <span class="red">too.</span></h2><p style="margin-top:30px;max-width:860px">An owner dashboard and a bay board, tested against the shop’s real workflow before they go live.</p>'
  f'<div style="margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:20px">' + ''.join(f'<div style="border:1.5px solid rgba(255,255,255,.3);border-radius:12px;padding:30px;font:700 30px Archivo;font-stretch:125%;text-transform:uppercase">{t}<div style="font:400 22px JetBrains Mono;letter-spacing:.1em;color:#FF2D2D;margin-top:14px">{s}</div></div>' for t, s in [('Quote', 'New lead'), ('Scheduled', 'Bay assigned'), ('In the bay', 'Install'), ('Ready', 'Pickup')]) + '</div>'
  f'<div style="margin-top:40px"><span class="status">Owner tools · in development</span></div></div>{foot(3,N)}',
  f'<img class="bg" src="../p/motint-b.jpg" style="filter:brightness(.35)">{T()}'
  f'<div class="c m" style="left:72px;right:72px;top:440px"><h1 style="font-size:96px">Built with<br>MoTintKing.</h1><p style="margin-top:30px">One local builder, not an agency retainer.</p><p style="margin-top:30px;color:#FF2D2D;font:600 36px Inter Tight">roundcity.co</p></div>{foot(4,N,"Link in bio")}',
])

# ── Makeup by Aya (standard, no faces) ──
N = 4; T = lambda: top('#3b2a26', 'Makeup by Aya')
D['06-aya-collab'] = ('Aya', CSS['06-aya-collab'] + X, [
  f'<img class="bg" src="../p/aya-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(251,246,240,.0) 38%,rgba(251,246,240,.96) 72%)"></div>{T()}'
  f'<div class="c a" style="left:72px;right:72px;bottom:150px"><h1>Bridal bookings shouldn’t <i>live in DMs.</i></h1></div>{foot(1,N,"Swipe →")}',
  f'<img class="bg" src="../p/aya-b.jpg"><div class="shade" style="background:rgba(251,246,240,.8)"></div>{T()}'
  f'<div class="c a" style="left:72px;right:72px;top:200px"><h2 style="margin-bottom:46px">A request that starts <i>a conversation.</i></h2>'
  f'<div class="st"><span>i</span><div><b>Choose the occasion</b><p>Bridal or event, each with its own page</p></div></div>'
  f'<div class="st"><span>ii</span><div><b>Send a guided request</b><p>Date, party and details in one place</p></div></div>'
  f'<div class="st" style="border-bottom:1px solid rgba(181,112,122,.4)"><span>iii</span><div><b>Aya replies</b><p>A request, not an automatic booking</p></div></div></div>{foot(2,N)}',
  f'<img class="bg" src="../p/aya-a.jpg" style="filter:blur(16px);transform:scale(1.1)"><div class="shade" style="background:rgba(251,246,240,.62)"></div>{T()}'
  f'<div class="c a" style="left:72px;right:72px;top:240px"><h2>The whole bridal party, <i>organized.</i></h2><p style="margin-top:34px;max-width:860px">A guest flow for the party, plus Aya’s own workspace for requests and the calendar.</p></div>'
  f'<div class="c a" style="left:72px;right:72px;bottom:190px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">' + ''.join(f'<div style="background:#fff;border-radius:16px;padding:34px 24px;text-align:center;box-shadow:0 20px 40px -26px rgba(59,42,38,.4)"><div style="font:italic 400 50px Cormorant Garamond;color:#B5707A">{a}</div><div style="font:500 26px Inter Tight;margin-top:8px">{b}</div></div>' for a, b in [('Bride', 'Request'), ('Party', 'Guest flow'), ('Aya', 'Calendar')]) + f'</div>{foot(3,N)}',
  f'<img class="bg" src="../p/aya-b.jpg"><div class="shade" style="background:rgba(251,246,240,.72)"></div>{T()}'
  f'<div class="c a" style="left:72px;right:72px;top:440px;text-align:center"><h1>Makeup by Aya</h1><p style="margin-top:30px">Her own website and request software, by Round City.</p><p style="margin-top:26px;color:#B5707A"><span class="status">Public preview</span></p><p style="margin-top:34px;color:#B5707A;font:500 36px Inter Tight">roundcity.co</p></div>{foot(4,N,"Link in bio")}',
])

# ── Valentina Luxe (standard) ──
D['07-valentina-collab'] = build.D['07-valentina-collab']

# ── EveryWrap (standard) ──
css = """.e{--bg:#0c0c0c;--fg:#F4F1EA;font-family:'Inter Tight'}
.e h1{font:400 132px/.92 'Anton';text-transform:uppercase}.e h2{font:400 88px/.95 'Anton';text-transform:uppercase}
.e p{font:400 32px/1.45 'Inter Tight';color:rgba(244,241,234,.8)}.e .or{color:#FF5A1F}"""
N = 4; T = lambda: top('#F4F1EA', 'EveryWrap')
D['09-everywrap'] = ('EveryWrap', css + X, [
  f'<img class="bg" src="../p/ew-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(12,12,12,.75) 0%,rgba(12,12,12,.1) 40%,rgba(12,12,12,.95) 100%)"></div>{T()}'
  f'<div class="c e" style="left:72px;right:72px;bottom:150px"><h1>I ran a wrap shop.<br><span class="or">Then built its site.</span></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:#0c0c0c"></div>{T()}<div class="c e" style="left:72px;right:72px;top:180px"><h2>Real cars.<br><span class="or">Real work.</span></h2><p style="margin-top:16px">Original vehicle photography, service choices and a project brief.</p></div>'
  + ph('x-everywrap-home', 80, 500, 450, -3) + ph('x-everywrap-home-2', 550, 570, 450, 3) + foot(2, N),
  f'<img class="bg" src="../p/ew-a.jpg" style="filter:blur(12px) brightness(.4);transform:scale(1.1)">{T()}'
  f'<div class="c e" style="left:72px;right:72px;top:230px"><h2>Why it matters<br>for <span class="or">your shop.</span></h2><p style="margin-top:34px;max-width:880px">The person building your automotive site has done the installs, quoted the jobs and talked to the customers.</p><p style="margin-top:40px"><span class="status or">Live · everywrap.com</span></p></div>{foot(3,N)}',
  f'<div class="shade" style="background:#FF5A1F"></div>{top("#0c0c0c","EveryWrap")}'
  f'<div class="c e" style="left:72px;right:72px;top:420px;color:#0c0c0c"><h1 style="font-size:120px">Built from<br>inside the<br>trade.</h1><p style="margin-top:30px;color:#0c0c0c;font-weight:500">Automotive websites and shop software by Round City · roundcity.co</p></div>{foot(4,N,"Link in bio",color="#0c0c0c")}',
])

# ── @614lux personal ──
N = 5; T = lambda: top('#EDEAE4', '@614lux')
D['08-614lux-personal'] = ('614lux', CSS['08-614lux-personal'] + X, [
  f'<img class="bg" src="../p/lux-a.jpg"><div class="shade" style="background:linear-gradient(0deg,rgba(12,12,12,.96) 0%,rgba(12,12,12,.45) 48%,rgba(12,12,12,.2) 100%)"></div>{T()}'
  f'<div class="c l" style="left:72px;right:72px;bottom:150px"><div class="mono" style="margin-bottom:24px">Field notes · Ali Al-Khafaji</div><h1>I’m the one guy<br>businesses hire<br><i>instead of another subscription.</i></h1></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:#0c0c0c"></div>{T()}'
  f'<div class="c l" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:44px">What I built <i>instead.</i></h2>'
  + vs('They could have used', 'I built them', [('A one-size POS', 'HNY: ordering + kitchen system'), ('A salon booking app', 'Susu: her own site and booking'), ('A template store', 'Blite: the Fitting Room'), ('An agency retainer', 'MoTintKing: identity + website')]) +
  f'</div>{foot(2,N)}',
  f'<img class="bg" src="../p/lux-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(12,12,12,.2) 0%,rgba(12,12,12,.95) 72%)"></div>{T()}'
  f'<div class="c l" style="left:72px;right:72px;bottom:160px"><h2>The person learning the workflow also <i>shapes the solution.</i></h2><p style="margin-top:28px">Founder &amp; Forward Deployed Engineer, Round City.</p></div>{foot(3,N)}',
  f'<div class="shade" style="background:#0c0c0c"></div>{T()}'
  f'<div class="c l" style="left:72px;right:72px;top:200px"><h2 style="margin-bottom:60px">How I work.</h2>'
  + ''.join(f'<div style="display:grid;grid-template-columns:120px 1fr;padding:34px 0;border-top:1px solid rgba(237,234,228,.2)"><div class="mono" style="color:var(--gold);font-size:28px">{n}</div><div><div style="font:400 50px Instrument Serif">{t}</div><p style="margin-top:8px">{d}</p></div></div>' for n, t, d in [('01', 'Understand', 'I talk with the people doing the work and map the friction.'), ('02', 'Scope, build + test', 'Scope, responsibilities and price in writing, then real-scenario tests.'), ('03', 'Deploy + handover', 'I put it into daily use and document the handoff.')]) +
  f'</div>{foot(4,N)}',
  f'<img class="bg" src="../p/lux-b.jpg" style="filter:brightness(.45)">{T()}'
  f'<div class="c l" style="left:72px;right:72px;top:430px"><h1 style="font-size:96px">Local.<br><i>Not corporate.</i></h1><p style="margin-top:34px">Columbus · Ohio, Southeast Michigan and remote.<br>Tell me what’s slowing your business down.</p><p style="margin-top:20px;color:var(--gold);font:500 36px Inter Tight">roundcity.co · @roundcity.co</p></div>{foot(5,N,"Link in bio")}',
])

os.makedirs(os.path.join(HERE, 'decks2'), exist_ok=True)
for k, (t, css, slides) in D.items():
    open(os.path.join(HERE, 'decks2', k + '.html'), 'w').write(page(t, css, slides))
print(len(D), 'decks', sum(len(v[2]) for v in D.values()), 'slides')
