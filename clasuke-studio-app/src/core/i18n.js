// Every UI string, in Spanish (default) and English.
import { store } from './storage.js';
import { emit } from './bus.js';

const T = {
  es: {
    install: 'Instalar', stream: 'Modo stream', full: 'Pantalla completa', commands: 'Comandos y atajos', dropHere: 'Suelta tus canciones',
    prevSong: 'Canción anterior', nextSong: 'Canción siguiente', srcDemo: 'Demo', srcSongs: 'Canciones', srcMic: 'Micro', srcPc: 'PC',
    srcDemoL: 'Beat de demo', srcSongsL: 'Tus canciones', srcMicL: 'Micrófono', srcPcL: 'Audio del PC', source: 'Fuente de audio',
    open: 'Abrir canciones', generate: 'Nuevo visual', prevVis: 'Visual anterior', nextVis: 'Visual siguiente', fav: 'Guardar en favoritos',
    code: 'Código', codeHint: 'Código del visual', auto: 'Auto', autoL: 'Cambiar cada 32 golpes', tag: 'Firma', tagL: 'Mostrar @clasuke y el título',
    arFree: 'Libre', format: 'Formato', intensity: 'Fuerza', speed: 'Velocidad', record: 'Grabar', stop: 'Detener',
    tabEnv: 'Fondo', tab3d: '3D', tabStyle: 'Estilo', tabSongs: 'Lista', tabFavs: 'Favs',
    noSongs: 'Suelta canciones aquí', noFavs: 'Toca la estrella para guardar', remove: 'Quitar',
    play: 'Reproducir', pause: 'Pausa', idle: 'En reposo', demoName: 'Demo · Noche 140', playing: 'Sonando',
    mic: 'Micrófono en vivo', pc: 'Audio del PC en vivo', live: 'vivo',
    streamHint: 'H o Esc para volver', recSaved: 'Video guardado', recNo: 'Este navegador no puede grabar video. Usa Chrome o Edge.',
    micNo: 'No se pudo usar el micrófono. Acepta el permiso.', pcNo: 'No se pudo capturar el audio del PC. Usa Chrome o Edge.',
    pcNoAudio: 'Falta el audio: al compartir, marca “Compartir audio”.',
    badFile: 'Ese archivo no se pudo abrir como audio.', badCode: 'Ese código no existe.', faved: 'Guardado', unfaved: 'Quitado',
    fullNo: 'Pantalla completa no está disponible aquí.', autoOn: 'Auto: cambia cada 32 golpes', autoOff: 'Auto apagado', added: 'canciones añadidas',
    random: 'Al azar', none3d: 'Sin 3D', solid: 'Color liso', myBg: 'Tu fondo', yourBg: 'Tuyo', bgFail: 'No se pudo cargar ese fondo.',
    no3d: 'Sin 3D en este equipo: visuales 2D.', gVideo: 'Video', g360: '360°', gBase: 'Base', locked: 'Fijado', nowTile: 'Ahora',
    frPlay: 'Dale play', frNew: 'nuevo visual', frDrop: 'suelta tu canción', frSpace: 'Espacio',
    palHint: 'Escribe una acción o un código', palEmpty: 'Nada con ese nombre', loadCode: 'Cargar visual', unlockAll: 'Soltar todo (al azar)',
    lang: 'Idioma', langSwitch: 'Cambiar a inglés', tagOn: 'Firma visible', tagOff: 'Firma oculta', controls: 'Controles', browser: 'Explorador',
    visual: 'Visual', updateReady: 'Nueva versión lista. Recarga para usarla.',
  },
  en: {
    install: 'Install', stream: 'Stream mode', full: 'Fullscreen', commands: 'Commands and shortcuts', dropHere: 'Drop your songs',
    prevSong: 'Previous song', nextSong: 'Next song', srcDemo: 'Demo', srcSongs: 'Songs', srcMic: 'Mic', srcPc: 'PC',
    srcDemoL: 'Demo beat', srcSongsL: 'Your songs', srcMicL: 'Microphone', srcPcL: 'PC audio', source: 'Audio source',
    open: 'Open songs', generate: 'New visual', prevVis: 'Previous visual', nextVis: 'Next visual', fav: 'Save to favorites',
    code: 'Code', codeHint: 'Visual code', auto: 'Auto', autoL: 'Change every 32 beats', tag: 'Tag', tagL: 'Show @clasuke and the title',
    arFree: 'Free', format: 'Format', intensity: 'Power', speed: 'Speed', record: 'Record', stop: 'Stop',
    tabEnv: 'Scene', tab3d: '3D', tabStyle: 'Style', tabSongs: 'Queue', tabFavs: 'Favs',
    noSongs: 'Drop songs here', noFavs: 'Tap the star to save one', remove: 'Remove',
    play: 'Play', pause: 'Pause', idle: 'Idle', demoName: 'Demo · Night 140', playing: 'Playing',
    mic: 'Mic, live', pc: 'PC audio, live', live: 'live',
    streamHint: 'H or Esc to go back', recSaved: 'Video saved', recNo: 'This browser cannot record video. Use Chrome or Edge.',
    micNo: 'Could not use the mic. Allow the permission.', pcNo: 'Could not capture PC audio. Use Chrome or Edge.',
    pcNoAudio: 'No audio: when sharing, tick “Share audio”.',
    badFile: 'That file could not be opened as audio.', badCode: 'That code does not exist.', faved: 'Saved', unfaved: 'Removed',
    fullNo: 'Fullscreen is not available here.', autoOn: 'Auto: changes every 32 beats', autoOff: 'Auto off', added: 'songs added',
    random: 'Random', none3d: 'No 3D', solid: 'Solid color', myBg: 'Your own', yourBg: 'Yours', bgFail: 'Could not load that background.',
    no3d: 'No 3D on this device: 2D visuals.', gVideo: 'Video', g360: '360°', gBase: 'Base', locked: 'Locked', nowTile: 'Now',
    frPlay: 'Hit play', frNew: 'new visual', frDrop: 'drop your song', frSpace: 'Space',
    palHint: 'Type an action or a code', palEmpty: 'Nothing by that name', loadCode: 'Load visual', unlockAll: 'Unlock everything (random)',
    lang: 'Language', langSwitch: 'Switch to Spanish', tagOn: 'Tag visible', tagOff: 'Tag hidden', controls: 'Controls', browser: 'Browser',
    visual: 'Visual', updateReady: 'New version ready. Reload to use it.',
  },
};

let lang = store.get('cs-lang', 'es') === 'en' ? 'en' : 'es';
export const getLang = () => lang;
export const L = () => (lang === 'es' ? 0 : 1); // index into [es, en] name pairs
export const t = k => T[lang][k] || T.es[k] || k;

/** Fills every [data-i] (text), [data-it] (title + aria-label) and [data-ia] (aria-label only) under root. */
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  root.querySelectorAll('[data-it]').forEach(e => { const s = t(e.dataset.it); e.title = s; e.setAttribute('aria-label', s); });
  root.querySelectorAll('[data-ia]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.ia)); });
  root.querySelectorAll('[data-ip]').forEach(e => { e.placeholder = t(e.dataset.ip); });
}
export function setLang(next) {
  next = next === 'en' ? 'en' : 'es';
  if (next === lang) return;
  lang = next; store.set('cs-lang', lang);
  applyStatic(); emit('lang', lang);
}
export const STRINGS = T;
