#!/usr/bin/env python3
"""Generate every page of the site from the data files.

    python3 tools/build_site.py            preview build (noindex, links end in index.html)
    python3 tools/build_site.py --live     launch build (indexable, clean links)

Reads data/site.json, data/services.json, data/work.json and assets/manifest.json.
Writes index.html, one folder per service, commercial/, work/, sitemap.xml,
robots.txt, site.webmanifest and favicon.svg. Edit the data, not the output.
"""
import html, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LIVE = "--live" in sys.argv
J = lambda p: json.load(open(os.path.join(ROOT, p)))
SITE, SERVICES, WORK = J("data/site.json"), J("data/services.json"), J("data/work.json")
e = html.escape
FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,800;1,700&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap"
CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'

def link(root, path):
    """Internal link. Preview builds point at index.html so they work from any folder."""
    if not path:
        return (root or "./") if LIVE else root + "index.html"
    return f"{root}{path}/" if LIVE else f"{root}{path}/index.html"

def canonical(path):
    return SITE["domain"] + "/" + (path + "/" if path else "")

def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>"

def business():
    return {"@context": "https://schema.org", "@type": "AutomotiveBusiness", "@id": SITE["domain"] + "/#business", "name": SITE["name"], "url": SITE["domain"] + "/",
            "email": SITE["email"], "slogan": SITE["tagline"], "image": SITE["domain"] + "/assets/share.jpg",
            "areaServed": [{"@type": "City", "name": f"{c}, {SITE['region']}"} for c in SITE["area"]], "sameAs": [u for _, u in SITE["instagram"]],
            "knowsAbout": ["Vinyl vehicle wraps", "Paint protection film", "Window tint", "Body kits", "Fleet graphics"]}

def head(root, path, title, desc, mode="personal", ch="", lock=False, extra_ld=()):
    robots = "index,follow" if LIVE else "noindex,nofollow"
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": canonical("")}]
    if path:
        crumbs.append({"@type": "ListItem", "position": 2, "name": title.split(" | ")[0], "item": canonical(path)})
    lds = [business(), {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}, *extra_ld]
    return f"""<!DOCTYPE html>
<html lang="en" data-mode="{mode}" data-root="{root}"{f' data-ch="{ch}"' if ch else ''}{' data-lock="1"' if lock else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical(path)}">
<meta name="theme-color" content="{'#cfcac1' if mode == 'commercial' else '#000000'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{SITE['name']}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canonical(path)}">
<meta property="og:image" content="{SITE['domain']}/assets/share.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}favicon.svg" type="image/svg+xml">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="{root}styles.css">
{chr(10).join(ld(x) for x in lds)}
</head>
<body>
"""

def top(root, mode):
    per, com = ("true", "false") if mode == "personal" else ("false", "true")
    return f"""<header class="top">
  <nav class="mode glass" aria-label="Who is this for">
    <a href="{link(root, '')}" aria-current="{per}"{' class="live"' if per == 'true' else ''}>Personal</a>
    <a href="{link(root, 'commercial')}" aria-current="{com}"{' class="live"' if com == 'true' else ''}>Commercial</a>
  </nav>
  <button class="menubtn glass" type="button" data-menu aria-expanded="false" aria-controls="menu" aria-label="Menu"><span></span><span></span></button>
</header>
<nav class="menu" id="menu" hidden aria-label="Site">
  <ol>
    <li><a href="{link(root, '')}">Home</a></li>
    {''.join(f'<li><a href="{link(root, s["slug"])}">{e(s["nav"])}</a></li>' for s in SERVICES)}
    <li><a href="{link(root, 'commercial')}">Fleet and commercial</a></li>
    <li><a href="{link(root, 'work')}">Our work</a></li>
  </ol>
  {book('Book now', 'Get your price in writing')}
  <p><a href="mailto:{SITE['email']}">{SITE['email']}</a></p>
</nav>
"""

def book(label="Book now", sub="", cls="", ids=False):
    """The one call to action: a glass capsule that carries what the visitor picked."""
    return f"""<button class="book live{(' ' + cls) if cls else ''}" type="button" data-quote>
        <i class="book-dot" aria-hidden="true"></i>
        <span class="book-t"><b>{e(label)}</b><small{' id="bookSub"' if ids else ''} data-booksub>{e(sub)}</small></span>
        <span class="book-go" aria-hidden="true">{ARROW}</span>
      </button>"""

def rail():
    return """<nav class="rail" aria-label="Services"><ol class="glass" id="rail"></ol></nav>"""

def hero_personal(eyebrow=""):
    title = ('<h1 class="eyebrow">' + e(eyebrow) + '</h1>\n      <p class="display" id="h1"><span>Satin black.</span> <span>Done right.</span></p>') if eyebrow else '<h1 class="display" id="h1"><span>Satin black.</span> <span>Done right.</span></h1>'
    return f"""<section class="hero" id="hero" aria-label="EveryWrap">
  <canvas class="stage" id="stage" aria-hidden="true"></canvas>
  <div class="ui">
    {rail()}
    <div class="carzone" id="carzone">
      <div class="seamctl" id="seamctl">
        <label class="vh" for="seam" id="seamLabel">Drag the seam across the car</label>
        <input type="range" id="seam" min="0" max="1000" step="1" value="500">
      </div>
    </div>
    <div class="copy glass">
      {title}
      <p class="sub" id="sub">Any car, wrapped by hand in Columbus, Ohio.</p>
      <div class="opts" id="opts" role="group" aria-label="Options"></div>
      {book('Book now', 'Satin black wrap', ids=True)}
      <button class="trylink" type="button" data-upload>{CAM} See it on your own car</button>
    </div>
  </div>
</section>
"""

def hero_fleet():
    return f"""<section class="hero" id="hero" aria-label="EveryWrap commercial">
  <div class="softbox" aria-hidden="true"></div>
  <div class="ui">
    {rail()}
    <div class="carzone" id="carzone">
      <div class="fleet" id="fleet" data-cats='{e(json.dumps(SITE["fleet"]), quote=True)}'>
        <figure class="panel p3" id="p3"><img alt=""></figure>
        <figure class="panel p2" id="p2"><img alt=""></figure>
        <figure class="panel p1" id="p1"><img class="under" alt=""><img class="over" alt=""><span class="pseam" aria-hidden="true"></span><figcaption id="pcap"></figcaption></figure>
      </div>
    </div>
    <div class="copy glass">
      <p class="eyebrow">Fleet graphics · Columbus, Ohio</p>
      <h1 class="display" id="h1"><span>Your van is</span> <span>a billboard.</span></h1>
      <p class="sub" id="sub">Fleet graphics, printed and installed in Columbus, Ohio.</p>
      {book('Book now', 'Fleet graphics')}
    </div>
  </div>
</section>
"""

def tunnel(root):
    cars = "".join(f'<img data-f="{f}" src="{root}assets/cut/sedan/{f}.webp" alt="" width="1300" height="578"{" class=on" if i == 0 else " loading=lazy"}>' for i, f in enumerate(["satin-black", "gloss-black", "satin-grey", "satin-red", "color-shift"]))
    return f"""<section class="tunnel" aria-label="Finishes">
  <div class="tpin">
    <canvas aria-hidden="true"></canvas>
    <h2 class="thead">GO SATIN BLACK.</h2>
    <p class="tsub">Five finishes on the same car. Keep scrolling.</p>
    <div class="tcar">{cars}</div>
    <div class="tread">
      <button class="tprev" type="button" aria-label="Previous finish">{CHEV_L}</button>
      <span class="tname">SATIN BLACK</span>
      <button class="tnext" type="button" aria-label="Next finish">{CHEV_R}</button>
      <span class="tcount">01 / 05</span>
    </div>
    <div class="truler" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i><i></i></div>
  </div>
</section>
"""

# Each service card has its own colour and its own moving picture. If a short loop
# exists at assets/loops/<ch>.mp4 it plays instead of the coded effect.
SVC_LIVE = {
    "wrap": ("#ef5b2a", "wipe", "sets/sedan/factory-white/000.webp", "sets/sedan/satin-black/000.webp"),
    "ppf": ("#6fd3ff", "sheen", "sets/sedan/gloss-black/000.webp", ""),
    "tint": ("#a78bff", "fade", "sets/sedan/clear-glass/000.webp", "sets/sedan/satin-black/000.webp"),
    "kits": ("#ff3347", "wipe", "sets/sedan/satin-black/000.webp", "sets/sedan/kit/000.webp"),
}

def svc_visual(root, ch):
    th, fx, a, b = SVC_LIVE[ch]
    loop = f"assets/loops/{ch}.mp4"
    if os.path.exists(os.path.join(ROOT, loop)):
        return f'<div class="svc-vis" data-live><video muted loop playsinline preload="none" poster="{root}assets/{a}" data-src="{root}{loop}"></video></div>'
    second = f'<img class="svc-b" loading="lazy" src="{root}assets/{b}" alt="" width="1637" height="914">' if b else ""
    mask = f' style="--mask:url({root}assets/sets/sedan/_masks/ppf-full.png)"' if fx == "sheen" else ""
    return f'<div class="svc-vis fx-{fx}" data-live{mask}><img loading="lazy" src="{root}assets/{a}" alt="" width="1637" height="914">{second}<i class="svc-fx" aria-hidden="true"></i></div>'

def services_band(root):
    cards = "".join(f"""<li class="svc" style="--i:{i};--th:{SVC_LIVE[s['ch']][0]}">
      <a href="{link(root, s['slug'])}">
        {svc_visual(root, s['ch'])}
        <div class="svc-txt">
          <span class="svc-n">0{i + 1}</span>
          <h3>{e(s['name'])}</h3>
          <p>{e(s['card'])}</p>
          <span class="svc-go">Explore {ARROW}</span>
        </div>
      </a>
    </li>""" for i, s in enumerate(SERVICES))
    return f"""<section class="band services" aria-labelledby="svch">
  <div class="bandhead" data-reveal><h2 id="svch">Four things we do to a car.</h2></div>
  <ol class="svclist">{cards}</ol>
</section>
"""

def reel():
    return f"""<div class="reel" id="reel" role="group" aria-roledescription="carousel" aria-label="Recent work">
    <div class="reel-stage" aria-hidden="true"></div>
    <div class="reel-bars" aria-hidden="true"></div>
    <div class="reel-txt" aria-live="off"><p class="reel-kicker"></p><h3 class="reel-title"></h3><p class="reel-fin"></p></div>
    <button class="reel-hit prev" type="button" aria-label="Previous job"></button>
    <button class="reel-hit next" type="button" aria-label="Next job"></button>
    <button class="reel-open glass" type="button">View job {ARROW}</button>
    <button class="reel-pause glass" type="button" aria-label="Pause" aria-pressed="false"><i></i></button>
  </div>"""

def wall(root, limit=0, tag="all", filters=True, more=True, live=False):
    return f"""<div class="wall" data-tag="{tag}"{f' data-limit="{limit}"' if limit else ''}{' data-live="1"' if live else ''}>
    {'<div class="tabs glass" role="group" aria-label="Filter the work"></div>' if filters else ''}
    <div class="tiles"></div>
    {f'<p class="wallmore"><a class="btn sec" href="{link(root, "work")}">All {len(WORK)} jobs {ARROW}</a></p>' if more else ''}
  </div>"""

def work_band(root):
    return f"""<section class="band workband" aria-labelledby="workh">
  <div class="bandhead" data-reveal><h2 id="workh">Proof in the finish.</h2></div>
  <div class="work-split">
  {reel()}
  {wall(root, limit=12, live=True)}
  </div>
</section>
"""

def live_board(root, cls=""):
    """A framed job photo that wipes to the next one by itself."""
    by = {j["id"]: j for j in WORK}
    cats = [{"word": c["word"], "label": c["label"], "src": f"{root}assets/{by[c['job']]['src']}", "title": by[c["job"]]["title"]} for c in SITE["fleet"] if c["job"] in by]
    first = cats[0]
    return f"""<div class="board{(' ' + cls) if cls else ''}" data-board='{e(json.dumps(cats), quote=True)}'>
      <figure><img class="under" src="{first['src']}" alt="{e(first['title'])}" loading="lazy"><img class="over" alt="" aria-hidden="true"><span class="board-seam" aria-hidden="true"></span><figcaption>{e(first['title'])}</figcaption></figure>
      <ol class="board-dots" aria-hidden="true">{''.join('<li></li>' for _ in cats)}</ol>
    </div>"""

def fleet_teaser(root):
    return f"""<section class="teaser" aria-labelledby="teaserh">
  <div class="teaser-in">
    <div data-reveal>
      <p class="eyebrow">For business</p>
      <h2 id="teaserh">Your <span class="flip" data-flip>van</span> is a billboard.</h2>
      <p>Vans, buses, food trucks and boats, printed and installed. One design carried across every vehicle.</p>
      <a class="btn pri" href="{link(root, 'commercial')}">See fleet work {ARROW}</a>
    </div>
    {live_board(root)}
  </div>
</section>
"""

def how():
    return """<section class="band how" aria-labelledby="howh">
  <div class="bandhead" data-reveal><h2 id="howh">Price first. Then we talk.</h2></div>
  <ol class="steps3" data-reveal>
    <li><i>1</i><b>Send the car</b><span>A photo, or year, make and model</span></li>
    <li><i>2</i><b>Get it in writing</b><span>Film, coverage and price</span></li>
    <li><i>3</i><b>Book the install</b><span>Date set by call or text</span></li>
  </ol>
</section>
"""

def final(com=False):
    return f"""<section class="final" aria-labelledby="finalh">
  <h2 id="finalh" data-reveal>{'Send the logo. We do the rest.' if com else 'See your car in it first.'}</h2>
  <p data-reveal>{'Tell us the vehicles and how many. You get a design proof and a written quote.' if com else 'Send a photo or the year, make and model. You get a written quote, and nothing starts until you say so.'}</p>
  <div class="final-cta" data-reveal>{book('Book now', 'Fleet graphics' if com else 'Get your price in writing')}<button class="trylink" type="button" data-upload>{CAM} {'Send a photo of the vehicle' if com else 'See it on your own car'}</button></div>
</section>
"""

def footer(root, home=False):
    area = ", ".join(SITE["area"])
    insta = "".join(f'<li><a href="{u}" rel="noopener">@{h}</a></li>' for h, u in SITE["instagram"])
    return f"""<footer class="foot">
  <div class="foot-grid">
    <div><p class="tag">{e(SITE['tagline'])}</p><p>{e(SITE['name'])}. Serving {e(area)} and the rest of central {SITE['region']}.</p></div>
    <nav aria-label="Services"><h2>Services</h2><ul>{''.join(f'<li><a href="{link(root, s["slug"])}">{e(s["name"])}</a></li>' for s in SERVICES)}<li><a href="{link(root, 'commercial')}">Fleet and commercial</a></li></ul></nav>
    <nav aria-label="More"><h2>See</h2><ul><li><a href="{link(root, 'work')}">Our work</a></li>{insta}</ul></nav>
    <div><h2>Talk to us</h2><ul><li><a href="mailto:{SITE['email']}">{SITE['email']}</a></li><li><button type="button" data-quote>Book now</button></li>{'<li><button type="button" id="replay">Replay the intro</button></li>' if home else ''}</ul></div>
  </div>
</footer>
"""

def faq(items, title="Questions people ask"):
    rows = "".join(f"<details data-reveal><summary>{e(q)}</summary><p>{e(a)}</p></details>" for q, a in items)
    return f"""<section class="band faq" aria-labelledby="faqh">
  <div class="bandhead" data-reveal><h2 id="faqh">{e(title)}</h2></div>
  <div class="faqlist">{rows}</div>
</section>
"""

def faq_ld(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}

def chrome(root, com=False):
    return f"""<div class="floatbook" id="stickybar">
  {book('Book now', 'Fleet graphics' if com else 'Get your price in writing')}
</div>

<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Job details">
  <div class="lb-in">
    <div class="lb-img"><img id="lbImg" alt=""></div>
    <div class="lb-txt">
      <p class="lb-count" id="lbCount"></p>
      <h2 id="lbTitle"></h2>
      <p class="lb-finish" id="lbFinish"></p>
      <p class="lb-cap" id="lbCap"></p>
      <ul class="lb-meta" id="lbMeta"></ul>
      <button class="btn pri" type="button" id="lbQuote">Price a job like this</button>
    </div>
    <button class="x lb-close" type="button" id="lbClose" aria-label="Close">×</button>
    <button class="lb-nav prev" type="button" id="lbPrev" aria-label="Previous job">{CHEV_L}</button>
    <button class="lb-nav next" type="button" id="lbNext" aria-label="Next job">{CHEV_R}</button>
  </div>
</div>

<div class="scrim" id="qScrim" hidden>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="qTitle">
    <div class="shead"><h2 id="qTitle">Book now</h2><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <p class="prog" id="qProg">Step 1 of 3</p>
    <form id="qForm" novalidate>
      <div class="qstep show" data-step="1">
        <div class="field"><label for="qCar" id="qCarL">What are you driving?</label><input id="qCar" type="text" placeholder="2021 Dodge Charger" autocomplete="off"></div>
        <p class="note" id="qPhoto" hidden>Photo attached from this device.</p>
        <p class="note" id="qNote" hidden></p>
        <p class="err" id="qErr1" role="alert"></p>
        <div class="srow"><button class="btn pri" type="button" data-next>Next</button></div>
      </div>
      <div class="qstep" data-step="2">
        <span class="legend" id="qSvcL">What do you want done?</span>
        <div class="picks" id="qSvc" role="group" aria-labelledby="qSvcL"></div>
        <div class="field" id="qFinF"><label for="qFin">Wrap finish</label>
          <select id="qFin"><option>Satin black</option><option>Gloss black</option><option>Satin grey</option><option>Satin red</option><option>Color shift</option><option>Not sure yet</option></select></div>
        <p class="err" id="qErr2" role="alert"></p>
        <div class="srow"><button class="btn sec" type="button" data-back>Back</button><button class="btn pri" type="button" data-next>Next</button></div>
      </div>
      <div class="qstep" data-step="3">
        <div class="field"><label for="qName">Your name</label><input id="qName" type="text" autocomplete="name"></div>
        <div class="field"><label for="qPhone">Mobile number</label><input id="qPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="614 555 0123"></div>
        <span class="legend" id="qHowL">How should we reach you?</span>
        <div class="picks" role="group" aria-labelledby="qHowL">
          <label><input type="radio" name="qHow" id="qHowText" value="text" checked>Text me</label>
          <label><input type="radio" name="qHow" id="qHowCall" value="call">Call me</label>
        </div>
        <p class="err" id="qErr3" role="alert"></p>
        <div class="srow"><button class="btn sec" type="button" data-back>Back</button><button class="btn pri" type="submit" id="qSend">Request my price</button></div>
      </div>
      <div class="qstep" data-step="4">
        <dl class="sum" id="qSum"></dl>
        <p class="note flag" id="qDone"></p>
        <div class="srow"><button class="btn pri" type="button" data-close>Done</button></div>
      </div>
    </form>
  </div>
</div>

<div class="scrim" id="uScrim" hidden>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="uTitle">
    <div class="shead"><h2 id="uTitle">See it on your car</h2><button class="x" type="button" data-close aria-label="Close">×</button></div>
    <p class="prog">Photo, finish, price</p>
    <div class="qstep show">
      <label class="drop" id="drop" for="uFile">
        <input id="uFile" type="file" accept="image/*">
        <span id="dropT"><b>Add a photo of your car</b><br>A side or front three-quarter shot in daylight works best.</span>
      </label>
      <span class="legend">Finish to try</span>
      <div class="usw" id="usw" role="group" aria-label="Finish to try"></div>
      <p class="note">We send your car back in this finish, with your quote.</p>
      <div class="srow"><button class="btn pri" type="button" id="uGo">Continue to my price</button></div>
    </div>
  </div>
</div>

<script type="module" src="{root}js/main.js"></script>
</body>
</html>
"""

INTRO = """<div class="intro" id="intro" hidden aria-hidden="true">
  <div class="ibg" id="ibg"></div>
  <div class="icard" id="icard"></div>
  <button class="iskip" id="iskip" type="button">Skip</button>
</div>
"""

HOME_FAQ = [
    ["How much does a wrap cost?", "It depends on the vehicle, the film and how much of it is covered, so we do not post a flat number. Send the car and you get a written quote."],
    ["Where are you?", "We work in Columbus, Ohio and nearby, including Dublin and Hilliard. Start with the price form and we will arrange the rest."],
    ["Can I see it on my own car first?", "Yes. Upload a photo and pick a finish, and we send your car back in that finish with the quote."],
    ["Do you do business vehicles?", "Yes. Vans, buses, food trucks and boats are all in our archive. See the commercial page."],
]
FLEET_FAQ = [
    ["Do you design the graphics?", "Yes. Send the logo and the vehicle list and the design proof comes back with the quote."],
    ["Can you match one design across different vehicles?", "Yes. The design is laid out per vehicle so the brand reads the same on a van, a bus and a truck."],
    ["How is fleet work priced?", "Per vehicle, by size and coverage, with the design quoted once. Everything is in writing before printing starts."],
]

def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full) or ROOT, exist_ok=True)
    open(full, "w").write(text)

def page_home():
    r = ""
    body = INTRO + top(r, "personal") + "<main>\n" + hero_personal() + tunnel(r) + services_band(r) + work_band(r) + fleet_teaser(r) + how() + faq(HOME_FAQ) + final() + "</main>\n" + footer(r, home=True) + chrome(r)
    write("index.html", head(r, "", "EveryWrap | Vinyl wraps, PPF and window tint in Columbus, Ohio",
          "Colour-change vinyl wraps, paint protection film, window tint, body kits and fleet graphics in Columbus, Ohio. See real jobs and get a written quote.", extra_ld=[faq_ld(HOME_FAQ)]) + body)

def page_service(s):
    r = "../"
    pts = "".join(f"<div data-reveal><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in s["points"])
    related = f"""<section class="band workband" aria-labelledby="relh">
  <div class="bandhead" data-reveal><h2 id="relh">Our work.</h2></div>
  {wall(r, limit=9, tag=s['tag'], filters=False)}
</section>
""" if s["tag"] else ""
    svc_ld = {"@context": "https://schema.org", "@type": "Service", "name": s["name"], "serviceType": s["name"], "provider": {"@id": SITE["domain"] + "/#business"},
              "areaServed": f"{SITE['city']}, {SITE['region']}", "url": canonical(s["slug"]), "description": s["desc"]}
    body = top(r, "personal") + "<main>\n" + hero_personal(eyebrow=s["h1"]) + f"""<section class="band about" aria-labelledby="abouth">
  <div class="about-in">
    <h2 id="abouth" data-reveal>{e(s['name'])}, plainly.</h2>
    <p class="lead" data-reveal>{e(s['lead'])}</p>
    <dl class="points">{pts}</dl>
    <aside class="pricebox" data-reveal><h3>What it costs</h3><p>Every vehicle is priced on its own, so there is no flat number here. You get a written quote first, and nothing starts until you agree to it.</p><button class="btn pri" type="button" data-quote="{s['ch']}">Book now</button></aside>
  </div>
</section>
""" + related + faq(s["faq"]) + final() + "</main>\n" + footer(r) + chrome(r)
    write(f"{s['slug']}/index.html", head(r, s["slug"], s["title"], s["desc"], ch=s["ch"], lock=True, extra_ld=[svc_ld, faq_ld(s["faq"])]) + body)

def page_commercial():
    r = "../"
    by = {j["id"]: j for j in WORK}
    com = [j for j in WORK if "commercial" in j["tags"]]
    cats = [(c, by[c["job"]]) for c in SITE["fleet"] if c["job"] in by]
    prints = "".join(f'<figure class="fw-print"><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"])}" width="{j["w"]}" height="{j["h"]}"></figure>' for _, j in (cats[1], cats[0], cats[2]))
    tray = "".join(f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}" data-src="{r}assets/{j["src"]}" data-alt="{e(j["title"])}"><img loading="lazy" src="{r}assets/{j["src"]}" alt="" width="{j["w"]}" height="{j["h"]}"><span>{e(c["label"])}</span></button>' for i, (c, j) in enumerate(cats))
    boards = "".join(f'<figure><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"])}" width="{j["w"]}" height="{j["h"]}"><figcaption>{e(j["title"])}</figcaption></figure>' for j in com)
    body = top(r, "commercial") + "<main>\n" + hero_fleet() + f"""<section class="fleetword" aria-labelledby="fwh">
  <h2 class="fw-word" id="fwh"><span>YOUR</span><span>FLEET</span></h2>
  <div class="fw-prints">{prints}</div>
  <div class="fw-tray" role="group" aria-label="Vehicle type">{tray}</div>
  <p class="fw-note">Tap a type to bring it forward.</p>
</section>
<section class="motion" aria-labelledby="moh">
  <div class="mo-pin">
    <canvas aria-hidden="true"></canvas>
    <h2 class="mo-head" id="moh"><span>YOUR BRAND</span><span>IN MOTION.</span></h2>
    <p class="mo-sub">Every vehicle on the road is seen all day. These are jobs we have printed and installed.</p>
    <div class="mo-wall"><div class="mo-track">{boards}</div></div>
  </div>
</section>
<section class="band lineup" aria-labelledby="lineh">
  <div class="lineup-in">
    {live_board(r, 'wide')}
    <div data-reveal>
      <h2 id="lineh">Make it work.</h2>
      <p>One design, laid out for each vehicle so the brand reads the same on all of them.</p>
      <ol class="fleetsteps"><li>Send the logo and the vehicle list.</li><li>Approve the design proof and the written quote.</li><li>We print, install and hand the vehicles back.</li></ol>
    </div>
  </div>
</section>
<section class="band workband" aria-labelledby="cwh">
  <div class="bandhead" data-reveal><h2 id="cwh">Work that works.</h2></div>
  {wall(r, tag='commercial', filters=False, more=False)}
</section>
""" + faq(FLEET_FAQ, "Fleet questions") + final(com=True) + "</main>\n" + footer(r) + chrome(r, com=True)
    svc_ld = {"@context": "https://schema.org", "@type": "Service", "name": "Fleet graphics and commercial vehicle wraps", "provider": {"@id": SITE["domain"] + "/#business"}, "areaServed": f"{SITE['city']}, {SITE['region']}", "url": canonical("commercial")}
    write("commercial/index.html", head(r, "commercial", "Fleet graphics and commercial wraps in Columbus, Ohio | EveryWrap",
          "Fleet graphics for vans, buses, food trucks and boats, designed, printed and installed in Columbus, Ohio. See real jobs and get a written quote.", mode="commercial", extra_ld=[svc_ld, faq_ld(FLEET_FAQ)]) + body)

def page_work():
    r = "../"
    gal = {"@context": "https://schema.org", "@type": "ImageGallery", "name": "EveryWrap work", "url": canonical("work"),
           "image": [{"@type": "ImageObject", "contentUrl": f"{SITE['domain']}/assets/{j['src']}", "name": j["title"], "caption": j.get("finish", "")} for j in WORK[:40]]}
    body = top(r, "personal") + f"""<main>
<section class="pagehead">
  <p class="eyebrow">Our work</p>
  <h1 class="display">Proof in the finish.</h1>
  <p class="sub">Wraps, colour changes and fleet graphics we have installed. Tap any one for the film and the story.</p>
</section>
<section class="band workband">
  <div class="work-split">
  {reel()}
  {wall(r, more=False)}
  </div>
</section>
""" + final() + "</main>\n" + footer(r) + chrome(r)
    write("work/index.html", head(r, "work", "Our work: real wraps and fleet graphics | EveryWrap",
          f"{len(WORK)} real EveryWrap jobs: satin black wraps, colour changes, colour-shift film and fleet graphics, with the film and location for each.", extra_ld=[gal]) + body)

def extras():
    paths = [""] + [s["slug"] for s in SERVICES] + ["commercial", "work"]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{canonical(p)}</loc></url>\n" for p in paths) + "</urlset>\n")
    write("robots.txt", (f"User-agent: *\nAllow: /\nSitemap: {SITE['domain']}/sitemap.xml\n" if LIVE else "User-agent: *\nDisallow: /\n"))
    write("site.webmanifest", json.dumps({"name": "EveryWrap", "short_name": "EveryWrap", "start_url": "./", "display": "standalone", "background_color": "#000000", "theme_color": "#000000", "icons": [{"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))
    write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0b0c"/><rect x="0" y="0" width="32" height="64" rx="0" fill="#f3ede2" clip-path="inset(0 round 14px 0 0 14px)"/><rect x="30" y="8" width="4" height="48" rx="2" fill="#ef5b2a"/></svg>\n')

if __name__ == "__main__":
    page_home()
    for s in SERVICES:
        page_service(s)
    page_commercial()
    page_work()
    extras()
    print(("LIVE" if LIVE else "PREVIEW"), "build:", 3 + len(SERVICES), "pages,", len(WORK), "jobs")
