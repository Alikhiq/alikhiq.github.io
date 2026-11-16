#!/usr/bin/env python3
"""Generate every page of the site from the data files.

    python3 tools/build_site.py            preview build (noindex, links end in index.html)
    python3 tools/build_site.py --live     launch build (indexable, clean links)

Reads data/site.json, data/services.json, data/work.json and assets/manifest.json.
Writes index.html, one folder per service, commercial/, work/, sitemap.xml,
robots.txt, site.webmanifest and favicon.svg. Edit the data, not the output.
"""
import html, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LIVE = "--live" in sys.argv
J = lambda p: json.load(open(os.path.join(ROOT, p)))
SITE, SERVICES, WORK, PRICING, COPY = J("data/site.json"), J("data/services.json"), J("data/work.json"), J("data/pricing.json"), J("data/copy.json")
e = html.escape
if LIVE and not PRICING.get("confirmed"):
    sys.exit('data/pricing.json is still a draft. Check every number with the owner, set "confirmed": true, then run --live again.')

def money(n):
    return f"${n:,}" if float(n).is_integer() else f"${n:,.2f}"

def price(ref):
    """'wrap.full' or 'wrap.full.1' -> the starting price for that row (and size column)."""
    parts = ref.split(".")
    row = next(r for r in PRICING["groups"][parts[0]]["rows"] if r["id"] == parts[1])
    v = row["from"]
    return v[int(parts[2]) if len(parts) > 2 else 0] if isinstance(v, list) else v

def low(group):
    """Lowest starting price in a group."""
    vals = [r["from"][0] if isinstance(r["from"], list) else r["from"] for r in PRICING["groups"][group]["rows"] if r.get("from")]
    return min(vals) if vals else None

def lead(group):
    """The headline starting price of a group: the row its cards and summaries quote."""
    g = PRICING["groups"][group]
    v = next(r for r in g["rows"] if r["id"] == g["lead"])["from"]
    return v[0] if isinstance(v, list) else v

def fill(x):
    """Copy can quote prices as {$wrap.full} so the words never drift from the table."""
    if isinstance(x, str):
        return re.sub(r"\{\$([\w.-]+)\}", lambda m: money(price(m.group(1))), x)
    if isinstance(x, list):
        return [fill(v) for v in x]
    if isinstance(x, dict):
        return {k: fill(v) for k, v in x.items()}
    return x

SERVICES, COPY = fill(SERVICES), fill(COPY)
AREAS = SITE["area"] + SITE.get("nearby", [])
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
            "areaServed": [{"@type": "City", "name": f"{c}, {SITE['region']}"} for c in AREAS], "sameAs": [u for _, u in SITE["instagram"]], "priceRange": "$$",
            "knowsAbout": ["Vinyl vehicle wraps", "Paint protection film", "Window tint", "Body kits", "Fleet graphics"]}

def head(root, path, title, desc, mode="personal", ch="", lock=False, extra_ld=(), glow=None):
    robots = "index,follow" if LIVE else "noindex,nofollow"
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": canonical("")}]
    if path:
        crumbs.append({"@type": "ListItem", "position": 2, "name": title.split(" | ")[0], "item": canonical(path)})
    lds = [business(), {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}, *extra_ld]
    return f"""<!DOCTYPE html>
<html lang="en" data-mode="{mode}" data-root="{root}"{f' data-ch="{ch}"' if ch else ''}{' data-lock="1"' if lock else ''}{f' style="--glow:{glow[0]};--glow2:{glow[1]}"' if glow else ''}>
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
    <li><a href="{link(root, 'design-print')}">Design and print</a></li>
    <li><a href="{link(root, 'pricing')}">Pricing</a></li>
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
      <p class="sub" id="sub">{e(COPY['home']['sub'])}</p>
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
      <h1 class="eyebrow">{e(COPY['commercial']['h1'])}</h1>
      <p class="display" id="h1"><span>Your van is</span> <span>a billboard.</span></p>
      <p class="sub" id="sub">{e(COPY['commercial']['sub'])}</p>
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
    <p class="tsub">{e(COPY['home']['tunnel_sub'])}</p>
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

# Each service has its own colour and its own picture: assets/svc/<ch>.webp.
# If a short clip exists at assets/loops/<ch>.mp4 it fades in over the picture and loops.
SVC_THEME = {"wrap": "#ef5b2a", "ppf": "#6fd3ff", "tint": "#a78bff", "kits": "#ff3347"}

def svc_visual(root, ch, alt=""):
    still = f'<img loading="lazy" src="{root}assets/svc/{ch}.webp" alt="{e(alt)}" width="2400" height="1340">'
    loop = f"assets/loops/{ch}.mp4"
    clip = f'<video muted loop playsinline preload="none" aria-hidden="true" data-src="{root}{loop}"></video>' if os.path.exists(os.path.join(ROOT, loop)) else ""
    return f'<div class="svc-vis" data-live>{still}{clip}<i class="svc-fx" aria-hidden="true"></i></div>'

def services_band(root):
    cards = "".join(f"""<li class="svc" style="--i:{i};--th:{SVC_THEME[s['ch']]}">
      <a href="{link(root, s['slug'])}">
        {svc_visual(root, s['ch'])}
        <div class="svc-txt">
          <span class="svc-n">0{i + 1}</span>
          <h3>{e(s['name'])}</h3>
          <p>{e(s['card'])}</p>
          <span class="svc-go">{('From ' + money(lead(s['price_group']))) if lead(s['price_group']) else 'Quoted per car'} {ARROW}</span>
        </div>
      </a>
    </li>""" for i, s in enumerate(SERVICES))
    return f"""<section class="band services" aria-labelledby="svch">
  <div class="bandhead" data-reveal><h2 id="svch">{e(COPY['home']['services_h2'])}</h2><p>{e(COPY['home']['services_p'])}</p></div>
  <ol class="svclist">{cards}</ol>
</section>
"""

def price_table(group):
    """Rows of starting prices. Where the price depends on vehicle size, tabs switch the column."""
    g, sizes = PRICING["groups"][group], PRICING["sizes"]
    sized = any(isinstance(r.get("from"), list) for r in g["rows"])
    tabs = ('<div class="tabs glass ptabs" role="group" aria-label="Vehicle size">' + "".join(f'<button type="button" data-size="{i}" aria-pressed="{"true" if i == 0 else "false"}"{" class=live" if i == 0 else ""}>{e(lab)}</button>' for i, lab in enumerate(sizes)) + "</div>") if sized else ""
    def cell(r):
        v = r.get("from")
        if isinstance(v, list):
            return "".join(f'<span data-s="{i}">from <b>{money(n)}</b></span>' for i, n in enumerate(v))
        if v:
            return f"<span>{'' if r.get('exact') else 'from '}<b>{money(v)}</b>{(' <em>per ' + e(r['unit']) + '</em>') if r.get('unit') else ''}</span>"
        return f'<span class="q">{"Quoted per car" if group == "kits" else "Quoted"}</span>'
    def sw(r):
        return ('<i class="sw sw-' + r["swatch"] + '" aria-hidden="true"></i>') if r.get("swatch") else ""
    rows = "".join(f'<li>{sw(r)}<div><b>{e(r["name"])}</b>{("<span>" + e(r["note"]) + "</span>") if r.get("note") else ""}</div><p class="pp">{cell(r)}</p></li>' for r in g["rows"])
    return f'<div class="ptable" data-size="0">{tabs}<ul class="prows">{rows}</ul></div>'

def price_band(group, h2, intro, factors, theme="", book_sub="Get your exact price"):
    facts = "".join(f"<li>{e(x)}</li>" for x in factors)
    return f"""<section class="band prices" id="prices" aria-labelledby="priceh"{f' style="--th:{theme}"' if theme else ''}>
  <div class="bandhead" data-reveal><h2 id="priceh">{e(h2)}</h2><p>{e(intro)}</p></div>
  <div class="price-in">
    {price_table(group)}
    <aside class="pfact" data-reveal><h3>What moves the price</h3><ul>{facts}</ul><button class="btn pri" type="button" data-quote>Get my exact price</button></aside>
  </div>
  <p class="pfine">{e(COPY['price_fine'])}</p>
</section>
"""

def prices_home(root):
    c = COPY["home"]
    cards = "".join(f'<a class="pcard" href="{link(root, slug)}" style="--th:{th}"><span>{e(name)}</span><b>{("from " + money(lead(g))) if lead(g) else "Quoted"}</b><small>{e(note)}</small></a>' for name, g, slug, th, note in [
        ("Vinyl wrap", "wrap", "vinyl-wrap", SVC_THEME["wrap"], c["price_notes"][0]), ("Protection film", "ppf", "paint-protection-film", SVC_THEME["ppf"], c["price_notes"][1]),
        ("Window tint", "tint", "window-tint", SVC_THEME["tint"], c["price_notes"][2]), ("Fleet graphics", "fleet", "commercial", "#f2c200", c["price_notes"][3])])
    return f"""<section class="band prices" aria-labelledby="phomeh">
  <div class="bandhead" data-reveal><h2 id="phomeh">{e(c['prices_h2'])}</h2><p>{e(c['prices_p'])}</p></div>
  <div class="pgrid" data-reveal>{cards}</div>
  <p class="wallmore"><a class="btn sec" href="{link(root, 'pricing')}">See every price {ARROW}</a></p>
</section>
"""

def know(items):
    return '<dl class="know">' + "".join(f"<div data-reveal><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in items) + "</dl>"

def areas(root, current=""):
    others = "".join(f'<li><a href="{link(root, x["slug"])}">{e(x["name"])}</a></li>' for x in SERVICES if x["slug"] != current)
    return f"""<section class="band areas" aria-labelledby="areah">
  <div class="bandhead" data-reveal><h2 id="areah">Where we work</h2><p>{e(COPY['areas_p'])}</p></div>
  <ul class="arealist" data-reveal>{''.join(f'<li>{e(a)}</li>' for a in AREAS)}</ul>
  <ul class="crosslinks" data-reveal>{others}<li><a href="{link(root, 'commercial')}">Fleet and commercial</a></li><li><a href="{link(root, 'design-print')}">Design and print</a></li><li><a href="{link(root, 'pricing')}">All prices</a></li></ul>
</section>
"""

def offer(group):
    lo = low(group)
    return {"@type": "AggregateOffer", "priceCurrency": "USD", "lowPrice": lo} if lo else None

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
      <p>{e(COPY['home']['teaser_p'])}</p>
      <a class="btn pri" href="{link(root, 'commercial')}">See fleet work {ARROW}</a>
    </div>
    {live_board(root)}
  </div>
</section>
"""

def how():
    c = COPY["how"]
    return f"""<section class="band how" aria-labelledby="howh">
  <div class="bandhead" data-reveal><h2 id="howh">{e(c['h2'])}</h2></div>
  <ol class="steps3" data-reveal>
    {''.join(f'<li><i>{n + 1}</i><b>{e(a)}</b><span>{e(b)}</span></li>' for n, (a, b) in enumerate(c['steps']))}
  </ol>
</section>
"""

def final(com=False):
    c = COPY["final_com" if com else "final"]
    return f"""<section class="final" aria-labelledby="finalh">
  <h2 id="finalh" data-reveal>{e(c['h2'])}</h2>
  <p data-reveal>{e(c['p'])}</p>
  <div class="final-cta" data-reveal>{book('Book now', c['book'])}<button class="trylink" type="button" data-upload>{CAM} {e(c['photo'])}</button></div>
</section>
"""

def footer(root, home=False):
    area = ", ".join(SITE["area"])
    insta = "".join(f'<li><a href="{u}" rel="noopener">@{h}</a></li>' for h, u in SITE["instagram"])
    return f"""<footer class="foot">
  <div class="foot-grid">
    <div><p class="tag">{e(SITE['tagline'])}</p><p>{e(SITE['name'])}. Car wraps, paint protection film, window tint and fleet graphics for {e(area)} and the rest of central {SITE['region']}.</p></div>
    <nav aria-label="Services"><h2>Services</h2><ul>{''.join(f'<li><a href="{link(root, s["slug"])}">{e(s["name"])}</a></li>' for s in SERVICES)}<li><a href="{link(root, 'commercial')}">Fleet and commercial</a></li><li><a href="{link(root, 'design-print')}">Design and print</a></li></ul></nav>
    <nav aria-label="More"><h2>See</h2><ul><li><a href="{link(root, 'pricing')}">Pricing</a></li><li><a href="{link(root, 'work')}">Our work</a></li>{insta}</ul></nav>
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
        <div id="qSizeF"><span class="legend" id="qSizeL">Vehicle size</span>
          <div class="picks" role="group" aria-labelledby="qSizeL">{''.join(f'<label><input type="radio" name="qSize" value="{i}"{" checked" if i == 0 else ""}>{e(x)}</label>' for i, x in enumerate(PRICING["sizes"]))}</div></div>
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

def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full) or ROOT, exist_ok=True)
    open(full, "w").write(text)

def service_ld(name, slug, desc, group):
    d = {"@context": "https://schema.org", "@type": "Service", "name": name, "serviceType": name, "provider": {"@id": SITE["domain"] + "/#business"},
         "areaServed": [f"{a}, {SITE['region']}" for a in AREAS], "url": canonical(slug), "description": desc}
    if offer(group):
        d["offers"] = offer(group)
    return d

def page_home():
    r, c = "", COPY["home"]
    body = INTRO + top(r, "personal") + "<main>\n" + hero_personal(eyebrow=c["h1"]) + tunnel(r) + services_band(r) + work_band(r) + prices_home(r) + fleet_teaser(r) + design_teaser(r) + how() + faq(c["faq"]) + areas(r) + final() + "</main>\n" + footer(r, home=True) + chrome(r)
    write("index.html", head(r, "", c["title"], c["desc"], extra_ld=[faq_ld(c["faq"])]) + body)

def page_service(s):
    r, th = "../", SVC_THEME[s["ch"]]
    pts = "".join(f"<div data-reveal><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in s["points"])
    related = f"""<section class="band workband" aria-labelledby="relh">
  <div class="bandhead" data-reveal><h2 id="relh">{e(s['work_h2'])}</h2></div>
  {wall(r, limit=9, tag=s['tag'], filters=False)}
</section>
""" if s["tag"] else ""
    body = top(r, "personal") + "<main>\n" + hero_personal(eyebrow=s["h1"]) + f"""<section class="band about" aria-labelledby="abouth">
  <div class="about-in" style="--th:{th}">
    <div class="about-vis" data-reveal>{svc_visual(r, s['ch'], s['img_alt'])}</div>
    <h2 id="abouth" data-reveal>{e(s['about_h2'])}</h2>
    <p class="lead" data-reveal>{e(s['lead'])}</p>
    <dl class="points">{pts}</dl>
  </div>
</section>
""" + price_band(s["price_group"], s["price_h2"], s["price_intro"], s["factors"], th, s["name"]) + f"""<section class="band" aria-labelledby="knowh">
  <div class="bandhead" data-reveal><h2 id="knowh">Good to know</h2></div>
  {know(s['know'])}
</section>
""" + related + faq(s["faq"], s["faq_h2"]) + areas(r, s["slug"]) + final() + "</main>\n" + footer(r) + chrome(r)
    write(f"{s['slug']}/index.html", head(r, s["slug"], s["title"], s["desc"], ch=s["ch"], lock=True, extra_ld=[service_ld(s["name"], s["slug"], s["desc"], s["price_group"]), faq_ld(s["faq"])]) + body)

def page_commercial():
    r, c = "../", COPY["commercial"]
    by = {j["id"]: j for j in WORK}
    com = [j for j in WORK if "commercial" in j["tags"]]
    cats = [(x, by[x["job"]]) for x in SITE["fleet"] if x["job"] in by]
    prints = "".join(f'<figure class="fw-print"><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"])}" width="{j["w"]}" height="{j["h"]}"></figure>' for _, j in (cats[1], cats[0], cats[2]))
    tray = "".join(f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}" data-src="{r}assets/{j["src"]}" data-alt="{e(j["title"])}"><img loading="lazy" src="{r}assets/{j["src"]}" alt="" width="{j["w"]}" height="{j["h"]}"><span>{e(x["label"])}</span></button>' for i, (x, j) in enumerate(cats))
    boards = "".join(f'<figure><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"])}" width="{j["w"]}" height="{j["h"]}"><figcaption>{e(j["title"])}</figcaption></figure>' for j in com)
    steps = "".join(f"<li>{e(x)}</li>" for x in c["steps"])
    body = top(r, "commercial") + "<main>\n" + hero_fleet() + f"""<section class="fleetword" aria-labelledby="fwh">
  <h2 class="fw-word" id="fwh"><span>YOUR</span><span>FLEET</span></h2>
  <div class="fw-prints">{prints}</div>
  <div class="fw-tray" role="group" aria-label="Vehicle type">{tray}</div>
  <p class="fw-note">{e(c['fleet_note'])}</p>
</section>
<section class="motion" aria-labelledby="moh">
  <div class="mo-pin">
    <canvas aria-hidden="true"></canvas>
    <h2 class="mo-head" id="moh"><span>YOUR BRAND</span><span>IN MOTION.</span></h2>
    <p class="mo-sub">{e(c['motion_sub'])}</p>
    <div class="mo-wall"><div class="mo-track">{boards}</div></div>
  </div>
</section>
<section class="band lineup" aria-labelledby="lineh">
  <div class="lineup-in">
    {live_board(r, 'wide')}
    <div data-reveal>
      <h2 id="lineh">{e(c['line_h2'])}</h2>
      <p>{e(c['line_p'])}</p>
      <ol class="fleetsteps">{steps}</ol>
    </div>
  </div>
</section>
""" + price_band("fleet", c["price_h2"], c["price_intro"], c["factors"], "", "Fleet graphics") + f"""<section class="band workband" aria-labelledby="cwh">
  <div class="bandhead" data-reveal><h2 id="cwh">{e(c['work_h2'])}</h2></div>
  {wall(r, tag='commercial', filters=False, more=False)}
</section>
""" + faq(c["faq"], "Fleet wrap questions") + areas(r) + final(com=True) + "</main>\n" + footer(r) + chrome(r, com=True)
    write("commercial/index.html", head(r, "commercial", c["title"], c["desc"], mode="commercial", extra_ld=[service_ld("Fleet graphics and commercial vehicle wraps", "commercial", c["desc"], "fleet"), faq_ld(c["faq"])]) + body)

def page_pricing():
    r, c = "../", COPY["pricing"]
    groups = [(x["name"], x["price_group"], x["slug"], x["price_intro"], SVC_THEME[x["ch"]]) for x in SERVICES] + [("Fleet and commercial", "fleet", "commercial", COPY["commercial"]["price_intro"], "#f2c200"), ("Large-format printing", "print", "design-print", "Priced by the square foot.", "#27d3ff"), ("Design", "design", "design-print", COPY["design"]["design_price_p"], "#ff4fa3")]
    blocks = "".join(f"""<section class="band prices" id="{slug}" aria-labelledby="ph-{g}" style="--th:{th}">
  <div class="bandhead" data-reveal><h2 id="ph-{g}">{e(name)}</h2><p>{e(intro)} <a href="{link(r, slug)}">More on {e(name.lower())}</a></p></div>
  {price_table(g)}
</section>
""" for name, g, slug, intro, th in groups)
    facts = "".join(f"<li>{e(x)}</li>" for x in c["factors"])
    catalog = {"@context": "https://schema.org", "@type": "OfferCatalog", "name": "EveryWrap prices", "url": canonical("pricing"),
               "itemListElement": [{"@type": "Offer", "name": row["name"], "priceCurrency": "USD", "price": (row["from"][0] if isinstance(row["from"], list) else row["from"]), **({"unitText": row["unit"]} if row.get("unit") else {}), "category": PRICING["groups"][g]["title"]}
                                   for g in PRICING["groups"] for row in PRICING["groups"][g]["rows"] if row.get("from")]}
    body = top(r, "personal") + f"""<main>
<section class="pagehead">
  <p class="eyebrow">Pricing</p>
  <h1 class="display">{e(c['h1'])}</h1>
  <p class="sub">{e(c['sub'])}</p>
</section>
""" + blocks + f"""<section class="band" aria-labelledby="pfh">
  <div class="bandhead" data-reveal><h2 id="pfh">What moves the price</h2></div>
  <ul class="pfactlist" data-reveal>{facts}</ul>
  <p class="pfine">{e(COPY['price_fine'])}</p>
</section>
""" + faq(c["faq"], "Pricing questions") + areas(r) + final() + "</main>\n" + footer(r) + chrome(r)
    write("pricing/index.html", head(r, "pricing", c["title"], c["desc"], extra_ld=[catalog, faq_ld(c["faq"])]) + body)

def design_teaser(root):
    c = COPY["home"]
    return f"""<section class="band dteaser" aria-labelledby="dth">
  <a class="dt-card" href="{link(root, 'design-print')}" data-reveal>
    <div class="printer" data-live><img loading="lazy" src="{root}assets/dp/van.webp" alt="A cargo van in a full printed advertising wrap" width="1920" height="1072"><i class="printer-bar" aria-hidden="true"></i></div>
    <div class="dt-txt"><h2 id="dth">{e(c['design_h2'])}</h2><p>{e(c['design_p'])}</p><span class="svc-go">Design and print {ARROW}</span></div>
  </a>
</section>
"""

def page_design():
    r, c = "../", COPY["design"]
    by = {j["id"]: j for j in WORK}
    def card(i, x):
        if x.get("job"):
            j = by[x["job"]]; img = f'<img loading="lazy" style="object-position:50% 74%" src="{r}assets/{j["src"]}" alt="{e(j["title"] + ", " + j.get("finish", ""))}" width="{j["w"]}" height="{j["h"]}">'
        else:
            img = f'<img loading="lazy" src="{r}assets/{x["img"]}" alt="{e(x["alt"])}" width="1920" height="1072">'
        return f"""<li class="svc" style="--i:{i};--th:{x['th']}"><div class="svc-card"><div class="svc-vis" data-live>{img}<i class="svc-fx" aria-hidden="true"></i></div>
        <div class="svc-txt"><span class="svc-n">0{i + 1}</span><h3>{e(x['name'])}</h3><p>{e(x['text'])}</p></div></div></li>"""
    cards = "".join(card(i, x) for i, x in enumerate(c["services"]))
    prods = PRICING["groups"]["print"]["rows"]
    opts = "".join(f'<option value="{x["id"]}" data-price="{x["from"]}">{e(x["name"])}</option>' for x in prods if x.get("unit") == "sq ft")
    tiles = "".join(f'<li><i class="sw sw-{x["swatch"]}" aria-hidden="true"></i><b>{e(x["name"])}</b><span>{e(x["note"])}</span></li>' for x in prods)
    jobs = [by[i] for i in ("everywrapny-2-sprinter-commercial-litmode", "2021-04-07-cnwvghosdur", "everywrapny-4-queens-public-library-bus", "2023-07-02-cunmnmqasdd", "2022-07-18-cglbmplvpx3", "614lux-4-wall-mural-install", "2022-08-20-chdssmxrqyy", "2021-04-28-conrpnrjnuq", "2022-03-12-ca_mzkerq_j") if i in by]
    shots = "".join(f'<figure><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"] + ", " + j.get("finish", ""))}" width="{j["w"]}" height="{j["h"]}"><figcaption>{e(j["title"])}<span>{e(j.get("finish", ""))}</span></figcaption></figure>' for j in jobs)
    body = top(r, "personal") + f"""<main>
<section class="pagehead dp-head">
  <h1 class="eyebrow">{e(c['h1'])}</h1>
  <p class="display">{e(c['display'])}</p>
  <p class="sub">{e(c['sub'])}</p>
  <div class="printer big" data-live><img src="{r}assets/dp/van.webp" alt="A cargo van in a full printed advertising wrap" width="1920" height="1072"><i class="printer-bar" aria-hidden="true"></i></div>
</section>
<section class="band services" aria-labelledby="dsh">
  <div class="bandhead" data-reveal><h2 id="dsh">{e(c['design_h2'])}</h2><p>{e(c['design_p'])}</p></div>
  <ol class="svclist">{cards}</ol>
</section>
<section class="band how" aria-labelledby="dhow">
  <div class="bandhead" data-reveal><h2 id="dhow">{e(c['steps_h2'])}</h2></div>
  <ol class="steps3" data-reveal>{''.join(f'<li><i>{n + 1}</i><b>{e(a)}</b><span>{e(b)}</span></li>' for n, (a, b) in enumerate(c['steps']))}</ol>
</section>
<section class="band prices" id="design" aria-labelledby="dph" style="--th:#ff4fa3">
  <div class="bandhead" data-reveal><h2 id="dph">{e(c['design_price_h2'])}</h2><p>{e(c['design_price_p'])}</p></div>
  <div class="price-in">
    {price_table('design')}
    <aside class="pfact" data-reveal><h3>Start a design</h3><ul><li>Tell us the vehicle and send the logo if you have one</li><li>You get a proof on your own vehicle</li><li>Nothing is printed until you approve it</li></ul><button class="btn pri" type="button" data-quote="design">Start a design</button></aside>
  </div>
</section>
<section class="band prices" id="print" aria-labelledby="prh" style="--th:#27d3ff">
  <div class="bandhead" data-reveal><h2 id="prh">{e(c['print_h2'])}</h2><p>{e(c['print_p'])}</p></div>
  <div class="price-in">
    {price_table('print')}
    <aside class="pfact calc" id="calc" data-reveal>
      <h3>Price a print</h3>
      <div class="field"><label for="calcProd">Product</label><select id="calcProd">{opts}</select></div>
      <div class="calc-dims">
        <div class="field"><label for="calcW">Width (ft)</label><input id="calcW" type="number" inputmode="decimal" min="0" step="0.1" value="4.5"></div>
        <div class="field"><label for="calcH">Length (ft)</label><input id="calcH" type="number" inputmode="decimal" min="0" step="0.1" value="10"></div>
        <div class="field"><label for="calcQ">Copies</label><input id="calcQ" type="number" inputmode="numeric" min="1" step="1" value="1"></div>
      </div>
      <p class="calc-out" aria-live="polite"><span id="calcArea">45 sq ft</span><b id="calcTotal"></b></p>
      <button class="btn pri" type="button" id="calcGo">Order this print</button>
    </aside>
  </div>
  <p class="pfine">{e(COPY['price_fine'])}</p>
</section>
<section class="band" aria-labelledby="mph">
  <div class="bandhead" data-reveal><h2 id="mph">{e(c['more_h2'])}</h2></div>
  <ul class="mats" data-reveal>{tiles}</ul>
</section>
<section class="band" aria-labelledby="whyh">
  <div class="bandhead" data-reveal><h2 id="whyh">{e(c['why_h2'])}</h2></div>
  {know(c['why'])}
</section>
<section class="band" aria-labelledby="dwh">
  <div class="bandhead" data-reveal><h2 id="dwh">{e(c['work_h2'])}</h2></div>
  <div class="strip" data-reveal>{shots}</div>
</section>
""" + faq(c["faq"], "Design and print questions") + areas(r) + f"""<section class="final" aria-labelledby="finalh">
  <h2 id="finalh" data-reveal>Send the idea. Or send the files.</h2>
  <p data-reveal>Tell us what you need designed or printed. You get the price in writing, and nothing is printed until you approve the proof.</p>
  <div class="final-cta" data-reveal><button class="book live" type="button" data-quote="design"><i class="book-dot" aria-hidden="true"></i><span class="book-t"><b>Start a design</b><small>Or order a print</small></span><span class="book-go" aria-hidden="true">{ARROW}</span></button></div>
</section>
""" + "</main>\n" + footer(r) + chrome(r).replace("Get your price in writing", "Design and print")
    lds = [service_ld("Wrap design", "design-print", c["desc"], "design"), service_ld("Large-format printing", "design-print", c["desc"], "print"), faq_ld(c["faq"])]
    write("design-print/index.html", head(r, "design-print", c["title"], c["desc"], extra_ld=lds, glow=("#ff4fa3", "#27d3ff")) + body)

def page_work():
    r, c = "../", COPY["work"]
    gal = {"@context": "https://schema.org", "@type": "ImageGallery", "name": "EveryWrap work", "url": canonical("work"),
           "image": [{"@type": "ImageObject", "contentUrl": f"{SITE['domain']}/assets/{j['src']}", "name": j["title"], "caption": j.get("finish", "")} for j in WORK[:40]]}
    body = top(r, "personal") + f"""<main>
<section class="pagehead">
  <h1 class="eyebrow">{e(c['h1'])}</h1>
  <p class="display">{e(c['display'])}</p>
  <p class="sub">{e(c['sub'])}</p>
</section>
<section class="band workband">
  <div class="work-split">
  {reel()}
  {wall(r, more=False)}
  </div>
</section>
""" + areas(r) + final() + "</main>\n" + footer(r) + chrome(r)
    write("work/index.html", head(r, "work", c["title"], c["desc"], extra_ld=[gal]) + body)

def extras():
    paths = [""] + [x["slug"] for x in SERVICES] + ["commercial", "design-print", "pricing", "work"]
    # The page scripts read this copy: prices only, without the owner's notes and sources.
    pub = {"sizes": PRICING["sizes"], "groups": {k: {"rows": [{"id": r["id"], "from": r.get("from")} for r in g["rows"]]} for k, g in PRICING["groups"].items()}}
    write("assets/pricing.json", json.dumps(pub, separators=(",", ":")))
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{canonical(p)}</loc></url>\n" for p in paths) + "</urlset>\n")
    write("robots.txt", (f"User-agent: *\nAllow: /\nSitemap: {SITE['domain']}/sitemap.xml\n" if LIVE else "User-agent: *\nDisallow: /\n"))
    write("site.webmanifest", json.dumps({"name": "EveryWrap", "short_name": "EveryWrap", "start_url": "./", "display": "standalone", "background_color": "#000000", "theme_color": "#000000", "icons": [{"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))
    write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0b0c"/><rect x="0" y="0" width="32" height="64" rx="0" fill="#f3ede2" clip-path="inset(0 round 14px 0 0 14px)"/><rect x="30" y="8" width="4" height="48" rx="2" fill="#ef5b2a"/></svg>\n')

if __name__ == "__main__":
    page_home()
    for s in SERVICES:
        page_service(s)
    page_commercial()
    page_design()
    page_pricing()
    page_work()
    extras()
    print(("LIVE" if LIVE else "PREVIEW"), "build:", 5 + len(SERVICES), "pages,", len(WORK), "jobs,", "prices", "confirmed" if PRICING.get("confirmed") else "DRAFT")
