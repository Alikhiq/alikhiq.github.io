# Builds one HTML file per carousel (slides are 1080x1350 .s elements); shoot.js screenshots each slide.
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
RC = open(os.path.join(HERE, 'icon.svg')).read()
RC = re.sub(r'<\?xml.*?\?>|<title>.*?</title>|<!--.*?-->', '', RC, flags=re.S)

BASE = """
<link rel="stylesheet" href="../fonts.css">
<style>
:root{--navy:#0F1B2D;--gold:#CFA43B;--lapis:#2B4C8C}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#111;width:1080px}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;color:var(--fg);background:var(--bg)}
.foot,.top{color:var(--fg)}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.shade{position:absolute;inset:0}
.grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
/* shared Round City frame: lockup top-left, counter + url bottom */
.top{position:absolute;left:72px;right:72px;top:64px;display:flex;align-items:center;gap:16px;font:500 21px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;z-index:5}
.top svg{width:40px;height:40px;flex:none}
.top .x{opacity:.55}
.foot{position:absolute;left:72px;right:72px;bottom:58px;display:flex;justify-content:space-between;font:500 20px 'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;z-index:5;opacity:.8}
.c{position:absolute;z-index:4}
.label{font:500 22px 'JetBrains Mono',monospace;letter-spacing:.16em;text-transform:uppercase}
.status{display:inline-block;border:1.5px solid currentColor;border-radius:40px;padding:8px 18px;font:500 19px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
.frame{border-radius:18px;overflow:hidden;box-shadow:0 50px 120px -30px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.14)}
.frame img{display:block;width:100%}
.bar{height:34px;background:#1b1d22;display:flex;gap:9px;align-items:center;padding:0 16px}
.bar i{width:11px;height:11px;border-radius:50%;background:#3a3d44;display:block}
</style>"""

def top(theme, client=None):
    who = f'Round City <span class="x">×</span> {client}' if client else 'Round City'
    return f'<div class="top" style="color:{theme}">{RC}<span>{who}</span></div>'

def foot(n, N, right='roundcity.co', color='inherit'):
    return f'<div class="foot" style="color:{color}"><span>{n:02d} / {N:02d}</span><span>{right}</span></div>'

def page(title, css, slides):
    cls = css.strip().split('{')[0].lstrip('.')
    body = ''.join(f'<section class="s" id="s{i+1}">{s}<div class="grain"></div></section>' for i, s in enumerate(slides))
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>{BASE}<style>{css}</style></head><body class="{cls}">{body}</body></html>'

def browser(src, w):
    return f'<div class="frame" style="width:{w}px"><div class="bar"><i></i><i></i><i></i></div><img src="{src}"></div>'

D = {}

# 1 ── @roundcity.co ad: "The workbench". Sculptural still life, navy + gold, Instrument Serif.
css = """.rc{--bg:#0b121e;--fg:#F3EEE3;font-family:'Inter Tight',sans-serif}
.rc h1{font:400 112px/0.98 'Instrument Serif',serif;letter-spacing:-.01em}
.rc h1 em{color:var(--gold)}
.rc h2{font:400 84px/1.0 'Instrument Serif',serif}
.rc p{font:400 34px/1.42 'Inter Tight';color:rgba(243,238,227,.82)}
.rc .row{display:grid;grid-template-columns:1fr auto;align-items:baseline;border-top:1px solid rgba(207,164,59,.35);padding:30px 0}
.rc .row b{font:500 44px 'Inter Tight';letter-spacing:-.01em}.rc .row span{font:400 52px 'Instrument Serif';color:var(--gold)}
.rc .row small{grid-column:1/-1;font:400 26px 'Inter Tight';color:rgba(243,238,227,.62);margin-top:6px}
.rc .step{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:34px 0;border-top:1px solid rgba(207,164,59,.35)}
.rc .step .n{font:400 64px/1 'Instrument Serif';color:var(--gold)}
.rc .step b{font:500 42px/1.15 'Inter Tight';display:block;margin-bottom:10px}
.rc .flow{display:flex;flex-direction:column;gap:22px}
.rc .flow div{display:flex;justify-content:space-between;align-items:center;border:1.5px solid rgba(207,164,59,.55);border-radius:14px;padding:30px 36px;font:500 40px 'Inter Tight';background:rgba(15,27,45,.72)}
.rc .flow div span{font:500 22px 'JetBrains Mono';letter-spacing:.12em;color:var(--gold);text-transform:uppercase}
.rc .arrow{font:400 46px 'Instrument Serif';color:var(--gold);text-align:center;margin:-8px 0}"""
N = 6
D['01-roundcity-ad'] = ('Round City ad', css, [
  f'<img class="bg" src="../p/rc-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(11,18,30,.88) 0%,rgba(11,18,30,.35) 46%,rgba(11,18,30,0) 60%,rgba(11,18,30,.6) 100%)"></div>{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;right:72px;top:190px"><div class="label" style="color:var(--gold);margin-bottom:34px">Software + automation</div><h1>Software that fits the way <em>you</em> work.</h1><p style="margin-top:34px;max-width:780px">Custom software, connected systems and workflow automation, built around your team and daily operations.</p></div>'
  f'{foot(1,N,"Swipe →")}',
  f'<img class="bg" src="../p/rc-b.jpg" style="object-position:70% 50%"><div class="shade" style="background:linear-gradient(90deg,rgba(11,18,30,.97) 0%,rgba(11,18,30,.9) 55%,rgba(11,18,30,.35) 100%)"></div>{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;width:780px;top:200px"><h2 style="margin-bottom:46px">From the workflow to a working handoff.</h2>'
  f'<div class="step"><div class="n">01</div><div><b>Understand</b><p>Talk with the people doing the work and map the friction.</p></div></div>'
  f'<div class="step"><div class="n">02</div><div><b>Scope, build + test</b><p>Confirm scope and price, then test against real scenarios.</p></div></div>'
  f'<div class="step"><div class="n">03</div><div><b>Deploy + handover</b><p>Document the handoff, with the support included in the scope.</p></div></div></div>{foot(2,N)}',
  f'<div class="shade" style="background:radial-gradient(120% 80% at 80% 0%,#16243b 0%,#0b121e 60%)"></div>{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:40px">What needs to work better?</h2>'
  f'<div class="row"><b>Custom software + systems</b><span>Custom quote</span></div>'
  f'<div class="row"><b>Websites</b><span>From $3,500</span><small>Mobile-first design and a direct path to inquiry</small></div>'
  f'<div class="row"><b>Food carts + trucks</b><span>From $1,499</span><small>Logo refresh and a mobile website for your menu</small></div>'
  f'<div class="row"><b>Content + campaigns</b><span>From $1,750</span><small>Short videos, graphics and captions from your footage</small></div>'
  f'<div class="row" style="border-bottom:1px solid rgba(207,164,59,.35)"><b>Brand + graphic system</b><span>$4,500</span></div></div>{foot(3,N)}',
  f'<div class="shade" style="background:#0b121e"></div>{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;right:72px;top:180px"><h2>Different businesses.<br><em style="color:var(--gold)">Distinct work.</em></h2></div>'
  f'<div class="c" style="left:72px;top:470px;transform:rotate(-2deg)">{browser("../hny-website-live-20261016.jpg",600)}</div>'
  f'<div class="c" style="right:60px;top:640px;transform:rotate(2.5deg)">{browser("../blite-new-arrivals-live-20261016.jpg",560)}</div>'
  f'<div class="c" style="left:120px;top:900px;transform:rotate(-1deg)">{browser("../aya-public-preview-20261016.jpg",560)}</div>'
  f'<div class="c rc" style="left:72px;right:72px;top:380px;font:500 22px JetBrains Mono;letter-spacing:.1em;color:rgba(243,238,227,.7);text-transform:uppercase">Halal New York Gyro · Blite Fashion · Makeup by Aya (public preview)</div>{foot(4,N)}',
  f'<img class="bg" src="../p/rc-a.jpg" style="filter:blur(14px) brightness(.45);transform:scale(1.1)">{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;right:72px;top:190px"><div class="label" style="color:var(--gold);margin-bottom:26px">Example workflow</div><h2 style="margin-bottom:56px">Less chasing.<br>Clearer responsibility.</h2>'
  f'<div class="flow"><div>New request<span>Customer input</span></div><div class="arrow">↓</div><div>Owner review<span>Decision point</span></div><div class="arrow">↓</div><div>Next action<span>Clear handoff</span></div></div></div>{foot(5,N)}',
  f'<div class="shade" style="background:var(--navy)"></div>{top("#F3EEE3")}'
  f'<div class="c rc" style="left:72px;right:72px;top:260px"><div style="width:150px;height:150px;margin-bottom:60px">{RC}</div><h1 style="font-size:100px">Tell us what’s slowing your business down.</h1>'
  f'<p style="margin-top:44px;color:var(--gold);font:500 40px Inter Tight">Talk with Ali · roundcity.co</p><p style="margin-top:14px;font-size:28px">(614) 618-4644 · ali@roundcity.co<br>Columbus, Ohio · Dearborn &amp; Sterling Heights, Michigan</p></div>{foot(6,N,"Link in bio")}',
])

# 2 ── Halal New York Gyro: "Night shift". Wet street + kitchen pass, Anton, red/amber tickets.
css = """.h{--bg:#0d0b0b;--fg:#FFF4E6;font-family:'Inter Tight'}
.h h1{font:400 150px/.9 'Anton',sans-serif;text-transform:uppercase;letter-spacing:.005em}
.h h2{font:400 96px/.95 'Anton';text-transform:uppercase}
.h p{font:400 34px/1.4 'Inter Tight';color:rgba(255,244,230,.82)}
.h .red{color:#FF4A3D}.h .amb{color:#FFB547}
.tix{display:flex;gap:22px;align-items:flex-start}
.tk{width:212px;background:#FFF8EC;color:#1b1412;border-radius:4px;padding:26px 20px 34px;font:500 24px/1.35 'JetBrains Mono';box-shadow:0 30px 60px -20px rgba(0,0,0,.8);position:relative}
.tk:before{content:'';position:absolute;top:-14px;left:50%;width:56px;height:24px;margin-left:-28px;background:#b88a3a;border-radius:3px}
.tk b{display:block;font:400 40px/1 'Anton';text-transform:uppercase;margin:14px 0 10px}
.tk .k{font-size:18px;letter-spacing:.12em;color:#b4321f}
.h .li{display:flex;gap:26px;padding:30px 0;border-top:2px solid rgba(255,181,71,.4);font:500 40px/1.2 'Inter Tight'}
.h .li span{font:400 40px 'Anton';color:#FFB547;width:70px;flex:none}"""
N = 5
D['02-hny-collab'] = ('HNY collab', css, [
  f'<img class="bg" src="../p/hny-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(13,11,11,.75) 0%,rgba(13,11,11,.1) 40%,rgba(13,11,11,.2) 62%,rgba(13,11,11,.95) 100%)"></div>{top("#FFF4E6","HNY")}'
  f'<div class="c h" style="left:72px;right:72px;bottom:150px"><div class="label amb" style="margin-bottom:20px">Halal New York Gyro</div><h1>From the street<br>to the <span class="red">kitchen.</span></h1><p style="margin-top:28px">A public website connected to the private software that runs the orders.</p></div>{foot(1,N,"Swipe →")}',
  f'<img class="bg" src="../p/hny-a.jpg" style="filter:blur(18px) brightness(.35);transform:scale(1.15)">{top("#FFF4E6","HNY")}'
  f'<div class="c h" style="left:72px;right:72px;top:190px"><h2>The front door.</h2><p style="margin-top:22px">Bilingual customer website, menu and marketing graphics.</p></div>'
  f'<div class="c" style="left:72px;right:72px;top:560px">{browser("../hny-website-live-20261016.jpg",936)}</div>'
  f'<div class="c h" style="left:72px;bottom:150px"><span class="status amb">Live client website · Oct 2026</span></div>{foot(2,N)}',
  f'<img class="bg" src="../p/hny-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(13,11,11,.92) 0%,rgba(13,11,11,.55) 38%,rgba(13,11,11,.2) 60%,rgba(13,11,11,.85) 100%)"></div>{top("#FFF4E6","HNY")}'
  f'<div class="c h" style="left:72px;right:72px;top:180px"><h2>Every order<br>has a <span class="amb">status.</span></h2></div>'
  f'<div class="c tix" style="left:72px;right:60px;top:640px">'
  f'<div class="tk" style="transform:rotate(-3deg)"><span class="k">Step 1</span><b>Request</b>Customer sends the order</div>'
  f'<div class="tk" style="transform:rotate(1.5deg);margin-top:30px"><span class="k">Step 2</span><b>Approved</b>Accepted with its price</div>'
  f'<div class="tk" style="transform:rotate(-1deg)"><span class="k">Step 3</span><b>Kitchen</b>Shared prep status</div>'
  f'<div class="tk" style="transform:rotate(2.5deg);margin-top:40px"><span class="k">Step 4</span><b>Done</b>Fulfilled and on record</div></div>{foot(3,N)}',
  f'<div class="shade" style="background:radial-gradient(100% 70% at 20% 0%,#2a1712 0%,#0d0b0b 65%)"></div>{top("#FFF4E6","HNY")}'
  f'<div class="c h" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:50px">The owner stays<br>in <span class="red">control.</span></h2>'
  f'<div class="li"><span>01</span>Catalog and price controls</div>'
  f'<div class="li"><span>02</span>Accepted order prices are kept when the catalog price changes</div>'
  f'<div class="li"><span>03</span>Records the owner can review</div>'
  f'<div class="li" style="border-bottom:2px solid rgba(255,181,71,.4)"><span>04</span>Period reports, ready to export</div></div>{foot(4,N)}',
  f'<img class="bg" src="../p/hny-b.jpg" style="filter:brightness(.4)"><div class="shade" style="background:linear-gradient(0deg,rgba(13,11,11,.95) 10%,rgba(13,11,11,.3) 70%)"></div>{top("#FFF4E6","HNY")}'
  f'<div class="c h" style="left:72px;right:72px;bottom:170px"><h1 style="font-size:120px">Built with HNY.</h1><p style="margin-top:26px">Website, creative and operational software by Round City. What does your kitchen need?</p><p style="margin-top:30px;color:#FFB547;font:500 36px Inter Tight">roundcity.co</p></div>{foot(5,N,"Link in bio")}',
])

# 3 ── Blite Fashion: "The fitting room". Atelier + velvet, Figtree, ivory/oxblood. Approved nov4 images only, no prices.
B = '../src/blite/'
css = """.b{--bg:#F4EFE7;--fg:#141416;font-family:'Figtree'}
.b h1{font:600 104px/1 'Figtree';letter-spacing:-.035em}
.b h2{font:600 78px/1.02 'Figtree';letter-spacing:-.03em}
.b p{font:400 32px/1.45 'Figtree';color:rgba(20,20,22,.75)}
.b .ox{color:#6E1423}
.b .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;width:780px;margin:0 auto}
.b .grid div{background:#fff;border-radius:4px;aspect-ratio:1;display:grid;place-items:center;box-shadow:0 20px 40px -24px rgba(0,0,0,.35)}
.b .grid img{width:86%;height:86%;object-fit:contain}
.b .btn{display:inline-block;background:#6E1423;color:#F6F3EE;border-radius:999px;padding:24px 50px;font:600 36px 'Figtree'}"""
N = 5
D['03-blite-collab'] = ('Blite collab', css, [
  f'<img class="bg" src="../p/blite-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(244,239,231,.0) 55%,rgba(244,239,231,.92) 82%)"></div>{top("#141416","Blite Fashion")}'
  f'<div class="c" style="left:250px;top:250px;width:430px;transform:rotate(-1deg)"><div class="frame" style="border-radius:3px;box-shadow:0 40px 80px -30px rgba(0,0,0,.55)"><img src="{B}8579-mockup.webp"></div></div>'
  f'<div class="c b" style="left:72px;right:72px;bottom:150px"><h1>The collection,<br><span class="ox">online.</span></h1></div>{foot(1,N,"Swipe →")}',
  f'{top("#141416","Blite Fashion")}<div class="c b" style="left:72px;right:72px;top:170px"><h2>Ten styles.<br>Thirty colors.</h2><p style="margin-top:16px">Photographed for the New Arrivals catalog.</p></div>'
  f'<div class="c b grid" style="left:72px;right:72px;top:430px">' + ''.join(f'<div><img src="{B}{x}-clean.webp"></div>' for x in ['8579', '8584', '8602', '8612']) + '</div>' + foot(2, N, color='#141416'),
  f'<img class="bg" src="../p/blite-b.jpg"><div class="shade" style="background:rgba(20,6,10,.35)"></div>{top("#F6F3EE","Blite Fashion")}'
  f'<div class="c" style="left:72px;top:200px;width:560px;transform:rotate(-2deg)"><div class="frame" style="border-radius:3px"><img src="{B}8579-detail.webp"></div></div>'
  f'<div class="c" style="right:72px;top:560px;width:470px;transform:rotate(2deg)"><div class="frame" style="border-radius:3px"><img src="{B}8612-detail.webp"></div></div>'
  f'<div class="c b" style="left:72px;right:72px;bottom:150px;color:#F6F3EE"><h2>Every detail, in view.</h2></div>{foot(3,N,color="#F6F3EE")}',
  f'{top("#141416","Blite Fashion")}<div class="c b" style="left:72px;right:72px;top:180px"><h2>Browse it.<br>Then ask about it.</h2><p style="margin-top:18px">A live website with a clear way to ask about availability.</p></div>'
  f'<div class="c" style="left:72px;right:72px;top:620px">{browser("../blite-new-arrivals-live-20261016.jpg",936)}</div>'
  f'<div class="c b" style="left:72px;bottom:150px"><span class="status ox">Live website + catalog</span></div>{foot(4,N,color="#141416")}',
  f'<img class="bg" src="../p/blite-a.jpg" style="object-position:30% 50%"><div class="shade" style="background:rgba(244,239,231,.55)"></div>{top("#141416","Blite Fashion")}'
  f'<div class="c b" style="left:72px;right:72px;top:420px;text-align:center"><img src="../blite-wordmark.svg" style="width:560px;filter:invert(1)"><p style="margin:46px 0 40px;color:#141416">Visit us in Sterling Heights</p><span class="btn">Visit blite.app</span>'
  f'<p style="margin-top:60px;font-size:26px">Website and photographed catalog by Round City</p></div>{foot(5,N,"blite.app",color="#141416")}',
])

# 4 ── Susu Ink & Glow: "The love letter". Silk + stationery, Playfair + DM Sans, cocoa/blush/gold. Real photos only.
U = '../susu/'
css = """.u{--bg:#2a1a1c;--fg:#F7EEE6;font-family:'DM Sans'}
.u h1{font:400 100px/1.02 'Playfair Display',serif}.u h1 i,.u h2 i{color:#E7B98C}
.u h2{font:400 80px/1.05 'Playfair Display'}
.u p{font:400 32px/1.45 'DM Sans';color:rgba(247,238,230,.84)}
.u .pol{background:#FBF5EE;padding:16px 16px 60px;box-shadow:0 30px 60px -24px rgba(0,0,0,.6);position:absolute}
.u .pol img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
.u .pol span{position:absolute;left:0;right:0;bottom:14px;text-align:center;font:italic 400 26px 'Playfair Display';color:#5a3a33;white-space:nowrap}
.u .q{font:italic 400 66px/1.2 'Playfair Display';color:#F7EEE6}"""
N = 5
D['04-susu-collab'] = ('Susu collab', css, [
  f'<img class="bg" src="../p/susu-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(250,236,228,.1) 0%,rgba(250,236,228,.55) 70%,rgba(250,236,228,.8) 100%)"></div>{top("#2a1a1c","Susu Ink & Glow")}'
  f'<div class="c u" style="left:0;right:0;top:380px;text-align:center"><img src="{U}susu-logo-gold.svg" style="width:640px"></div>'
  f'<div class="c u" style="left:72px;right:72px;bottom:160px;text-align:center;color:#2a1a1c"><h1 style="font-size:88px">Her studio, <i style="color:#8a4b3c">now online.</i></h1></div>{foot(1,N,"Swipe →",color="#2a1a1c")}',
  f'<img class="bg" src="{U}susu-portrait.webp" style="object-position:50% 20%"><div class="shade" style="background:linear-gradient(0deg,rgba(42,26,28,.95) 0%,rgba(42,26,28,.5) 30%,rgba(42,26,28,0) 52%)"></div>{top("#F7EEE6","Susu Ink & Glow")}'
  f'<div class="c u" style="left:72px;right:72px;bottom:150px"><div class="q">“I’ll text you to confirm.”</div><p style="margin-top:22px">Every page written in Susu’s own voice.</p></div>{foot(2,N)}',
  f'<img class="bg" src="../p/susu-a.jpg">{top("#F7EEE6","Susu Ink & Glow")}'
  f'<div class="u pol" style="left:90px;top:200px;width:430px;transform:rotate(-5deg)"><img src="{U}susu-brows.webp"><span>Brows</span></div>'
  f'<div class="u pol" style="right:90px;top:300px;width:410px;transform:rotate(4deg)"><img src="{U}susu-more-pen-bw.webp"><span>PMU</span></div>'
  f'<div class="u pol" style="left:300px;top:690px;width:420px;transform:rotate(-1deg)"><img src="{U}susu-more-rings.webp"><span>Piercing</span></div>'
  f'<div class="c u" style="left:72px;right:72px;bottom:120px;text-align:center"><p style="color:#F7EEE6;font-size:30px;text-shadow:0 2px 14px rgba(0,0,0,.85),0 0 4px rgba(0,0,0,.6)">Brows · Lip blush · PMU · Fine-line tattoo · Piercing</p></div>{foot(3,N)}',
  f'<div class="shade" style="background:radial-gradient(110% 80% at 50% 0%,#4a2c2c 0%,#2a1a1c 65%)"></div>{top("#F7EEE6","Susu Ink & Glow")}'
  f'<div class="c u" style="left:72px;right:72px;top:200px"><h2>Book in a few taps.</h2><p style="margin-top:24px;max-width:860px">Pick one service or several. The request goes straight into the booking system Susu already uses.</p></div>'
  f'<div class="c" style="left:200px;right:200px;top:640px;border-radius:30px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.8)"><img src="{U}susu-studio.webp" style="width:100%;display:block;aspect-ratio:4/3.4;object-fit:cover"></div>{foot(4,N)}',
  f'<img class="bg" src="../p/susu-b.jpg" style="transform:scaleX(-1)"><div class="shade" style="background:rgba(42,26,28,.6)"></div>{top("#F7EEE6","Susu Ink & Glow")}'
  f'<div class="c u" style="left:72px;right:72px;top:420px;text-align:center"><img src="{U}susu-logo-gold.svg" style="width:480px"><h2 style="margin-top:60px;font-size:72px">susuinkandglow.com</h2>'
  f'<p style="margin-top:28px">Columbus, Ohio · By appointment<br>Website by Round City</p></div>{foot(5,N,"@susuinkandglow")}',
])

# 5 ── MoTintKing: "Light tunnel". Studio LEDs + satin film, Archivo expanded, black/red/white.
css = """.m{--bg:#070708;--fg:#F5F5F7;font-family:'Inter Tight'}
.m h1{font:800 118px/.95 'Archivo';font-stretch:125%;text-transform:uppercase;letter-spacing:-.01em}
.m h2{font:800 76px/1 'Archivo';font-stretch:125%;text-transform:uppercase}
.m p{font:400 32px/1.45 'Inter Tight';color:rgba(245,245,247,.78)}
.m .red{color:#FF2D2D}
.m .ad{background:#fff;color:#202124;border-radius:16px;padding:30px 34px;margin-bottom:22px;font-family:Arial,sans-serif;box-shadow:0 30px 60px -30px rgba(0,0,0,.8)}
.m .ad small{font-size:20px;color:#202124}.m .ad b{display:block;font:400 34px Arial;color:#1a0dab;margin:8px 0}.m .ad span{font-size:24px;color:#4d5156;line-height:1.4}"""
N = 5
D['05-motintking-collab'] = ('MoTintKing collab', css, [
  f'<img class="bg" src="../p/motint-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(7,7,8,.6) 0%,rgba(7,7,8,0) 35%,rgba(7,7,8,0) 55%,rgba(7,7,8,.95) 100%)"></div>{top("#F5F5F7","MoTintKing")}'
  f'<div class="c m" style="left:72px;right:72px;bottom:150px"><h1>Tint.<br>Wrap.<br><span class="red">PPF.</span></h1><p style="margin-top:24px">Made clear for every Columbus customer.</p></div>{foot(1,N,"Swipe →")}',
  f'<div class="shade" style="background:#0b0b0d"></div>{top("#F5F5F7","MoTintKing")}'
  f'<div class="c" style="left:170px;right:170px;top:170px"><img src="../motint-brand.webp" style="width:100%;border-radius:10px;display:block"></div>'
  f'<div class="c m" style="left:72px;right:72px;bottom:150px"><h2>Identity + website</h2><p style="margin-top:14px">Service pages, education and a quote journey.</p></div>{foot(2,N)}',
  f'<img class="bg" src="../p/motint-b.jpg" style="filter:brightness(.55)">{top("#F5F5F7","MoTintKing")}'
  f'<div class="c m" style="left:72px;right:72px;top:180px"><h2 style="margin-bottom:16px">Clear before<br>the click.</h2><span class="status" style="margin-bottom:40px">Draft campaign copy</span>'
  f'<div style="margin-top:40px"><div class="ad"><small>Sponsored</small><b>Vehicle Lettering Columbus</b><span>Put your name, phone and brand on work vehicles with a clean professional install.</span></div>'
  f'<div class="ad"><small>Sponsored</small><b>Fleet Graphics Columbus</b><span>Create a consistent professional look across work vehicles with fleet graphics.</span></div>'
  f'<div class="ad"><small>Sponsored</small><b>Commercial Wraps Columbus</b><span>Turn work vehicles into consistent brand visibility with commercial wrap design.</span></div></div></div>{foot(3,N)}',
  f'<img class="bg" src="../p/motint-a.jpg" style="filter:blur(10px) brightness(.35);transform:scale(1.1)">{top("#F5F5F7","MoTintKing")}'
  f'<div class="c m" style="left:72px;right:72px;top:220px"><h2>Built for<br>the bay <span class="red">too.</span></h2><p style="margin-top:30px;max-width:860px">An owner dashboard and a bay board, tested against the shop’s real workflow before they go live.</p>'
  f'<div style="margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:20px">' + ''.join(f'<div style="border:1.5px solid rgba(255,255,255,.3);border-radius:12px;padding:30px;font:700 30px Archivo;font-stretch:125%;text-transform:uppercase">{t}<div style="font:400 22px JetBrains Mono;letter-spacing:.1em;color:#FF2D2D;margin-top:14px">{s}</div></div>' for t, s in [('Quote', 'New lead'), ('Scheduled', 'Bay assigned'), ('In the bay', 'Install'), ('Ready', 'Pickup')]) + '</div>'
  f'<div style="margin-top:40px"><span class="status">Owner tools · in development</span></div></div>{foot(4,N)}',
  f'<img class="bg" src="../p/motint-b.jpg" style="filter:brightness(.35)">{top("#F5F5F7","MoTintKing")}'
  f'<div class="c m" style="left:72px;right:72px;top:470px"><h1 style="font-size:100px">Built with<br>MoTintKing.</h1><p style="margin-top:30px">Website, campaign creative and shop workflows by Round City.</p><p style="margin-top:30px;color:#FF2D2D;font:600 36px Inter Tight">roundcity.co</p></div>{foot(5,N,"Link in bio")}',
])

# 6 ── Makeup by Aya: "The vanity". Golden-hour suite, Cormorant, ivory/blush. Status: public preview.
css = """.a{--bg:#FBF6F0;--fg:#3b2a26;font-family:'Inter Tight'}
.a h1{font:400 108px/1 'Cormorant Garamond',serif}.a h1 i,.a h2 i{color:#B5707A}
.a h2{font:400 86px/1.02 'Cormorant Garamond'}
.a p{font:400 31px/1.5 'Inter Tight';color:rgba(59,42,38,.78)}
.a .st{display:grid;grid-template-columns:80px 1fr;padding:30px 0;border-top:1px solid rgba(181,112,122,.4)}
.a .st span{font:italic 400 54px/1 'Cormorant Garamond';color:#B5707A}.a .st b{font:500 38px 'Inter Tight';display:block;margin-bottom:6px}"""
N = 5
D['06-aya-collab'] = ('Makeup by Aya collab', css, [
  f'<img class="bg" src="../p/aya-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(251,246,240,.0) 45%,rgba(251,246,240,.95) 78%)"></div>{top("#3b2a26","Makeup by Aya")}'
  f'<div class="c a" style="left:72px;right:72px;bottom:150px"><h1>Find your occasion.<br><i>Plan the day.</i></h1></div>{foot(1,N,"Swipe →",color="#3b2a26")}',
  f'{top("#3b2a26","Makeup by Aya")}<div class="c a" style="left:72px;right:72px;top:180px"><h2>Bridal and event makeup, page by page.</h2></div>'
  f'<div class="c" style="left:72px;right:72px;top:560px">{browser("../aya-public-preview-20261016.jpg",936)}</div>'
  f'<div class="c a" style="left:72px;bottom:150px;color:#B5707A"><span class="status">Public review preview</span></div>{foot(2,N,color="#3b2a26")}',
  f'<img class="bg" src="../p/aya-b.jpg"><div class="shade" style="background:rgba(251,246,240,.78)"></div>{top("#3b2a26","Makeup by Aya")}'
  f'<div class="c a" style="left:72px;right:72px;top:200px"><h2 style="margin-bottom:46px">A request that starts <i>a conversation.</i></h2>'
  f'<div class="st"><span>i</span><div><b>Choose the occasion</b><p>Bridal or event, with visual service pages</p></div></div>'
  f'<div class="st"><span>ii</span><div><b>Send a guided request</b><p>Date, party and details in one place</p></div></div>'
  f'<div class="st" style="border-bottom:1px solid rgba(181,112,122,.4)"><span>iii</span><div><b>Aya replies</b><p>A request, not an automatic booking</p></div></div></div>{foot(3,N,color="#3b2a26")}',
  f'<img class="bg" src="../p/aya-a.jpg" style="filter:blur(16px) brightness(1.02);transform:scale(1.1)"><div class="shade" style="background:rgba(251,246,240,.6)"></div>{top("#3b2a26","Makeup by Aya")}'
  f'<div class="c a" style="left:72px;right:72px;top:240px"><h2>The whole bridal party, <i>organized.</i></h2><p style="margin-top:34px;max-width:860px">A guest flow for the bridal party, plus a separate owner workspace for requests and calendar planning.</p></div>'
  f'<div class="c a" style="left:72px;right:72px;bottom:190px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">' + ''.join(f'<div style="background:#fff;border-radius:16px;padding:34px 24px;text-align:center;box-shadow:0 20px 40px -26px rgba(59,42,38,.4)"><div style="font:italic 400 50px Cormorant Garamond;color:#B5707A">{a}</div><div style="font:500 26px Inter Tight;margin-top:8px">{b}</div></div>' for a, b in [('Bride', 'Request'), ('Party', 'Guest flow'), ('Aya', 'Calendar')]) + f'</div>{foot(4,N,color="#3b2a26")}',
  f'<img class="bg" src="../p/aya-b.jpg"><div class="shade" style="background:rgba(251,246,240,.7)"></div>{top("#3b2a26","Makeup by Aya")}'
  f'<div class="c a" style="left:72px;right:72px;top:470px;text-align:center"><h1>Makeup by Aya</h1><p style="margin-top:30px">Website design and appointment-request software by Round City.<br>Now in public preview.</p><p style="margin-top:34px;color:#B5707A;font:500 36px Inter Tight">roundcity.co</p></div>{foot(5,N,"Link in bio",color="#3b2a26")}',
])

# 7 ── Valentina Luxe: "Dos idiomas". Black lacquer + gold foil, Bodoni Moda, bilingual pairs.
css = """.v{--bg:#0a0908;--fg:#F3E9D6;font-family:'Inter Tight'}
.v h1{font:400 112px/1 'Bodoni Moda',serif}.v h1 i{color:#D9B26A}
.v h2{font:400 76px/1.05 'Bodoni Moda'}
.v .es{font:italic 400 44px/1.25 'Bodoni Moda';color:#D9B26A}
.v p{font:400 31px/1.5 'Inter Tight';color:rgba(243,233,214,.8)}
.v .pair{display:grid;grid-template-columns:1fr 1fr;gap:30px;padding:30px 0;border-top:1px solid rgba(217,178,106,.4)}
.v .pair b{font:500 34px 'Inter Tight'}.v .pair i{font:italic 400 34px 'Bodoni Moda';color:#D9B26A}"""
N = 4
D['07-valentina-collab'] = ('Valentina Luxe collab', css, [
  f'<img class="bg" src="../p/vl-a.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(10,9,8,.85) 0%,rgba(10,9,8,.2) 40%)"></div>{top("#F3E9D6","Valentina Luxe")}'
  f'<div class="c v" style="left:72px;right:72px;top:200px"><h1>One brand.<br><i>Two languages.</i></h1><div class="es" style="margin-top:24px">Una marca. Dos idiomas.</div></div>{foot(1,N,"Swipe →")}',
  f'<img class="bg" src="../p/vl-b.jpg" style="filter:brightness(.6)">{top("#F3E9D6","Valentina Luxe")}'
  f'<div class="c" style="left:300px;top:170px;width:480px;border-radius:20px;overflow:hidden;box-shadow:0 40px 90px -20px rgba(0,0,0,.85)"><img src="../valentina-story.webp" style="width:100%;display:block"></div>'
  f'<div class="c v" style="left:72px;right:72px;bottom:140px;text-align:center"><h2 style="font-size:60px">Social graphics + motion</h2><div class="es" style="font-size:36px;margin-top:10px">Gráficos y video para redes</div></div>{foot(2,N)}',
  f'<div class="shade" style="background:radial-gradient(100% 70% at 50% 0%,#221b12 0%,#0a0908 65%)"></div>{top("#F3E9D6","Valentina Luxe")}'
  f'<div class="c v" style="left:72px;right:72px;top:200px"><h2 style="margin-bottom:50px">Built on the identity she already had.</h2>'
  + ''.join(f'<div class="pair"><b>{e}</b><i>{s}</i></div>' for e, s in [('Bilingual website', 'Sitio web bilingüe'), ('Existing brand, kept', 'Su marca, respetada'), ('Social graphics + motion', 'Gráficos y video'), ('Her content, presented', 'Su contenido, presentado')]) +
  f'</div>{foot(3,N)}',
  f'<img class="bg" src="../p/vl-a.jpg" style="filter:brightness(.45)">{top("#F3E9D6","Valentina Luxe")}'
  f'<div class="c v" style="left:72px;right:72px;top:470px;text-align:center"><h1 style="font-size:100px">Valentina Luxe</h1><p style="margin-top:30px">Website and bilingual visual content by Round City.<br><span style="font-family:Bodoni Moda;font-style:italic;color:#D9B26A">Sitio web y contenido bilingüe por Round City.</span></p><p style="margin-top:34px;color:#D9B26A;font:500 36px Inter Tight">roundcity.co</p></div>{foot(4,N,"Link in bio")}',
])

# 8 ── @614lux personal (collab with @roundcity.co): "Field notes". B/W film + one gold accent, Instrument Serif + Plex Mono.
css = """.l{--bg:#0c0c0c;--fg:#EDEAE4;font-family:'Inter Tight'}
.l h1{font:400 108px/1 'Instrument Serif',serif}.l h1 i,.l h2 i{color:var(--gold)}
.l h2{font:400 84px/1.03 'Instrument Serif'}
.l p{font:400 31px/1.5 'Inter Tight';color:rgba(237,234,228,.78)}
.l .mono{font:400 24px/1.6 'IBM Plex Mono';letter-spacing:.04em;color:rgba(237,234,228,.7)}
.l .w{display:grid;grid-template-columns:1fr auto;padding:24px 0;border-top:1px solid rgba(237,234,228,.2);align-items:baseline}
.l .w b{font:400 46px 'Instrument Serif'}.l .w span{font:400 21px 'IBM Plex Mono';color:var(--gold);text-align:right;letter-spacing:.06em}"""
N = 5
D['08-614lux-personal'] = ('614lux personal', css, [
  f'<img class="bg" src="../p/lux-a.jpg"><div class="shade" style="background:linear-gradient(0deg,rgba(12,12,12,.95) 0%,rgba(12,12,12,.4) 45%,rgba(12,12,12,.2) 100%)"></div>{top("#EDEAE4","@614lux")}'
  f'<div class="c l" style="left:72px;right:72px;bottom:150px"><div class="mono" style="margin-bottom:24px">Field notes · Ali Al-Khafaji</div><h1>I build the software<br>a business <i>runs on.</i></h1></div>{foot(1,N,"Swipe →")}',
  f'<img class="bg" src="../p/lux-b.jpg"><div class="shade" style="background:linear-gradient(180deg,rgba(12,12,12,.2) 0%,rgba(12,12,12,.95) 72%)"></div>{top("#EDEAE4","@614lux")}'
  f'<div class="c l" style="left:72px;right:72px;bottom:160px"><h2>The person learning the workflow also <i>shapes the solution.</i></h2><p style="margin-top:28px">Founder &amp; Forward Deployed Engineer, Round City.</p></div>{foot(2,N)}',
  f'<div class="shade" style="background:#0c0c0c"></div>{top("#EDEAE4","@614lux")}'
  f'<div class="c l" style="left:72px;right:72px;top:200px"><h2 style="margin-bottom:60px">How I work.</h2>'
  + ''.join(f'<div style="display:grid;grid-template-columns:120px 1fr;padding:34px 0;border-top:1px solid rgba(237,234,228,.2)"><div class="mono" style="color:var(--gold);font-size:28px">{n}</div><div><div style="font:400 50px Instrument Serif">{t}</div><p style="margin-top:8px">{d}</p></div></div>' for n, t, d in [('01', 'Understand', 'I talk with the people doing the work and map the friction.'), ('02', 'Scope, build + test', 'Scope, responsibilities and price in writing, then real-scenario tests.'), ('03', 'Deploy + handover', 'I put it into daily use and document the handoff.')]) +
  f'</div>{foot(3,N)}',
  f'<img class="bg" src="../p/lux-a.jpg" style="filter:grayscale(1) blur(16px) brightness(.3);transform:scale(1.1)">{top("#EDEAE4","@614lux")}'
  f'<div class="c l" style="left:72px;right:72px;top:190px"><h2 style="margin-bottom:40px">The range is <i>the method.</i></h2>'
  + ''.join(f'<div class="w"><b>{a}</b><span>{b}</span></div>' for a, b in [('Halal New York Gyro', 'ORDERING + KITCHEN SOFTWARE'), ('MoTintKing', 'WEBSITE + SHOP WORKFLOWS'), ('Blite Fashion', 'WEBSITE + CATALOG'), ('Susu Ink &amp; Glow', 'WEBSITE + BOOKING'), ('Valentina Luxe', 'BILINGUAL WEB + CONTENT'), ('Makeup by Aya', 'REQUEST SOFTWARE · PREVIEW')]) +
  f'</div>{foot(4,N)}',
  f'<img class="bg" src="../p/lux-b.jpg" style="filter:brightness(.45)">{top("#EDEAE4","@614lux")}'
  f'<div class="c l" style="left:72px;right:72px;top:430px"><h1 style="font-size:96px">Columbus.<br><i>Ohio, Southeast Michigan</i><br>and remote.</h1><p style="margin-top:34px">Tell me what’s slowing your business down.</p><p style="margin-top:20px;color:var(--gold);font:500 36px Inter Tight">roundcity.co · @roundcity.co</p></div>{foot(5,N,"Link in bio")}',
])

os.makedirs(os.path.join(HERE, 'decks'), exist_ok=True)
for k, (t, css, slides) in D.items():
    open(os.path.join(HERE, 'decks', k + '.html'), 'w').write(page(t, css, slides))
print(len(D), 'decks', sum(len(v[2]) for v in D.values()), 'slides')
