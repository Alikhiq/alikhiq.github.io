// Everything a visual can be made of. Names are [es, en] pairs.
export const PALETTES = [
  { n: 'Carmesí', bg: '#07050a', c: ['#e0243a', '#ff7a59', '#f4efe9'] },
  { n: 'Rayo', bg: '#05060f', c: ['#8b5cff', '#7fe3ff', '#f4efe9'] },
  { n: 'Luna', bg: '#08080c', c: ['#f4efe9', '#9aa3c8', '#e0243a'] },
  { n: 'Brasa', bg: '#0a0604', c: ['#ff8a1f', '#ffd166', '#e0243a'] },
  { n: 'Hielo', bg: '#04080d', c: ['#7fe3ff', '#3b82f6', '#f4efe9'] },
  { n: 'Sakura', bg: '#0a0509', c: ['#ff5ca8', '#ffd1e8', '#8b5cff'] },
  { n: 'Tinta', bg: '#0b0b0b', c: ['#f4efe9', '#b8b2c2', '#e0243a'] },
  { n: 'Tormenta', bg: '#06040c', c: ['#8b5cff', '#e0243a', '#f4efe9'] },
  { n: 'Veneno', bg: '#05080a', c: ['#7cff6b', '#8b5cff', '#e8fff0'] },
];

/** Backgrounds. The user's own files are pushed here at runtime with ids u1, u2, ... */
export const ENVS = [
  { id: 'plain', type: 'plain', n: ['Color liso', 'Solid color'] },
  { id: 'v28687', type: 'video', src: 'media/v28687.mp4', n: ['Tokio de noche', 'Tokyo at night'] },
  { id: 'v4231', type: 'video', src: 'media/v4231.mp4', n: ['Calle de neón', 'Neon street'] },
  { id: 'v4109', type: 'video', src: 'media/v4109.mp4', n: ['Linterna', 'Lantern'] },
  { id: 'v35644', type: 'video', src: 'media/v35644.mp4', n: ['Túnel rojo', 'Red tunnel'] },
  { id: 'v35327', type: 'video', src: 'media/v35327.mp4', n: ['Túnel violeta', 'Violet tunnel'] },
  { id: 'v1968', type: 'video', src: 'media/v1968.mp4', n: ['Humo', 'Smoke'] },
  { id: 'v18142', type: 'video', src: 'media/v18142.mp4', n: ['Partículas', 'Particles'] },
  { id: 'v47558', type: 'video', src: 'media/v47558.mp4', n: ['Tormenta', 'Storm'] },
  { id: 'h_shanghai', type: 'hdri', src: 'media/shanghai_bund.jpg', n: ['Ciudad', 'City'] },
  { id: 'h_rooftop', type: 'hdri', src: 'media/rooftop_night.jpg', n: ['Azotea', 'Rooftop'] },
  { id: 'h_zollhof', type: 'hdri', src: 'media/neuer_zollhof.jpg', n: ['Edificios', 'Buildings'] },
  { id: 'h_metro', type: 'hdri', src: 'media/metro_noord.jpg', n: ['Metro', 'Subway'] },
  { id: 'h_stars', type: 'hdri', src: 'media/moonless_golf.jpg', n: ['Estrellas', 'Stars'] },
];
for (const e of ENVS) if (e.src) e.thumb = 'thumbs/env-' + e.id + '.webp';
export const envById = id => ENVS.find(e => e.id === id);

export const S3_KEYS = ['tunnel', 'orb', 'terrain', 'galaxy', 'shards', 'bars', 'knot'];
export const S3_NAMES = {
  none: ['Sin 3D', 'No 3D'], tunnel: ['Túnel', 'Tunnel'], orb: ['Orbe líquido', 'Liquid orb'], terrain: ['Montañas', 'Mountains'],
  galaxy: ['Galaxia', 'Galaxy'], shards: ['Cristales', 'Crystals'], bars: ['Ciudad EQ', 'EQ city'], knot: ['Nudo', 'Knot'],
};

/** Post styles: bloom amount plus uniform overrides for the single style shader (see gl/style.js). */
export const STYLES = {
  clean: { n: ['Limpio', 'Clean'], bloom: .6, u: { sat: 1.05, contrast: 1.05, vign: .45, grain: .03 } },
  neon: { n: ['Neón', 'Neon'], bloom: 1.5, u: { sat: 1.35, contrast: 1.1, chroma: .6, vign: .6, grain: .03 } },
  vhs: { n: ['VHS', 'VHS'], bloom: .7, u: { chroma: 1.8, scan: .22, grain: .09, sat: .85, glitch: .15, vign: .8 } },
  manga: { n: ['Manga', 'Manga'], bloom: .25, u: { sat: 0, contrast: 1.5, halftone: 5, vign: .3, grain: .02 } },
  noir: { n: ['Carmesí noir', 'Crimson noir'], bloom: .8, duo: 'pal', u: { duo: 1, contrast: 1.3, vign: .9, grain: .05 } },
  glitch: { n: ['Glitch', 'Glitch'], bloom: .9, u: { glitch: .8, chroma: 1.4, invert: .35, grain: .05 } },
  dream: { n: ['Sueño', 'Dream'], bloom: 1.9, u: { sat: .85, contrast: .92, bright: 1.06, hueDrift: .12, vign: .5 } },
  pixel: { n: ['Píxel', 'Pixel'], bloom: .5, u: { pixel: 7, poster: 6, sat: 1.2 } },
  thermal: { n: ['Térmico', 'Thermal'], bloom: .6, duo: 'thermal', u: { duo: 1, poster: 6, contrast: 1.2 } },
  kaleido: { n: ['Caleidoscopio', 'Kaleidoscope'], bloom: 1.1, u: { kale: 6, sat: 1.2, vign: .5 } },
  cel: { n: ['Anime cel', 'Anime cel'], bloom: .5, u: { poster: 5, sat: 1.3, contrast: 1.15, vign: .4 } },
  crt: { n: ['TV vieja', 'Old TV'], bloom: .8, u: { scan: .45, chroma: .9, grain: .07, sat: .7, vign: 1.3 } },
};
export const STYLE_KEYS = Object.keys(STYLES);

export const FAM_NAMES = {
  rings: ['anillos', 'rings'], bolts: ['rayos', 'bolts'], embers: ['brasas', 'embers'], blades: ['filos', 'blades'], ripple: ['ondas', 'ripples'],
  rain: ['lluvia', 'rain'], eclipse: ['eclipse', 'eclipse'], scope: ['trazo', 'trace'], terrain: ['montañas', 'peaks'],
};
// Two-word names for a visual. Array lengths are part of the seed mapping: keep them at 18 and 16.
export const NAME_A = ['Rayo', 'Sombra', 'Luna', 'Brasa', 'Eco', 'Filo', 'Niebla', 'Trueno', 'Ceniza', 'Vórtice', 'Pulso', 'Humo', 'Chispa', 'Marea', 'Grieta', 'Noche', 'Faro', 'Acero'];
export const NAME_B = ['Carmesí', 'Violeta', 'Final', 'Salvaje', 'Lunar', 'Fugaz', 'Doble', 'Gris', 'Brutal', 'Veloz', 'Azul', 'Infernal', 'Total', 'Sutil', 'Celeste', 'Mortal'];

export const ASPECT = { free: null, '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1 };
export const EXPORT = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080] };
export const DISPLAY_FONT = '"Syne Variable", "Arial Black", Impact, sans-serif';
export const BODY_FONT = '"Hanken Grotesk Variable", "Segoe UI", system-ui, sans-serif';
