-- Tables for the dashboard (D1 database everywrap-desk). Safe to run again.
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, day TEXT NOT NULL, name TEXT NOT NULL, path TEXT, visitor TEXT, device TEXT, country TEXT, ref TEXT, detail TEXT);
CREATE INDEX IF NOT EXISTS ev_day ON events (day, name);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', name TEXT, phone TEXT, contact TEXT, vehicle TEXT, services TEXT, finish TEXT, tint TEXT, size TEXT, starts TEXT, note TEXT, page TEXT, photo TEXT, visitor TEXT, device TEXT, country TEXT, city TEXT);
CREATE INDEX IF NOT EXISTS lead_day ON leads (day);
CREATE TABLE IF NOT EXISTS renders (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, visitor TEXT, finish TEXT);
CREATE INDEX IF NOT EXISTS render_day ON renders (day, visitor);
-- Added after the first version: the AI preview a visitor saw before sending a request.
-- ALTER TABLE leads ADD COLUMN render TEXT;
-- ALTER TABLE leads ADD COLUMN location TEXT;
-- ALTER TABLE leads ADD COLUMN files TEXT;
-- Online payments from the site's Stripe payment links, written by /api/stripe.
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, day TEXT NOT NULL, lead TEXT, kind TEXT, amount INTEGER NOT NULL DEFAULT 0, currency TEXT, status TEXT NOT NULL, name TEXT, email TEXT, phone TEXT, job TEXT, pi TEXT, refunded INTEGER NOT NULL DEFAULT 0, updated INTEGER);
CREATE INDEX IF NOT EXISTS pay_lead ON payments (lead);
CREATE INDEX IF NOT EXISTS pay_pi ON payments (pi);
CREATE INDEX IF NOT EXISTS pay_day ON payments (day);
