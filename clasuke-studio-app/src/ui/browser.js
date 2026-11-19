// The browser rail: backgrounds, 3D scenes and styles as pictures you click to lock, plus the song queue
// and favorites. A locked tile gets the violet frame; an ice dot marks what the current seed picked.
import { on } from '../core/bus.js';
import { store } from '../core/storage.js';
import { t, L } from '../core/i18n.js';
import { ENVS, S3_KEYS, S3_NAMES, STYLES, STYLE_KEYS } from '../visual/catalog.js';
import { studio } from '../visual/studio.js';
import { stage } from '../visual/stage.js';
import { audio, playTrack, removeTrack, setSource } from '../audio/engine.js';
import { $, $$, el, icon } from './dom.js';

const TABS = ['env', 's3', 'style', 'songs', 'favs'];
let tab = TABS.includes(store.get('cs-tab')) ? store.get('cs-tab') : 'env';

function tile(kind, id, name, opts = {}) {
  const b = el('button.tile' + (opts.cls ? '.' + opts.cls : ''), { type: 'button', 'data-kind': kind, 'data-id': id, 'aria-pressed': 'false', title: name });
  if (opts.img) b.append(el('img', { src: opts.img, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }));
  else if (opts.video) b.append(el('video', { src: opts.video + '#t=0.5', muted: true, playsinline: true, preload: 'metadata', tabindex: '-1' }));
  else if (opts.sw) { const s = el('span.sw'); s.style.background = opts.sw; b.append(s); }
  if (opts.icon) b.append(el('span.tile-ico', null, icon(opts.icon)));
  b.append(el('span.tile-name', { text: name }), el('span.badge', null, icon('lock')));
  return b;
}
const head = key => el('div.group-h', null, el('span.lbl', { text: t(key) }));
const wipe = node => { node.textContent = ''; return node; };

function buildEnv() {
  const p = wipe($('#pane-env')), i = L();
  const base = el('div.grid');
  base.append(tile('env', 'auto', t('random'), { cls: 'random', icon: 'dice' }));
  base.append(tile('env', 'plain', t('solid'), { sw: 'linear-gradient(135deg, #07050a 20%, #2a0a12 60%, #e0243a 140%)' }));
  const vids = el('div.grid'), panos = el('div.grid'), mine = el('div.grid');
  for (const e of ENVS) {
    if (e.type === 'plain') continue;
    const tl = tile('env', e.id, e.n[i], e.thumb ? { img: e.thumb } : { video: e.videoThumb });
    (e.user ? mine : e.type === 'video' ? vids : panos).append(tl);
  }
  const add = el('button.tile.add', { type: 'button', id: 'btn-bg', title: t('myBg') }, el('span.tile-ico', null, icon('plus')), el('span.tile-name', { text: t('myBg') }));
  add.addEventListener('click', () => $('#bgfile').click());
  mine.append(add);
  p.append(base, head('gVideo'), vids, head('g360'), panos, head('yourBg'), mine);
}
function buildS3() {
  const p = wipe($('#pane-s3')), i = L();
  const g = el('div.grid');
  g.append(tile('s3', 'auto', t('random'), { cls: 'random.sq', icon: 'dice' }), tile('s3', 'none', S3_NAMES.none[i], { cls: 'sq', icon: 'nocube' }));
  for (const k of S3_KEYS) g.append(tile('s3', k, S3_NAMES[k][i], { cls: 'sq', img: 'thumbs/s3-' + k + '.webp' }));
  p.append(g);
}
function buildStyle() {
  const p = wipe($('#pane-style')), i = L();
  const g = el('div.grid.g3');
  g.append(tile('style', 'auto', t('random'), { cls: 'random.sm', icon: 'dice' }));
  for (const k of STYLE_KEYS) g.append(tile('style', k, STYLES[k].n[i], { cls: 'sm', img: 'thumbs/style-' + k + '.webp' }));
  p.append(g);
}
function buildSongs() {
  const p = wipe($('#pane-songs'));
  const open = el('button.ghost', { type: 'button' }, icon('open'), el('span', { text: t('open') }));
  open.addEventListener('click', () => $('#file').click());
  if (!audio.playlist.length) p.append(el('div.empty', null, icon('drop'), el('span', { text: t('noSongs') }), open));
  else {
    const rows = el('div.rows');
    audio.playlist.forEach((s, i) => {
      const on = i === audio.track && audio.source === 'songs';
      const main = el('button.row-main', { type: 'button' }, el('span.row-n', { text: String(i + 1).padStart(2, '0') }), el('span.row-t', { text: s.name }));
      main.addEventListener('click', () => (audio.source !== 'songs' ? setSource('songs', i) : playTrack(i)));
      const x = el('button.row-x', { type: 'button', 'aria-label': t('remove') + ': ' + s.name, title: t('remove') }, icon('x'));
      x.addEventListener('click', () => removeTrack(i));
      rows.append(el('div.row' + (on ? '.on' : ''), null, main, x));
    });
    p.append(rows, el('div.pane-foot', null, open));
  }
  $('#count-songs').textContent = audio.playlist.length || '';
}
function buildFavs() {
  const p = wipe($('#pane-favs'));
  const favs = studio.favs;
  if (!favs.length) p.append(el('div.empty', null, icon('star'), el('span', { text: t('noFavs') })));
  else {
    const rows = el('div.rows');
    for (const f of favs) {
      const th = el('span.row-thumb'); if (f.thumb) th.style.backgroundImage = 'url(' + f.thumb + ')';
      const main = el('button.row-main', { type: 'button', 'data-code': f.code }, th, el('span', null, el('span.row-t', { text: f.name }), el('span.row-s', { text: f.code })));
      main.addEventListener('click', () => studio.loadCode(f.code));
      const x = el('button.row-x', { type: 'button', 'aria-label': t('remove') + ': ' + f.name, title: t('remove') }, icon('x'));
      x.addEventListener('click', () => studio.removeFav(f.code));
      rows.append(el('div.row' + (studio.cur && studio.cur.code === f.code ? '.on' : ''), null, main, x));
    }
    p.append(rows);
  }
  $('#count-favs').textContent = favs.length || '';
}

/** Marks locked tiles, the "now" tiles and the lock pips on the tabs. */
function sync() {
  const V = studio.cur, lock = studio.lock;
  for (const b of $$('.tile[data-kind]')) {
    const kind = b.dataset.kind, id = b.dataset.id;
    b.setAttribute('aria-pressed', lock[kind] === id ? 'true' : 'false');
    b.classList.toggle('now', !!V && stage.has3D && lock[kind] === 'auto' && V[kind] === id);
  }
  for (const k of ['env', 's3', 'style']) {
    $('#tab-' + k).classList.toggle('locked', lock[k] !== 'auto');
    $('#pane-' + k).classList.toggle('off', !stage.has3D);
  }
}
function showTab(next, focus) {
  tab = next; store.set('cs-tab', tab);
  for (const k of TABS) {
    const b = $('#tab-' + k), on = k === tab;
    b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    $('#pane-' + k).hidden = !on;
    if (on && focus) b.focus();
  }
  $('#panes').scrollTop = 0;
}

export function initBrowser() {
  const all = () => { buildEnv(); buildS3(); buildStyle(); buildSongs(); buildFavs(); sync(); };
  all(); showTab(tab);
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
  $('#tabs').addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); e.stopPropagation(); showTab(TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length], true);
  });
  // one listener for every lock tile: click locks, clicking the locked tile again lets it go
  $('#panes').addEventListener('click', e => {
    const b = e.target.closest('.tile[data-kind]'); if (!b) return;
    const kind = b.dataset.kind, id = b.dataset.id;
    studio.setLock(kind, studio.lock[kind] === id ? 'auto' : id);
  });
  $('#bgfile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; studio.addUserBackground(f); });
  on('visual', () => { sync(); buildFavs(); });
  on('lock', sync);
  on('envs', () => { buildEnv(); sync(); });
  on('favs', buildFavs);
  on('audio', buildSongs);
  on('lang', all);
  on('3d', sync);
  on('show-tab', k => showTab(k));
}
