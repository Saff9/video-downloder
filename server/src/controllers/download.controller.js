import { isAvailable, createDownload } from '../services/ytdlp.service.js';
import { detectPlatform, validateUrl, sanitizeFilename } from '../utils/helpers.js';
import { EXT_MIME } from '../config/constants.js';

export async function handleDownload(req, res) {
  const { url, q = 'best', audio = '0', format = 'mp4', title } = req.query;
  const validation = validateUrl(url);
  if (!validation.ok) return res.status(400).json({ error: validation.error });
  if (!isAvailable()) return res.status(503).json({ error: 'yt-dlp is not installed. Run "npm run setup" on the server.' });

  const wantAudio = audio === '1' || audio === 'true';
  const ext = wantAudio ? (format === 'm4a' ? 'm4a' : 'mp3') : 'mp4';
  const opts = { url, quality: q, audio: wantAudio };
  const baseName = sanitizeFilename(title || 'download');
  const filename = `${baseName}.${ext}`;

  let stdout;
  try {
    stdout = await createDownload(opts);
  } catch (err) {
    if (!res.headersSent) return res.status(502).json({ error: err.message || 'Download failed. Try a different quality.' });
    return;
  }

  res.setHeader('Content-Type', EXT_MIME[ext] || EXT_MIME.default);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('X-Download-Platform', detectPlatform(url).id);

  stdout.pipe(res);
  res.on('close', () => {
    if (!res.writableEnded) {
      try {
        stdout.emit('SIGTERM');
      } catch (_) {
        /* ignore */
      }
    }
  });
}
