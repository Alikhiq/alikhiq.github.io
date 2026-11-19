// Production server for Clasuke Studio (Railway). No dependencies: Node's http only.
//   - serves dist/ with ETags, HEAD and conditional requests
//   - byte-range requests, so the background videos can seek and loop
//   - /assets/* (content-hashed by Vite) cached for a year; index.html, sw.js and the manifest never cached
//   - gzip / brotli for text assets, compressed once and kept in memory
//   - GET /health for the platform health check
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zc } from 'node:zlib';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const STARTED = Date.now();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.md', '.txt']);
const NO_CACHE = new Set(['/index.html', '/sw.js', '/manifest.webmanifest']);
const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // microphone and screen capture are features of the app; nothing else is needed
  'Permissions-Policy': 'microphone=(self), display-capture=(self), camera=(), geolocation=()',
};

function cacheControl(urlPath) {
  if (NO_CACHE.has(urlPath)) return 'no-cache';
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (urlPath.startsWith('/media/') || urlPath.startsWith('/thumbs/')) return 'public, max-age=604800';
  return 'public, max-age=3600';
}

/** Compressed bodies, keyed by path + mtime + encoding. Only small text files end up here. */
const packed = new Map();
async function compressed(file, st, enc) {
  const key = file + ':' + st.mtimeMs + ':' + enc;
  let buf = packed.get(key);
  if (!buf) {
    const raw = await readFile(file);
    buf = enc === 'br' ? brotliCompressSync(raw, { params: { [zc.BROTLI_PARAM_QUALITY]: 9, [zc.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : gzipSync(raw, { level: 9 });
    packed.set(key, buf);
  }
  return buf;
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY, ...headers });
  res.end(body);
}

/** Maps a URL path to a file inside dist/, or null when it tries to leave it. */
function resolve(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0')) return null;
  const file = normalize(join(ROOT, p));
  return file === ROOT || file.startsWith(ROOT + sep) ? file : null;
}

async function serveFile(req, res, urlPath) {
  const file = resolve(urlPath);
  if (!file) return send(res, 400, { 'Content-Type': 'text/plain' }, 'Bad request');
  let st;
  try { st = await stat(file); } catch { st = null; }
  if (!st || !st.isFile()) return null;

  const ext = extname(file).toLowerCase();
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(urlPath),
    'ETag': etag,
    'Last-Modified': st.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
  };
  if (urlPath === '/sw.js') headers['Service-Worker-Allowed'] = '/';

  const range = req.headers.range;
  if (!range && req.headers['if-none-match'] === etag) return send(res, 304, headers);

  // text: whole file, compressed when the client accepts it
  if (!range && COMPRESSIBLE.has(ext) && st.size > 1024) {
    const accept = String(req.headers['accept-encoding'] || '');
    const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
    headers.Vary = 'Accept-Encoding';
    if (enc) {
      const body = await compressed(file, st, enc);
      headers['Content-Encoding'] = enc; headers['Content-Length'] = body.length; delete headers['Accept-Ranges'];
      return send(res, 200, headers, req.method === 'HEAD' ? undefined : body);
    }
  }

  // one byte range: "bytes=a-b", "bytes=a-" or "bytes=-n"
  let start = 0, end = st.size - 1, status = 200;
  if (range && (!req.headers['if-range'] || req.headers['if-range'] === etag)) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] || m[2])) {
      if (m[1] === '') { start = Math.max(0, st.size - Number(m[2])); }
      else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), st.size - 1); }
      if (start > end || start >= st.size) return send(res, 416, { ...headers, 'Content-Range': 'bytes */' + st.size });
      status = 206; headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    }
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(status, { ...SECURITY, ...headers });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' }, 'Method not allowed');
    const urlPath = new URL(req.url, 'http://x').pathname;
    if (urlPath === '/health') {
      return send(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, JSON.stringify({ status: 'ok', uptime: Math.round((Date.now() - STARTED) / 1000) }));
    }
    const target = urlPath.endsWith('/') ? urlPath + 'index.html' : urlPath;
    if ((await serveFile(req, res, target)) != null) return;
    // unknown path: files 404, everything else gets the app (it is a single page)
    if (extname(urlPath)) return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, 'Not found');
    if ((await serveFile(req, res, '/index.html')) != null) return;
    send(res, 503, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Build missing: run "npm run build" first.');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Server error');
    else res.destroy();
  }
});

server.listen(PORT, HOST, () => console.log(`Clasuke Studio on http://${HOST}:${PORT} (serving ${ROOT})`));
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); });
