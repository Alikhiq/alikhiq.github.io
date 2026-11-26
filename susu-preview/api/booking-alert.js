// Booking alert: after the site stores a booking request (Supabase RPC), the page posts the
// summary here and this function sends Susu a WhatsApp message from Round City's Zernio number.
//
// Env (Vercel project "susuinkandglow"):
//   ZERNIO_API_KEY     Zernio key (only the "messages" group needs to be enabled)
//   ZERNIO_ACCOUNT_ID  Zernio WhatsApp account of +1 614-304-9866
//   ALERT_TO           recipients, digits with country code, comma separated (Susu: 12022906115)
//   ALERT_TEMPLATE     approved template name (default booking_alert, en_US)
//
// Recipients are fixed by env, never taken from the request. Missing env = alerts off (503).

const ALLOWED_ORIGINS = ['https://susuinkandglow.com', 'https://www.susuinkandglow.com'];
const API = 'https://zernio.com/api/v1/inbox/conversations';
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 4;        // alerts per IP per 10 minutes
const PER_INSTANCE = 40; // alerts per warm instance per 10 minutes
const hits = new Map();
let total = [];

// WhatsApp template parameters cannot hold newlines, tabs or long runs of spaces.
const clean = (s, max) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);

function limited(ip) {
  const now = Date.now();
  total = total.filter((t) => now - t < WINDOW_MS);
  const mine = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (mine.length >= PER_IP || total.length >= PER_INSTANCE) return true;
  mine.push(now); hits.set(ip, mine); total.push(now);
  return false;
}

async function zernio(key, body) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`zernio ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json().catch(() => ({}));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  if (!ALLOWED_ORIGINS.includes(req.headers.origin)) return res.status(403).json({ ok: false });

  const key = process.env.ZERNIO_API_KEY, account = process.env.ZERNIO_ACCOUNT_ID;
  const to = String(process.env.ALERT_TO || '').split(',').map((n) => n.replace(/\D/g, '')).filter((n) => n.length >= 10);
  if (!key || !account || !to.length) return res.status(503).json({ ok: false, reason: 'alerts not configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false });

  const name = clean(b.name, 60);
  const services = clean(Array.isArray(b.services) ? b.services.join(', ') : b.services, 120) || 'Not specified';
  const when = clean(b.when, 80) || 'Not specified';
  const phone = clean(b.phone, 25);
  const where = clean(b.where, 160);
  const digits = phone.replace(/\D/g, '');
  if (name.length < 2 || digits.length < 10 || digits.length > 15) return res.status(400).json({ ok: false });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false });

  const template = process.env.ALERT_TEMPLATE || 'booking_alert';
  const text = `New booking request\n\nName: ${name}\nService: ${services}\nWhen: ${when}\nWhere: ${where || 'Not specified'}\nPhone: ${phone}\n\nOpen your bookings to confirm.`;

  const results = await Promise.all(to.map(async (participantId) => {
    try {
      await zernio(key, { accountId: account, participantId, templateName: template, templateLanguage: 'en_US', templateParams: [name, services, when, phone] });
      return 'template';
    } catch (e1) {
      // Template not approved yet, or Meta refused it: a plain message still goes through
      // while the recipient's 24-hour window is open (they messaged the number recently).
      try { await zernio(key, { accountId: account, participantId, message: text }); return 'text'; }
      catch (e2) { console.error('booking-alert failed', participantId.slice(-4), e1.message, '|', e2.message); return 'failed'; }
    }
  }));

  const sent = results.filter((r) => r !== 'failed').length;
  return res.status(sent ? 200 : 502).json({ ok: sent > 0, sent, results });
};
