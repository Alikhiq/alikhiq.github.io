/* Builds the public page's portrait engine and footer 3D helper.

   Why: the home page used to load the whole original app bundle (assets/story-IExGlf7c.js,
   1 MB, with React and the Supabase client) just to get the <muse-story> element, plus a
   second, unminified copy of three.js from a CDN for the intro. This script lifts the
   <muse-story> engine out of the original bundle unchanged, applies three small patches
   (listed below), and bundles it with only the parts of three.js r160 it uses.

   Run from any folder that has the two packages installed:
     npm i three@0.160.0 esbuild
     node <path-to>/susu-preview/tools/build-muse.mjs
   Output: susu-preview/assets/muse-story.r2.js, footer-three.r2.js and shared chunk-*.js.
   If you rebuild with changes, bump REV so browsers fetch the new files (assets/ is cached for a year). */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';

const REV = 'r2';
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(process.cwd(), 'x.js'));
const esbuild = require('esbuild');

// 1. lift the engine (an IIFE that registers <muse-story>) out of the original bundle
const bundle = fs.readFileSync(path.join(site, 'assets/index-IExGlf7c.js'), 'utf8');
const START = '(function(){if(customElements.get("muse-story"))return;';
const END = 'customElements.define("muse-story",S)})();';
const a = bundle.indexOf(START), b = bundle.indexOf(END, a);
if (a < 0 || b < 0) throw new Error('muse-story engine not found in the bundle');
let engine = bundle.slice(a, b + END.length);

// 2. patches
const patch = (from, to) => {
  if (engine.split(from).length !== 2) throw new Error('patch anchor not unique: ' + from.slice(0, 60));
  engine = engine.replace(from, () => to);
};
// 2a. three.js comes from named imports (so the bundler can drop what is unused)
patch('const r=()=>Promise.resolve(eB),e="/brand/muse-master.webp",',
      'const r=()=>Promise.resolve(__T3),e="./brand/muse-master.webp",eS="./brand/muse-master-1168.webp",');
// 2b. first paint uses the half-size portrait (124 KB instead of 548 KB). The engine already
//     analyses the image at half size, so regions and background colour come out the same.
patch('b.onerror=w,b.src=e})}', 'b.onerror=w,b.src=eS})}');
patch('document.createElement("img");w.src=e,w.alt=""', 'document.createElement("img");w.src=eS,w.alt=""');
// 2c. then the full 2336x3520 portrait is fetched in the background and swapped in once the
//     reveal has finished, so the zoomed chapters are as sharp as before. Skipped on Save-Data.
patch('this._ready=!0,this._t0=performance.now()})',
      'this._ready=!0,this._t0=performance.now(),(()=>{const cn=navigator.connection;if(cn&&cn.saveData)return;' +
      'const at=performance.now()+2400,im=new Image;im.decoding="async";' +
      'const go=()=>{if(!this._r||!this._mu||this._mu.tMap.value!==V)return;const n=new w.Texture(im);' +
      'n.generateMipmaps=!0;n.minFilter=w.LinearMipmapLinearFilter;n.magFilter=w.LinearFilter;n.anisotropy=V.anisotropy;' +
      'n.needsUpdate=!0;this._mu.tMap.value=n;V.dispose()};' +
      'im.onload=()=>{const later=()=>setTimeout(go,Math.max(0,at-performance.now()));im.decode?im.decode().then(later,later):later()};' +
      'im.src=e})()})');

const gen = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-'));
const names = ['AdditiveBlending', 'BufferAttribute', 'BufferGeometry', 'Color', 'Group', 'LinearFilter', 'LinearMipmapLinearFilter',
  'Mesh', 'PerspectiveCamera', 'PlaneGeometry', 'Points', 'Scene', 'ShaderMaterial', 'Texture', 'Vector2', 'Vector3', 'Vector4', 'WebGLRenderer'];
fs.writeFileSync(path.join(gen, 'muse-story.js'),
  `import { ${names.join(', ')} } from 'three';\nconst __T3 = { ${names.join(', ')} };\n${engine}\n`);
// the footer hoop (js/footer3d.js) imports this lazily when the footer comes near
fs.writeFileSync(path.join(gen, 'footer-three.js'),
  `export { ACESFilmicToneMapping, AmbientLight, CanvasTexture, Color, DirectionalLight, EquirectangularReflectionMapping, Group, Mesh,
  MeshPhysicalMaterial, PMREMGenerator, PerspectiveCamera, SRGBColorSpace, Scene, SphereGeometry, TorusGeometry, WebGLRenderer } from 'three';\n`);

// 3. bundle
for (const f of fs.readdirSync(path.join(site, 'assets'))) if (/^(chunk-.*|muse-story\.r\d+|footer-three\.r\d+)\.js$/.test(f)) fs.rmSync(path.join(site, 'assets', f));
const out = await esbuild.build({
  entryPoints: { [`muse-story.${REV}`]: path.join(gen, 'muse-story.js'), [`footer-three.${REV}`]: path.join(gen, 'footer-three.js') },
  outdir: path.join(site, 'assets'), bundle: true, format: 'esm', splitting: true, minify: true, target: 'es2020',
  chunkNames: 'chunk-[hash]', nodePaths: [path.join(process.cwd(), 'node_modules')], legalComments: 'none', metafile: true,
});
for (const [f, o] of Object.entries(out.metafile.outputs)) console.log((o.bytes / 1024).toFixed(1).padStart(7) + ' KB  ' + path.relative(site, path.resolve(f)));
fs.rmSync(gen, { recursive: true });
