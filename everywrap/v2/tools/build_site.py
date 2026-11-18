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

def build_id():
    """A short id that changes whenever a script or the stylesheet changes."""
    import hashlib
    h = hashlib.sha256()
    for d, _, names in sorted(os.walk(os.path.join(ROOT, "js"))):
        for n in sorted(names):
            h.update(open(os.path.join(d, n), "rb").read())
    h.update(open(os.path.join(ROOT, "styles.css"), "rb").read())
    return h.hexdigest()[:10]

# On the live site the Worker serves /v/<id>/... as the same files, so every script a page loads carries the build id.
VER = ("v/" + build_id() + "/") if LIVE else ""
FONTS = "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,600..900;1,100..125,600..900&family=Barlow+Condensed:ital,wght@0,800;1,700&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap"
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
            "address": {"@type": "PostalAddress", "streetAddress": SITE["locations"][0]["street"], "addressLocality": SITE["locations"][0]["city"], "addressRegion": SITE["locations"][0]["region"], "postalCode": SITE["locations"][0]["zip"], "addressCountry": "US"},
            "location": [{"@type": "Place", "name": f"{SITE['name']} {x['city']}", "address": {"@type": "PostalAddress", "streetAddress": x["street"], "addressLocality": x["city"], "addressRegion": x["region"], "postalCode": x["zip"], "addressCountry": "US"}, **({"telephone": tel(x)} if tel(x) else {}), **({"hasMap": x["reviews"]} if x.get("reviews") else {})} for x in SITE["locations"]],
            "areaServed": [{"@type": "City", "name": f"{c}, {SITE['region']}"} for c in AREAS] + [{"@type": "City", "name": "Dearborn Heights, Michigan"}], "sameAs": [u for _, u in SITE["instagram"]] + [x["reviews"] for x in SITE["locations"] if x.get("reviews")], "priceRange": "$$",
            "knowsAbout": ["Vinyl vehicle wraps", "Paint protection film", "Window tint", "Body kits", "Fleet graphics"]}

def head(root, path, title, desc, mode="personal", ch="", lock=False, extra_ld=(), glow=None):
    robots = "index,follow" if LIVE else "noindex,nofollow"
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": canonical("")}]
    if path:
        crumbs.append({"@type": "ListItem", "position": 2, "name": title.split(" | ")[0], "item": canonical(path)})
    lds = [business(), {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}, *extra_ld]
    return f"""<!DOCTYPE html>
<html lang="en" data-mode="{mode}" data-root="{root}"{' data-live="1"' if LIVE else ''}{f' data-ch="{ch}"' if ch else ''}{' data-lock="1"' if lock else ''}{f' style="--glow:{glow[0]};--glow2:{glow[1]}"' if glow else ''}>
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
<link rel="stylesheet" href="{root}{VER}styles.css">
{chr(10).join(ld(x) for x in lds)}
</head>
<body>
"""

def href(root, target):
    """A catalogue target such as 'commercial#prices' as a link from this page."""
    slug, _, anchor = target.partition("#")
    return link(root, slug) + (("#" + anchor) if anchor else "")

def price_label(ref):
    """'from $2,800', or '$8.43 / sq ft' for the print list."""
    if not ref:
        return "<b>Quoted</b>"
    g, rid = ref.split(".")[:2]
    row = next(r for r in PRICING["groups"][g]["rows"] if r["id"] == rid)
    return ("" if row.get("exact") else "from ") + "<b>" + money(price(ref)) + "</b>" + ((" / " + e(row["unit"])) if row.get("unit") else "")

NAV = [("car", "Cars", ""), ("biz", "Business", "commercial"), ("studio", "Design", "design-print")]

LOGO = J("data/logo.json")

def sprite():
    """The wordmark's shapes, defined once per page and reused."""
    w_ = LOGO["word"]; x, y, w, h = w_["vb"]
    paths = "".join(f'<path fill-rule="evenodd" clip-rule="evenodd" d="{d}"/>' for d in w_["letters"])
    return ('<svg class="vh" aria-hidden="true" focusable="false"><defs>'
            f'<clipPath id="ew-wclip" clipPathUnits="userSpaceOnUse">{paths}</clipPath>'
            '<linearGradient id="ew-shine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
            f'<symbol id="ew-word" viewBox="{x} {y} {w} {h}">{paths}</symbol></svg>\n')

def mark(cls="logo-mark", attrs=""):
    """A stand-in icon until the final logo exists: a glossy ball in the live colour with a strip of film orbiting it."""
    return (f'<span class="orb {cls}"{attrs} aria-hidden="true"><span class="orb-ring back"><i></i></span><i class="orb-b"></i><span class="orb-ring front"><i></i></span></span>')

def wordmark(cls="logo-word"):
    x, y, w, h = LOGO["word"]["vb"]
    return (f'<svg class="{cls}" viewBox="{x} {y} {w} {h}" aria-hidden="true"><use href="#ew-word" x="{x}" y="{y}" width="{w}" height="{h}"/>'
            f'<rect class="lw-s" x="{x - 0.3 * w:.0f}" y="{y}" width="{0.26 * w:.0f}" height="{h}" fill="url(#ew-shine)" clip-path="url(#ew-wclip)"/></svg>')

def logo(root, cls=""):
    return ('<a class="logo' + ((" " + cls) if cls else "") + '" href="' + link(root, "") + '" aria-label="EveryWrap home">' + mark() + wordmark() + "</a>")

def top(root, mode, cat=None):
    cat = ("biz" if mode == "commercial" else "car") if cat is None else cat
    by = {j["id"]: j for j in WORK}
    pill = ""
    for k, label, slug in NAV:
        on = k == cat
        pill += '<a href="' + link(root, slug) + '" aria-current="' + ("true" if on else "false") + '"' + (' class="live"' if on else "") + ">" + label + "</a>"
    groups = ""
    for x in COPY["catalog"]["cats"]:
        items = "".join('<li><a href="' + href(root, t) + '">' + e(n) + "</a></li>" for n, _, _, t in x["items"])
        home = link(root, x["slug"] if x["id"] != "car" else "")
        groups += ('<div class="mgroup" style="--th:' + x["th"] + '"><a class="mpic" href="' + home + '"><img loading="lazy" src="' + root + "assets/" + x["img"] + '" alt="" width="1376" height="768"><span>' + e(x["name"]) + "</span></a><ul>" + items + "</ul></div>")
    wj = by.get("everywrapca-porsche-911-turbo-tiffany-blue") or WORK[0]
    tiles = ('<a class="mtile" href="' + link(root, "work") + '"><img loading="lazy" src="' + root + "assets/" + wj["src"] + '" alt=""><span>Our work</span></a>'
             '<a class="mtile" href="' + link(root, "pricing") + '"><img loading="lazy" src="' + root + 'assets/dp/rolls.webp" alt=""><span>All prices</span></a>'
             '<a class="mtile" href="' + link(root, "design-print") + '#mockup"><img loading="lazy" src="' + root + 'assets/concepts/elec.webp" alt=""><span>Mockup studio</span></a>')
    return sprite() + f"""<header class="top">
  {logo(root)}
  <nav class="mode glass" aria-label="What we do">{pill}</nav>
  <button class="menubtn glass" type="button" data-menu aria-expanded="false" aria-controls="menu" aria-label="Menu"><span></span><span></span></button>
</header>
<nav class="menu" id="menu" hidden aria-label="Site">
  <div class="mgroups">{groups}</div>
  <div class="mtiles">{tiles}</div>
  <div class="mfoot">{book('Book now', 'Get your price in writing')}{voice()}<a href="mailto:{SITE['email']}">{SITE['email']}</a></div>
</nav>
"""

TRUST_ICONS = {"quote": '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h5"/>', "check": '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
               "truck": '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'}

MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>'

def voice(label="Talk to our assistant"):
    """A link to the voice assistant, if one is set in data/site.json."""
    a = SITE.get("voice_agent")
    return ('<a class="trylink voice" data-voice="' + a + '" href="#chat" role="button">' + MIC + ' <span class="voice-t" data-idle="' + e(label) + '">' + e(label) + "</span></a>") if a else ""

TRUST_VIS = {
    "quote": '<i class="tv tv-doc" aria-hidden="true"><u></u><u></u><u></u><b>$</b></i>',
    "check": '<i class="tv tv-tog" aria-hidden="true"><u></u><b></b></i>',
    "layers": '<i class="tv tv-roll" aria-hidden="true"><span><b>3M</b><b>Avery</b><b>KPMF</b><b>TeckWrap</b><b>Arlon</b><b>3M</b></span></i>',
    "scale": '<i class="tv tv-vlt" aria-hidden="true"><u></u><b>50%</b></i>',
    "clock": '<i class="tv tv-tog" aria-hidden="true"><u></u><b></b></i>',
}

def trust_strip(key="trust"):
    """Four promises, each shown as a small moving picture with a short label."""
    def vis(k):
        return TRUST_VIS.get(k) or ('<i class="kicon">' + svg(TRUST_ICONS.get(k) or ICONS[k]) + "</i>")
    return '<ul class="trust" data-reveal>' + "".join("<li>" + vis(x[0]) + "<b>" + e(x[1]) + "</b>" + (("<span>" + e(x[2]) + "</span>") if len(x) > 2 else "") + "</li>" for x in COPY[key]) + "</ul>\n"

def suppliers():
    """The film wall: every finish on the car as a moving row of swatches, under the makers' names."""
    c = COPY["suppliers"]
    names = "".join("<span>" + e(n) + "</span>" for n in SITE["suppliers"])
    return f"""<section class="band suppliers" aria-labelledby="suph">
  <div class="bandhead" data-reveal><h2 id="suph">{e(c['h2'])}</h2><p>{e(c['p'])}</p></div>
  <div class="swmakers" aria-hidden="true"><div>{names}{names}</div></div>
  <div class="swall" id="swall" role="group" aria-label="Finishes"></div>
</section>
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

def maps(loc):
    if loc.get("reviews"):  # the Google listing itself, so Directions lands on the business
        return loc["reviews"]
    q = f"{loc['street']}, {loc['city']}, {loc['region']} {loc['zip']}"
    return "https://www.google.com/maps/search/?api=1&query=" + q.replace(",", "%2C").replace(" ", "+")

def tel(loc):
    d = re.sub(r"\D", "", loc.get("phone", ""))[-10:]
    return f"+1{d}" if len(d) == 10 else ""

def phone_txt(loc):
    d = tel(loc)[2:]
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if d else ""

def loc_extra(x):
    """Who runs the location, their number, and the Google reviews link when it is live."""
    who = f'<span class="loc-team">Run and installed by {e(x["team"])}</span>' if x.get("team") else ""
    ph = f'<a class="loc-tel" href="tel:{tel(x)}">{phone_txt(x)}</a>' if tel(x) else ""
    rv = f'<a class="loc-rev" href="{e(x["reviews"])}" target="_blank" rel="noopener"><span aria-hidden="true">★</span> Read our Google reviews</a>' if x.get("reviews") else ""
    ig = x.get("instagram", "")
    ig = f'<a class="loc-ig" href="{e(ig)}" target="_blank" rel="noopener">@{e(ig.rstrip("/").rsplit("/", 1)[-1])}</a>' if ig else ""
    return who + ph + ig + rv

def face(root, x, cls="face"):
    """The installer's round photo, when one exists for that location."""
    n = (x.get("team") or "").split()[0].lower() if x.get("team") else ""
    f = f"assets/team/{n}-face.webp"
    return f'<img class="{cls}" src="{root}{f}" alt="" width="320" height="320" loading="lazy">' if n and os.path.exists(os.path.join(ROOT, f)) else ""

def crew(root):
    """A compact line: who installs, where, with a tap to text them."""
    chips = "".join(f'<a class="crew-chip" href="{("sms:" + tel(x)) if tel(x) else "#"}"{"" if tel(x) else " data-quote data-loc=" + chr(34) + x["id"] + chr(34)}>{face(root, x)}<span><b>{e(x["team"])}</b>{e(x["city"])}, {x["region"]}</span></a>' for x in SITE.get("locations", []) if x.get("team"))
    return f'<div class="crew" data-reveal><span class="crew-l">Installed by</span>{chips}</div>' if chips else ""

def team(root):
    """The people who do the work, in a card that tilts in 3D with the pointer or the scroll."""
    if not os.path.exists(os.path.join(ROOT, "assets/team/duo-1200.webp")):
        return ""
    L = {x["id"]: x for x in SITE.get("locations", [])}
    people = [L.get("dearborn"), L.get("columbus")]  # left to right, as they stand in the photo
    def card(x, side):
        links = (f'<a href="tel:{tel(x)}">{phone_txt(x)}</a><a href="sms:{tel(x)}">Text</a>' if tel(x) else "") + (f'<a href="{e(x["instagram"])}" target="_blank" rel="noopener">Instagram</a>' if x.get("instagram") else "")
        return f"<li class='tp tp-{side}'>{face(root, x, 'tp-face')}<div><b>{e(x['team'])}</b><span>Runs and installs at {e(x['name'])}</span><p>{links}<button type='button' data-quote data-loc='{x['id']}'>Book with {e(x['team'])}</button></p></div></li>"
    pins = "".join(f'<span class="pin pin-{s}" aria-hidden="true"><b>{e(x["team"])}</b>{e(x["city"])}</span>' for x, s in zip(people, ("l", "r")) if x)
    cards = "".join(card(x, s) for x, s in zip(people, ("l", "r")) if x)
    badges = "".join(f"<li><b>{e(a)}</b><span>{e(c)}</span></li>" for a, c in COPY["team"]["badges"])
    c = COPY["team"]
    return f"""<section class="band team" aria-labelledby="teamh">
  <div class="bandhead" data-reveal><h2 id="teamh">{e(c['h2'])}</h2><p>{e(c['p'])}</p></div>
  <div class="team-in">
    <div class="team-stage" data-tilt data-reveal>
      <figure class="team-card">
        <img class="team-bg" src="{root}assets/team/duo-1200.webp" alt="" aria-hidden="true" width="1200" height="1490" loading="lazy">
        <img class="team-img" src="{root}assets/team/duo-1200.webp" srcset="{root}assets/team/duo-1200.webp 1200w, {root}assets/team/duo-2000.webp 2000w" sizes="(max-width: 760px) 88vw, 520px" alt="{e(c['alt'])}" width="1200" height="1490" loading="lazy">
        <i class="team-glare" aria-hidden="true"></i>{pins}
      </figure>
    </div>
    <div class="team-side">
      <ul class="team-people" data-reveal>{cards}</ul>
      <ul class="tbadges" data-reveal>{badges}</ul>
    </div>
  </div>
</section>
"""

def locations(root=""):
    """The two places EveryWrap works from. Shown wherever the service area is."""
    cards = "".join(f'''<li class="loc">{face(root, x, "loc-face")}<b>{e(x['name'])}</b><span>{e(x['street'])}<br>{e(x['city'])}, {x['region']} {x['zip']}</span><em>{e(x['note'])}</em>{loc_extra(x)}
      <p>{f'<a href="sms:{tel(x)}">Text {e(x["team"])}</a>' if tel(x) else ''}<a href="{maps(x)}" target="_blank" rel="noopener">Directions</a><button type="button" data-quote data-loc="{x['id']}">Book here</button></p></li>''' for x in SITE.get("locations", []))
    return f'<ul class="locs" data-reveal>{cards}</ul>' if cards else ""

def promo_chip():
    c = COPY["promo"]
    return f'<button class="promochip live" type="button" data-quote="wrap" data-note="{e(c["note"])}"><i class="pdot" aria-hidden="true"></i>{e(c["chip"])}</button>'

def promo_band(root):
    """The current promotion, as one loud band."""
    c = COPY["promo"]
    return f"""<section class="band promo" aria-labelledby="promoh">
  <div class="promo-in live" data-reveal>
    <p class="eyebrow">{e(c['eyebrow'])}</p>
    <h2 id="promoh">{e(c['h2'])}</h2>
    <p>{e(c['p'])}</p>
    <div class="promo-cta"><button class="btn pri" type="button" data-quote="wrap" data-note="{e(c['note'])}">{e(c['cta'])} {ARROW}</button><button class="trylink" type="button" data-upload>{CAM} See it on your car first</button></div>
  </div>
</section>
"""

def hero_personal(h1, eyebrow, promo=False, hook=None):
    return f"""<section class="hero" id="hero" aria-label="EveryWrap">
  <canvas class="stage" id="stage" aria-hidden="true"></canvas>
  <div class="ui">
    {rail()}
    <div class="carzone" id="carzone">
      <div class="seamctl" id="seamctl">
        <label class="vh" for="seam" id="seamLabel">Drag the seam across the car</label>
        <input type="range" id="seam" min="0" max="1000" step="1" value="500">
      </div>
      <span class="seamtag a" id="tagA" aria-hidden="true"></span><span class="seamtag b" id="tagB" aria-hidden="true"></span>
    </div>
    <div class="copy glass">
      {promo_chip() if promo else ''}
      <p class="eyebrow">{e(eyebrow)}</p>
      {f'<h1 class="display hook"><span class="vh">{e(h1)} </span><span aria-hidden="true">{e(hook[0])} <i>{e(hook[1])}</i></span></h1>' if hook else f'<h1 class="display long">{e(h1)}</h1>'}
      <p class="sub" id="sub">{e(COPY['home']['sub_hook'] if hook else COPY['home']['sub'])}</p>
      <div class="opts" id="opts" role="group" aria-label="Options"></div>
      {book('Book now', 'Satin black wrap', ids=True)}
      {voice('Ask by voice')}
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
      <p class="eyebrow">{e(COPY['commercial']['hero_eyebrow'])}</p>
      <h1 class="display long">{e(COPY['commercial']['hero_h1'])}</h1>
      <p class="sub" id="sub">{e(COPY['commercial']['sub'])}</p>
      {book('Book now', 'Fleet graphics')}
      {voice('Ask by voice')}
    </div>
  </div>
</section>
"""

def tunnel(root):
    cars = "".join(f'<img data-f="{f}" src="{root}assets/cut/sedan/{f}.webp" alt="" width="2200" height="979"{" class=on" if i == 0 else " loading=lazy"}>' for i, f in enumerate(["satin-black", "trident-blue", "satin-red", "dynamic-lime", "satin-grey", "interstellar-pink", "gloss-black", "color-shift"]))
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

DOCK = {"services": "<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/>", "work": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"1.6\"/><path d=\"M4 18l5-5 4 4 3-3 4 4\"/>", "prices": "<path d=\"M4 12V5h7l9 9-7 7z\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.3\"/>"}

def svg(d):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{d}</svg>'

ICONS = {
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "shield": '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    "drop": '<path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z"/>',
    "scale": '<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.5 6a2.5 2.5 0 005 0zM19 8l-2.5 6a2.5 2.5 0 005 0z"/>',
    "layers": '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    "tool": '<path d="M14.5 5.5a4 4 0 00-5 5L4 16l2 2 5.5-5.5a4 4 0 005-5L14 10l-2-2z"/>',
    "undo": '<path d="M8 8H4V4"/><path d="M4 8a8 8 0 111.5 8"/>',
    "ruler": '<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
}

def icon_for(label):
    l = label.lower()
    for key, words in (("clock", ("takes",)), ("drop", ("looking after", "curing", "care")), ("scale", ("law",)), ("undo", ("reversible",)), ("ruler", ("clearance",)),
                       ("shield", ("lasts", "laminate")), ("tool", ("printed by", "installers")), ("layers", ("film",))):
        if any(w in l for w in words):
            return svg(ICONS[key])
    return svg(ICONS["layers"])

def know(items):
    return '<dl class="know">' + "".join(f'<div data-reveal><i class="kicon">{icon_for(a)}</i><dt>{e(a)}</dt><dd>{e(b)}</dd></div>' for a, b in items) + "</dl>"

def ticker(words):
    row = "".join(f"<span>{e(w)}</span>" for w in words)
    return f'<div class="ticker" aria-hidden="true"><div class="ticker-track">{row}{row}</div></div>\n'

def explain_layers(key, theme=""):
    """An exploded view of what sits on the car, drawn in CSS."""
    x = COPY["explain"][key]; n = len(x["layers"])
    plates = "".join(f'<i class="ly ly-{kind}" style="--n:{n - 1 - k}"></i>' for k, (_, _, kind) in reversed(list(enumerate(x["layers"]))))
    legend = "".join(f'<li style="--k:{k}"><i class="ly-dot ly-{kind}"></i><b>{e(a)}</b><span>{e(b)}</span></li>' for k, (a, b, kind) in enumerate(x["layers"]))
    return f"""<section class="band explain" aria-labelledby="ex-{key}"{f' style="--th:{theme}"' if theme else ''}>
  <div class="bandhead" data-reveal><h2 id="ex-{key}">{e(x['h2'])}</h2><p>{e(x['p'])}</p></div>
  <div class="layers" data-live>
    <div class="stack" aria-hidden="true">{plates}</div>
    <ol class="layer-list">{legend}</ol>
  </div>
</section>
"""

def explain_ppf():
    x = COPY["explain"]["ppf_fx"]
    return f"""<section class="band explain" aria-labelledby="ex-fx">
  <div class="bandhead" data-reveal><h2 id="ex-fx">{e(x['h2'])}</h2></div>
  <div class="fxpair">
    <figure class="fxcard" data-live><div class="fx-scene fx-chip" aria-hidden="true"><i class="fx-film"></i><i class="fx-stone"></i><i class="fx-ring"></i></div><figcaption><b>{e(x['items'][0][0])}</b><span>{e(x['items'][0][1])}</span></figcaption></figure>
    <figure class="fxcard" data-live><div class="fx-scene fx-heal" aria-hidden="true"><i class="fx-film"></i><i class="fx-scratch"></i><i class="fx-warm"></i></div><figcaption><b>{e(x['items'][1][0])}</b><span>{e(x['items'][1][1])}</span></figcaption></figure>
  </div>
</section>
"""

def explain_tint():
    x = COPY["explain"]["tint"]
    tabs = "".join(f'<button type="button" data-v="{v}" aria-pressed="{"true" if v == 20 else "false"}"{" class=live" if v == 20 else ""}>{v}%</button>' for v in (70, 50, 35, 20, 5))
    return f"""<section class="band explain" aria-labelledby="ex-tint">
  <div class="bandhead" data-reveal><h2 id="ex-tint">{e(x['h2'])}</h2><p>{e(x['p'])}</p></div>
  <div class="vlt" data-live style="--v:.2">
    <div class="vlt-scene" aria-hidden="true"><i class="vlt-sun"></i><i class="vlt-rays vlt-in"></i><i class="vlt-glass"></i><i class="vlt-rays vlt-out"></i></div>
    <div class="vlt-side">
      <p class="vlt-num"><b>20%</b> of light gets through</p>
      <div class="tabs glass vlt-tabs" role="group" aria-label="Tint shade">{tabs}</div>
      <p class="vlt-note" aria-live="polite"></p>
      <div class="vlt-law" aria-hidden="true"><span>Front side windows: 50% or lighter</span><span>Rear glass: any shade</span></div>
    </div>
  </div>
</section>
"""

def explain_fleet():
    x = COPY["explain"]["fleet"]
    wheel = lambda cx, cy: f'<circle cx="{cx}" cy="{cy}" r="13" fill="#0f1c3f"/><circle cx="{cx}" cy="{cy}" r="5" fill="#cfcac1"/>'
    return f"""<section class="band explain" aria-labelledby="ex-fleet">
  <div class="bandhead" data-reveal><h2 id="ex-fleet">{e(x['h2'])}</h2><p>{e(x['p'])}</p></div>
  <div class="fleetfx" data-live aria-hidden="true">
    <svg viewBox="0 0 900 220" role="img">
      <g class="fv"><path d="M20 150V92q0-14 14-14h118q10 0 16 8l26 34q6 8 6 18v12z" fill="#fff" stroke="#0f1c3f" stroke-width="3"/><path class="fv-art" d="M24 132C80 96 130 150 196 110" /><circle class="fv-dot" cx="92" cy="112" r="14"/>{wheel(62, 152)}{wheel(164, 152)}</g>
      <g class="fv"><rect x="270" y="52" width="220" height="100" rx="8" fill="#fff" stroke="#0f1c3f" stroke-width="3"/><path d="M490 150V98q0-10 10-10h34q8 0 12 7l14 24q4 7 4 14v17z" fill="#fff" stroke="#0f1c3f" stroke-width="3"/><path class="fv-art" d="M276 124C340 70 410 150 484 84"/><circle class="fv-dot" cx="356" cy="100" r="18"/>{wheel(318, 154)}{wheel(446, 154)}{wheel(540, 154)}</g>
      <g class="fv"><rect x="640" y="62" width="230" height="90" rx="8" fill="#fff" stroke="#0f1c3f" stroke-width="3"/><path d="M640 138h-30" stroke="#0f1c3f" stroke-width="4"/><path class="fv-art" d="M646 126C710 80 790 146 864 92"/><circle class="fv-dot" cx="730" cy="104" r="16"/>{wheel(770, 154)}{wheel(822, 154)}</g>
      <path d="M0 168h900" stroke="#0f1c3f" stroke-opacity=".25" stroke-width="2"/>
    </svg>
  </div>
</section>
"""

def areas(root, current=""):
    others = "".join(f'<li><a href="{link(root, x["slug"])}">{e(x["name"])}</a></li>' for x in SERVICES if x["slug"] != current)
    return f"""<section class="band areas" aria-labelledby="areah">
  <div class="bandhead" data-reveal><h2 id="areah">Where we work</h2><p>{e(COPY['areas_p'])}</p></div>
  {locations(root)}
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
  <div class="final-cta" data-reveal>{book('Book now', c['book'])}<button class="trylink" type="button" data-upload>{CAM} {e(c['photo'])}</button>{voice()}</div>
</section>
"""

def footer(root, home=False):
    area = ", ".join(SITE["area"])
    insta = "".join(f'<li><a href="{u}" rel="noopener">@{h}</a></li>' for h, u in SITE["instagram"])
    rc = COPY["roundcity"]
    locs = "".join(f'<li><b>{e(x["name"])}</b><a href="{maps(x)}" target="_blank" rel="noopener">{e(x["street"])}<br>{e(x["city"])}, {x["region"]} {x["zip"]}</a><em>{e(x["note"])}</em>{loc_extra(x)}</li>' for x in SITE.get("locations", []))
    return f"""<footer class="foot">
  <div class="foot-top">
    {logo(root, 'big')}
    <p class="foot-big">{e(SITE['tagline'])}</p>
    <div class="foot-cta"><button class="btn pri" type="button" data-quote>Book now {ARROW}</button>{voice('Ask by voice')}</div>
  </div>
  <ul class="foot-locs">{locs}</ul>
  <div class="foot-grid">
    <nav aria-label="Services"><h2>Services</h2><ul>{''.join(f'<li><a href="{link(root, s["slug"])}">{e(s["name"])}</a></li>' for s in SERVICES)}<li><a href="{link(root, 'commercial')}">Fleet and commercial</a></li><li><a href="{link(root, 'design-print')}">Design and print</a></li></ul></nav>
    <nav aria-label="More"><h2>See</h2><ul><li><a href="{link(root, 'pricing')}">Pricing</a></li><li><a href="{link(root, 'work')}">Our work</a></li>{insta}</ul></nav>
    <div><h2>Talk to us</h2><ul><li><a href="mailto:{SITE['email']}">{SITE['email']}</a></li><li><button type="button" data-quote>Book now</button></li>{'<li><button type="button" id="replay">Replay the intro</button></li>' if home else ''}</ul></div>
  </div>
  <a class="rc" href="{rc['url']}" target="_blank" rel="noopener">
    <i class="rc-m" aria-hidden="true"><span>{(e(rc['name']) + " · ") * 8}</span></i>
    <span class="rc-k">{e(rc['k'])}</span>
    <span class="rc-n"><b>{e(rc['name'])}</b><em>{e(rc['p'])}</em></span>
    <span class="rc-go">{e(rc['go'])} {ARROW}</span>
  </a>
  <p class="foot-legal">© 2026 {e(SITE['name'])} · {" · ".join(e(x["name"]) for x in SITE.get("locations", []))}</p>
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
    return f"""<div class="progress" id="progress" aria-hidden="true"></div>
<nav class="dock" id="stickybar" aria-label="Quick links">
  <a href="{link(root, '')}#services">{svg(DOCK["services"])}<span>Services</span></a>
  <a href="{link(root, 'work')}">{svg(DOCK["work"])}<span>Work</span></a>
  {book('Book now', 'Fleet graphics' if com else 'Get your price in writing')}
  <a href="{link(root, 'pricing')}">{svg(DOCK["prices"])}<span>Prices</span></a>
</nav>

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
    <div class="qbar" aria-hidden="true"><i></i><i></i><i></i></div>
    <form id="qForm" novalidate>
      <input class="vh" id="qWeb" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="qstep show" data-step="1">
        <div id="qSvc"></div>
        <p class="err" id="qErr1" role="alert"></p>
        <div class="srow"><button class="btn pri" type="button" data-next>Next</button></div>
      </div>
      <div class="qstep" data-step="2">
        <div class="field"><label for="qCar" id="qCarL">What are you driving?</label><input id="qCar" type="text" placeholder="2021 Dodge Charger" autocomplete="off"></div>
        <div id="qSizeF"><span class="legend" id="qSizeL">Vehicle size</span>
          <div class="picks" role="group" aria-labelledby="qSizeL">{''.join(f'<label><input type="radio" name="qSize" value="{i}"{" checked" if i == 0 else ""}>{e(x)}</label>' for i, x in enumerate(PRICING["sizes"]))}</div></div>
        <div class="field" id="qFinF"><label for="qFin">Wrap finish</label>
          <select id="qFin"><option>Satin black</option><option>Gloss black</option><option>Satin grey</option><option>Satin red</option><option>Color shift</option><option>Not sure yet</option></select></div>
        <div class="field"><span class="legend" id="qPicsL">Photos <small>(optional, up to 4)</small></span>
          <label class="qpics" for="qPics"><input id="qPics" type="file" accept="image/*" multiple aria-labelledby="qPicsL"><span id="qPicsT">+ Add photos of the car or the job</span></label>
          <div class="qthumbs" id="qThumbs"></div></div>
        <p class="note" id="qPhoto" hidden>Photo attached from this device.</p>
        <p class="note" id="qNote" hidden></p>
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
        <span class="legend" id="qLocL">Which location suits you?</span>
        <div class="picks" role="group" aria-labelledby="qLocL">
          {"".join(f'<label><input type="radio" name="qLoc" value="{x["id"]}" data-name="{e(x["name"])}">{e(x["name"])}{f'<small>with {e(x["team"])}</small>' if x.get("team") else ""}</label>' for x in SITE.get("locations", []))}
          <label><input type="radio" name="qLoc" value="" data-name="" checked>Either</label>
        </div>
        <p class="err" id="qErr3" role="alert"></p>
        <div class="srow"><button class="btn sec" type="button" data-back>Back</button><button class="btn pri" type="submit" id="qSend">Request my price</button></div>
      </div>
      <div class="qstep" data-step="4">
        <dl class="sum" id="qSum"></dl>
        <p class="note flag" id="qDone"></p>
        <span class="legend">What happens next</span>
        <ol class="nextsteps">{''.join('<li>' + e(x) + '</li>' for x in COPY['next'])}</ol>
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
      <div class="uout" id="uOut" hidden>
        <img id="uOutImg" alt="Your car in the finish you picked. A preview made by AI.">
        <span class="utag" id="uTag"></span>
        <button class="uhold" id="uHold" type="button">Hold to see your photo</button>
        <button class="uagain" id="uAgain" type="button">Change photo</button>
      </div>
      <span class="legend">Finish to try</span>
      <div class="usw" id="usw" role="group" aria-label="Finish to try"></div>
      <p class="note" id="uMsg" aria-live="polite">Add a photo and pick a finish to see your car in it. The preview is made by AI, so treat it as a guide, not the finished job.</p>
      <div class="srow"><button class="btn pri" type="button" id="uShow" disabled>Show my car in this finish</button><button class="btn" type="button" id="uGo">Continue to my price</button></div>
    </div>
  </div>
</div>

<script type="module" src="{root}{VER}js/main.js"></script>
</body>
</html>
"""

INTRO = """<div class="intro" id="intro" hidden aria-hidden="true">
  <div class="i-sheet"><i class="i-pool"></i><i class="i-streak"></i><i class="i-grain"></i></div>
  <div class="i-lock">
    """ + mark("i-mark", ' id="imark"') + """
    <div class="i-word">""" + wordmark("i-wordsvg") + """</div>
    <i class="i-rule"></i>
    <p class="i-tag"><span>Wraps</span><span>Protection film</span><span>Tint</span></p>
    <p class="i-city">""" + " · ".join(x["name"] for x in SITE.get("locations", [])) + """</p>
  </div>
  <button class="iskip" id="iskip" type="button">Skip</button>
</div>
<script>try{if(sessionStorage.getItem("ew5-intro")!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!/[?&]dev=/.test(location.search))document.getElementById("intro").hidden=false}catch(e){}</script>
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
    body = INTRO + top(r, "personal") + "<main>\n" + hero_personal(c["hero_h1"], c["hero_eyebrow"], promo=True, hook=c["hero_hook"]) + promo_band(r) + '<div class="truststrip">' + trust_strip() + "</div>" + catalog(r) + how() + team(r) + suppliers() + tunnel(r) + ticker(COPY["explain"]["ticker"]) + services_band(r) + explain_layers("home") + work_band(r) + fleet_teaser(r) + design_teaser(r) + faq(c["faq"]) + areas(r) + final() + "</main>\n" + footer(r, home=True) + chrome(r)
    write("index.html", head(r, "", c["title"], c["desc"], extra_ld=[faq_ld(c["faq"])]) + body)

def page_service(s):
    r, th = "../", SVC_THEME[s["ch"]]
    pts = "".join(f"<div data-reveal><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in s["points"])
    related = f"""<section class="band workband" aria-labelledby="relh">
  <div class="bandhead" data-reveal><h2 id="relh">{e(s['work_h2'])}</h2></div>
  {wall(r, limit=9, tag=s['tag'], filters=False)}
</section>
""" if s["tag"] else ""
    body = top(r, "personal") + "<main>\n" + hero_personal(s["h1"], s["name"], promo=s["price_group"] == "wrap") + (promo_band(r) if s["price_group"] == "wrap" else "") + f"""<section class="band about" aria-labelledby="abouth">
  <div class="about-in" style="--th:{th}">
    <div class="about-vis" data-reveal>{svc_visual(r, s['ch'], s['img_alt'])}</div>
    <h2 id="abouth" data-reveal>{e(s['about_h2'])}</h2>
    <p class="lead" data-reveal>{e(s['lead'])}</p>
    {crew(r)}
    <dl class="points">{pts}</dl>
  </div>
</section>
""" + {"wrap": explain_layers("wrap", th), "ppf": explain_layers("ppf", th) + explain_ppf(), "tint": explain_tint()}.get(s["ch"], "") + price_band(s["price_group"], s["price_h2"], s["price_intro"], s["factors"], th, s["name"]) + f"""<section class="band" aria-labelledby="knowh">
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
    body = top(r, "commercial") + "<main>\n" + hero_fleet() + '<div class="truststrip">' + trust_strip("trust_com") + "</div>" + ticker(COPY["explain"]["ticker_fleet"]) + f"""<section class="fleetword" aria-labelledby="fwh">
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
""" + explain_fleet() + concepts(r, skip=("coupe",)) + mock_studio("mock_fleet") + price_band("fleet", c["price_h2"], c["price_intro"], c["factors"], "", "Fleet graphics") + f"""<section class="band workband" aria-labelledby="cwh">
  <div class="bandhead" data-reveal><h2 id="cwh">{e(c['work_h2'])}</h2></div>
  {wall(r, tag='commercial', filters=False, more=False)}
</section>
""" + team(r) + faq(c["faq"], "Fleet wrap questions") + areas(r) + final(com=True) + "</main>\n" + footer(r) + chrome(r, com=True)
    write("commercial/index.html", head(r, "commercial", c["title"], c["desc"], mode="commercial", extra_ld=[service_ld("Fleet graphics and commercial vehicle wraps", "commercial", c["desc"], "fleet"), faq_ld(c["faq"])]) + body)

def page_pricing():
    r, c = "../", COPY["pricing"]
    groups = [(x["name"], x["price_group"], x["slug"], x["price_intro"], SVC_THEME[x["ch"]]) for x in SERVICES] + [("Fleet and commercial", "fleet", "commercial", COPY["commercial"]["price_intro"], "#f2c200"), ("Large-format printing", "print", "design-print", "Priced by the square foot.", "#27d3ff"), ("Design", "design", "design-print", COPY["design"]["design_price_p"], "#ff4fa3")]
    blocks = "".join(f"""<section class="band prices" id="{slug}" aria-labelledby="ph-{g}" style="--th:{th}">
  <div class="bandhead" data-reveal><h2 id="ph-{g}">{e(name)}</h2><p>{e(intro)} <a href="{link(r, slug)}">More on {e(name.lower())}</a></p></div>
  {price_table(g)}
</section>
""" for name, g, slug, intro, th in groups)
    blocks = promo_band(r) + blocks
    facts = "".join(f"<li>{e(x)}</li>" for x in c["factors"])
    catalog = {"@context": "https://schema.org", "@type": "OfferCatalog", "name": "EveryWrap prices", "url": canonical("pricing"),
               "itemListElement": [{"@type": "Offer", "name": row["name"], "priceCurrency": "USD", "price": (row["from"][0] if isinstance(row["from"], list) else row["from"]), **({"unitText": row["unit"]} if row.get("unit") else {}), "category": PRICING["groups"][g]["title"]}
                                   for g in PRICING["groups"] for row in PRICING["groups"][g]["rows"] if row.get("from")]}
    body = top(r, "personal", "") + f"""<main>
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

def mock_studio(key="mock"):
    """A proof request, not a design tool: the visitor sends files and a name, the picture shows the directions
    we could take on their vehicle. js/mock.js draws the vehicle."""
    c = COPY[key]
    steps = "".join(f'<li><b>{e(a)}</b><span>{e(b)}</span></li>' for a, b in COPY["proof_steps"])
    return f"""<section class="band" id="mockup" aria-labelledby="mkh">
  <div class="bandhead" data-reveal><h2 id="mkh">{e(c['h2'])}</h2><p>{e(c['p'])}</p></div>
  <div class="mock" data-svc="{c['svc']}">
    <div class="mk-view"><div class="mk-stage"></div><p class="mk-cap">First directions, drawn live. Your real proof is made by a designer.</p></div>
    <div class="mk-ctl">
      <span class="legend">Vehicle</span>
      <div class="tabs glass mk-vehs" role="group" aria-label="Vehicle"></div>
      <div class="mk-arts" hidden></div><div class="mk-pals" hidden></div><div class="mk-bases" hidden></div>
      <label class="mk-drop" for="mkFile{key}"><input id="mkFile{key}" class="mk-file" type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg">
        <b>Add your logo or artwork</b><span>Up to four files. A logo shows on the vehicle straight away.</span><em class="mk-files"></em></label>
      <div class="mk-fields">
        <div class="field"><label for="mkName{key}">Name on the vehicle</label><input id="mkName{key}" class="mk-name" type="text" maxlength="26" placeholder="Your business name" autocomplete="off"></div>
      </div>
      <button class="btn pri mk-go" type="button">Request my proof {ARROW}</button>
    </div>
  </div>
  <ol class="proof" data-reveal>{steps}</ol>
</section>
"""

def catalog(root):
    """Everything we sell, in three groups, with starting prices. Sits right under the hero."""
    c = COPY["catalog"]
    tabs = "".join('<button type="button" data-cat="' + x["id"] + '" aria-pressed="' + ("true" if n == 0 else "false") + '"' + (' class="live"' if n == 0 else "") + ">" + e(x["tab"]) + "</button>" for n, x in enumerate(c["cats"]))
    cols = ""
    for x in c["cats"]:
        rows = "".join('<li><a class="crow" href="' + href(root, t) + '"><i class="cthumb" data-reel="' + x["reels"][k] + '" aria-hidden="true"></i><span><b>' + e(n) + "</b><small>" + e(d) + "</small></span><em>" + price_label(ref) + "</em>" + ARROW + "</a></li>" for k, (n, d, ref, t) in enumerate(x["items"]))
        cols += f"""<div class="ccol" data-cat="{x['id']}" style="--th:{x['th']}">
      <a class="ccol-img" href="{link(root, x['slug'])}" tabindex="-1" aria-hidden="true"><img loading="lazy" src="{root}assets/{x['img']}" alt="" width="1376" height="768"></a>
      <h3><a href="{link(root, x['slug'])}">{e(x['name'])}</a></h3>
      <p>{e(x['blurb'])}</p>
      <ul>{rows}</ul>
    </div>"""
    return f"""<section class="band catalog" id="services" aria-labelledby="cath">
  <div class="bandhead" data-reveal><h2 id="cath">{e(c['h2'])}</h2><p>{e(c['p'])}</p></div>
  <div class="tabs glass ctabs" role="group" aria-label="Category">{tabs}</div>
  <div class="ccols" data-cat="car">{cols}</div>
  <p class="wallmore"><a class="btn sec" href="{link(root, 'pricing')}">See every price {ARROW}</a></p>
</section>
"""

def concepts(root, skip=()):
    """Generated design concepts, by trade. Tapping one starts a design request from it."""
    c = COPY["concepts"]
    tiles = "".join(f'<button class="concept" type="button" data-quote="design" data-note="Like this concept: {e(name)}"><img loading="lazy" src="{root}assets/concepts/{k}.webp" alt="{e(alt)}" width="1376" height="768"><span>{e(name)}</span></button>' for k, name, alt in c["items"] if k not in skip)
    return f"""<section class="band" id="concepts" aria-labelledby="cch">
  <div class="bandhead" data-reveal><h2 id="cch">{e(c['h2'])}</h2><p>{e(c['p'])}</p></div>
  <div class="concepts" data-reveal>{tiles}</div>
</section>
"""

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
    def tile(x):
        pic = ('<img loading="lazy" src="' + r + "assets/" + x["img"] + '" alt="' + e(x["name"]) + '" width="1376" height="768">') if x.get("img") else ('<i class="sw sw-' + x["swatch"] + '" aria-hidden="true"></i>')
        return "<li>" + pic + "<b>" + e(x["name"]) + "</b><span>" + e(x["note"]) + "</span></li>"
    tiles = "".join(tile(x) for x in prods)
    SURF = {"3m-lam": "On vehicles", "3m": "On vehicles", "avery-lam": "On vehicles", "avery": "On vehicles", "chrome": "On vehicles", "reflective": "On vehicles", "fade": "On vehicles", "pattern": "On vehicles", "contour": "On vehicles", "perf": "On windows", "wall": "On walls", "floor": "On floors", "banner": "Signs and stickers", "decals": "Signs and stickers"}
    pv_items = [{"id": x["id"], "name": x["name"], "note": x["note"], "price": price_label("print." + x["id"]) if x.get("from") is not None else "Quoted to the job", "img": x.get("img") or ("dp/rolls.webp" if "lam" in x["id"] else "dp/printer.webp"), "surface": SURF.get(x["id"], "More")} for x in prods]
    viewer = ('<div class="pv" id="pv" data-reveal><div class="pv-stage"><div class="pv-card" id="pvCard"><div class="pv-img"><img id="pvImg" alt="" width="1376" height="768"><i class="pv-sheen" aria-hidden="true"></i></div>'
              '<div class="pv-plate"><small id="pvSurf"></small><b id="pvName"></b><span id="pvNote"></span><em id="pvPrice"></em></div></div></div>'
              '<div class="pv-pick" id="pvPick"></div><script type="application/json" id="pvData">' + json.dumps(pv_items).replace("</", "<\\/") + "</script></div>")
    jobs = [by[i] for i in ("everywrapny-2-sprinter-commercial-litmode", "2021-04-07-cnwvghosdur", "everywrapny-4-queens-public-library-bus", "2023-07-02-cunmnmqasdd", "2022-07-18-cglbmplvpx3", "614lux-4-wall-mural-install", "2022-08-20-chdssmxrqyy", "2021-04-28-conrpnrjnuq", "2022-03-12-ca_mzkerq_j") if i in by]
    shots = "".join(f'<figure><img loading="lazy" src="{r}assets/{j["src"]}" alt="{e(j["title"] + ", " + j.get("finish", ""))}" width="{j["w"]}" height="{j["h"]}"><figcaption>{e(j["title"])}<span>{e(j.get("finish", ""))}</span></figcaption></figure>' for j in jobs)
    body = top(r, "personal", "studio") + f"""<main>
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
""" + concepts(r) + mock_studio() + f"""<section class="band how" aria-labelledby="dhow">
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
  {viewer}
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
    body = top(r, "personal", "") + f"""<main>
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
    write("robots.txt", (f"User-agent: *\nAllow: /\nDisallow: /desk/\nDisallow: /api/\nSitemap: {SITE['domain']}/sitemap.xml\n" if LIVE else "User-agent: *\nDisallow: /\n"))
    write("site.webmanifest", json.dumps({"name": "EveryWrap", "short_name": "EveryWrap", "start_url": "./", "display": "standalone", "background_color": "#000000", "theme_color": "#000000", "icons": [{"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))
    write("favicon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".12" stop-color="#ffb08f"/><stop offset=".42" stop-color="#ef5b2a"/><stop offset="1" stop-color="#4a1404"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="#0b0b0c"/><ellipse cx="32" cy="34" rx="25" ry="9" fill="none" stroke="#f3ede2" stroke-width="3.500" opacity=".55"/><circle cx="32" cy="31" r="17" fill="url(#g)"/><path d="M8.300 37a25 9 0 0 0 47.400 0" fill="none" stroke="#f3ede2" stroke-width="3.500" stroke-linecap="round"/></svg>\n')

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
