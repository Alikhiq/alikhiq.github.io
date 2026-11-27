"""Pack the walkthrough into one self-contained HTML file (styles, scripts and blob data inlined).

Usage: build_single.py <folder> <out.html> [--fragment]
Handy for sending it to someone as a single file; the site itself uses the separate files.
--fragment leaves out the <html>/<head>/<body> wrapper, for hosts that add their own.
"""
import sys, os, re, json, base64

folder, out = sys.argv[1], sys.argv[2]
fragment = '--fragment' in sys.argv
html = open(os.path.join(folder, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(folder, 'style.css'), encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '</style>')

man = json.load(open(os.path.join(folder, 'data', 'manifest.json')))
bins = {}
for name, meta in man['looks'].items():
    bins[name] = base64.b64encode(open(os.path.join(folder, 'data', meta['file']), 'rb').read()).decode('ascii')
data = '<script>window.NAP_DATA = ' + json.dumps({'manifest': man, 'bins': bins}, separators=(',', ':')) + ';</script>\n'

def inline(m):
    src = open(os.path.join(folder, m.group(1)), encoding='utf-8').read()
    assert '</script' not in src.lower(), m.group(1)
    return '<script>\n' + src + '</script>'
first = html.index('<script src=')
html = html[:first] + data + html[first:]
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

if fragment:
    head = html[html.index('<head>') + 6:html.index('</head>')]
    body = html[html.index('<body>') + 6:html.index('</body>')]
    keep = [l for l in head.split('\n') if l.startswith('<title>') or 'fonts.g' in l]
    style = head[head.index('<style>'):head.index('</style>') + 8]
    html = '\n'.join(keep) + '\n' + style + body
open(out, 'w', encoding='utf-8').write(html)
print(out, f'{os.path.getsize(out) / 1e6:.2f} MB')
