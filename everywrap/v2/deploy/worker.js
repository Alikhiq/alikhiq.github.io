// Serves the EveryWrap static site from an R2 bucket.
const TYPES = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8", svg: "image/svg+xml", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", xml: "application/xml; charset=utf-8", txt: "text/plain; charset=utf-8", webmanifest: "application/manifest+json", ico: "image/x-icon" };

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    const url = new URL(request.url);
    if (url.hostname === "www.everywrap.com") { url.hostname = "everywrap.com"; return Response.redirect(url.toString(), 301); }
    // Only the main domain is for search engines; any other address this Worker answers on is a copy.
    const copy = url.hostname !== "everywrap.com";
    // Where the booking form sends requests. The addresses are Worker settings, not files in the repo.
    if (url.pathname === "/lead.json") {
      if (!env.LEAD_TO) return new Response("{}", { status: 404, headers: { "content-type": TYPES.json } });
      return new Response(JSON.stringify({ to: env.LEAD_TO, cc: env.LEAD_CC || "" }), { headers: { "content-type": TYPES.json, "cache-control": "no-store", "x-robots-tag": "noindex" } });
    }
    let key;
    try { key = decodeURIComponent(url.pathname).replace(/^\/+/, ""); } catch { return new Response("Bad request", { status: 400 }); }
    if (key === "" || key.endsWith("/")) key += "index.html";
    else if (!/\.[a-z0-9]+$/i.test(key)) { url.pathname += "/"; return Response.redirect(url.toString(), 301); }

    const range = request.headers.has("range");
    let obj;
    try { obj = await env.SITE.get(key, { onlyIf: request.headers, range: range ? request.headers : undefined }); }
    catch { obj = await env.SITE.get(key); }
    if (!obj) return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Not found | EveryWrap</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#f3ede2;font:16px system-ui'><p>That page is not here. <a style='color:#ef5b2a' href='/'>Go to the home page</a></p>", { status: 404, headers: { "content-type": TYPES.html, "x-robots-tag": "noindex" } });

    const ext = key.split(".").pop().toLowerCase();
    const h = new Headers();
    h.set("content-type", TYPES[ext] || "application/octet-stream");
    h.set("etag", obj.httpEtag);
    h.set("accept-ranges", "bytes");
    h.set("cache-control", ext === "html" ? "public, max-age=0, must-revalidate" : "public, max-age=3600");
    h.set("x-content-type-options", "nosniff");
    h.set("referrer-policy", "strict-origin-when-cross-origin");
    if (copy) h.set("x-robots-tag", "noindex, nofollow");
    if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
    if (range && obj.range && obj.range.length !== undefined && obj.range.length < obj.size) {
      const start = obj.range.offset || 0;
      h.set("content-range", `bytes ${start}-${start + obj.range.length - 1}/${obj.size}`);
      h.set("content-length", String(obj.range.length));
      return new Response(request.method === "HEAD" ? null : obj.body, { status: 206, headers: h });
    }
    h.set("content-length", String(obj.size));
    return new Response(request.method === "HEAD" ? null : obj.body, { headers: h });
  },
};
