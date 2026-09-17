import { isAvailable, getInfo } from '../services/ytdlp.service.js';
import { getRelatedVideos } from '../services/invidious.service.js';
import { detectPlatform, validateUrl } from '../utils/helpers.js';
import { infoCache } from '../services/cache.service.js';

export async function getVideoInfo(req, res) {
  const url = req.body?.url;
  const validation = validateUrl(url);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  if (!isAvailable()) {
    return res.status(503).json({ error: 'yt-dlp is not installed. Run "npm run setup" on the server.' });
  }

  const cached = infoCache.get(url);
  if (cached) {
    return res.json(cached);
  }

  try {
    const info = await getInfo(url);
    const meta = {
      title: info.title || info.webpage_url || 'Untitled video',
      uploader: info.uploader || info.channel || info.uploader_id || 'Unknown uploader',
      duration: Math.round(Number(info.duration) || 0),
      views: Number(info.view_count) || 0,
      thumbnail: pickThumbnail(info),
      platform: (() => {
        const p = detectPlatform(url);
        return { id: p.id, label: p.label, color: p.color };
      })(),
      maxHeight: computeMaxHeight(info.formats),
      webpageUrl: info.webpage_url || url,
      formats: (info.formats || [])
        .filter((f) => f.ext === 'mp4' || f.vcodec !== 'none' || f.acodec !== 'none')
        .slice(0, 15)
        .map((f) => ({
          formatId: f.format_id,
          ext: f.ext,
          height: f.height,
          filesize: f.filesize || f.filesize_approx,
          vcodec: f.vcodec,
          acodec: f.acodec,
          note: f.format_note,
        })),
    };
    infoCache.set(url, meta);
    return res.json(meta);
  } catch (err) {
    const status = err.isUnsupported ? 422 : 502;
    const message = err.isUnsupported
      ? 'Unsupported URL. VideoFetch supports YouTube, Facebook, TikTok, Instagram, X/Twitter, Vimeo, Dailymotion and hundreds of other sites.'
      : err.message || 'Could not read this video. It may be private, region-locked, or removed.';
    return res.status(status).json({ error: message });
  }
}

export async function handleRelatedVideos(req, res) {
  const videoId = req.query.videoId || req.query.id || req.query.v;
  if (!videoId) {
    return res.json({ ok: true, items: [] });
  }

  try {
    const items = await getRelatedVideos(videoId);
    return res.json({ ok: true, videoId, items });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch related videos: ' + err.message });
  }
}

function pickThumbnail(info) {
  const thumbs = info.thumbnails || [];
  if (info.thumbnail) return info.thumbnail;
  for (let i = thumbs.length - 1; i >= 0; i -= 1) {
    const url = thumbs[i].url;
    if (url && /^https?:\/\//.test(url)) return url;
  }
  return '';
}

function computeMaxHeight(formats = []) {
  let max = 0;
  for (const f of formats) {
    if (f.height && f.height > max) max = f.height;
  }
  return max;
}
