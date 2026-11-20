import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = p => fileURLToPath(new URL(p, import.meta.url));

/** Emits /sw.js with the list of built files to precache (hashed assets, shell, thumbnails; never video). */
function serviceWorker() {
  return {
    name: 'clasuke-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter(f => /\.(js|css|woff2)$/.test(f) && !/(cyrillic|greek|vietnamese)/.test(f)).map(f => '/' + f);
      const thumbs = readdirSync(here('./public/thumbs')).map(f => '/thumbs/' + f);
      const shell = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];
      const list = [...shell, ...built, ...thumbs].sort();
      const version = createHash('sha1').update(list.join('|')).update(readFileSync(here('./src/pwa/sw.template.js'))).digest('hex').slice(0, 10);
      const source = readFileSync(here('./src/pwa/sw.template.js'), 'utf8')
        .replace('__SW_VERSION__', version).replace('__SW_PRECACHE__', JSON.stringify(list));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900, // three.js is one deliberate, lazy-loaded chunk
  },
  server: { host: true },
});
