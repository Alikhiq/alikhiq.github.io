// Records the stage canvas plus the audio bus with MediaRecorder and downloads the file.
// MP4 (H.264 + AAC) where the browser can encode it, WebM otherwise.
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { toast } from '../ui/toast.js';
import { stage } from '../visual/stage.js';
import { studio } from '../visual/studio.js';
import { recordStream } from '../audio/engine.js';

const MIMES = [
  ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm'], ['video/mp4', 'mp4'],
];
function pickMime() {
  if (!window.MediaRecorder) return null;
  for (const m of MIMES) if (MediaRecorder.isTypeSupported(m[0])) return m;
  return null;
}
function fileName(ext) {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  const slug = studio.cur.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  return 'clasuke-' + slug + '-' + stamp + '.' + ext;
}

let rec = null, startedAt = 0;
export const recorder = {
  get active() { return !!rec; },
  /** Seconds since recording started. */
  get elapsed() { return rec ? (performance.now() - startedAt) / 1000 : 0; },
  toggle() { rec ? recorder.stop() : recorder.start(); },

  start() {
    if (rec) return;
    const mm = pickMime();
    if (!mm || !HTMLCanvasElement.prototype.captureStream) { toast(t('recNo'), 4500); return; }
    const audioStream = recordStream();
    const [w, h] = stage.enterRecording();
    const tracks = stage.canvas.captureStream(60).getVideoTracks().concat(audioStream.getAudioTracks());
    const chunks = [];
    let r;
    try { r = new MediaRecorder(new MediaStream(tracks), { mimeType: mm[0], videoBitsPerSecond: 14e6, audioBitsPerSecond: 192e3 }); }
    catch (e) { stage.leaveRecording(); toast(t('recNo'), 4500); return; }
    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      tracks[0].stop();
      const blob = new Blob(chunks, { type: mm[0].split(';')[0] }), name = fileName(mm[1]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      toast(t('recSaved') + ' · ' + name, 4200);
    };
    r.start(500); rec = r; startedAt = performance.now();
    emit('rec', true, { w, h, ext: mm[1] });
  },
  stop() {
    if (!rec) return;
    rec.stop(); rec = null;
    stage.leaveRecording(); emit('rec', false);
  },
};
