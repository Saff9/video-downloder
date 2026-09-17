export function validateUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'Please enter a video URL.' };
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false, error: 'That does not look like a valid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// links are supported.' };
  }
  if (!parsed.hostname.includes('.')) {
    return { ok: false, error: 'That URL does not have a valid host.' };
  }
  return { ok: true, url: parsed.href };
}

const PLATFORMS = [
  { match: /(^|\.)youtube\.com$|youtu\.be$/i, id: 'youtube', label: 'YouTube', color: '#ff0033' },
  { match: /(^|\.)tiktok\.com$/i, id: 'tiktok', label: 'TikTok', color: '#25f4ee' },
  { match: /(^|\.)facebook\.com$|fb\.watch$/i, id: 'facebook', label: 'Facebook', color: '#1877f2' },
  { match: /(^|\.)instagram\.com$/i, id: 'instagram', label: 'Instagram', color: '#e1306c' },
  { match: /(^|\.)twitter\.com$|(^|\.)x\.com$|t\.co$/i, id: 'x', label: 'X / Twitter', color: '#1da1f2' },
  { match: /(^|\.)vimeo\.com$/i, id: 'vimeo', label: 'Vimeo', color: '#1ab7ea' },
  { match: /(^|\.)dailymotion\.com$/i, id: 'dailymotion', label: 'Dailymotion', color: '#0066dc' },
  { match: /(^|\.)twitch\.tv$/i, id: 'twitch', label: 'Twitch', color: '#9146ff' },
  { match: /(^|\.)soundcloud\.com$/i, id: 'soundcloud', label: 'SoundCloud', color: '#ff5500' },
  { match: /(^|\.)reddit\.com$/i, id: 'reddit', label: 'Reddit', color: '#ff4500' },
  { match: /(^|\.)bilibili\.com$/i, id: 'bilibili', label: 'Bilibili', color: '#00a1d6' },
  { match: /(^|\.)pinterest\.com$/i, id: 'pinterest', label: 'Pinterest', color: '#e60023' },
  { match: /(^|\.)linkedin\.com$/i, id: 'linkedin', label: 'LinkedIn', color: '#0a66c2' },
  { match: /(^|\.)vk\.com$/i, id: 'vk', label: 'VK', color: '#0077ff' },
];

export function detectPlatform(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = url || '';
  }
  for (const p of PLATFORMS) {
    if (p.match.test(hostname)) return p;
  }
  return { id: 'link', label: 'Web video', color: '#8b5cf6' };
}

export function fmtDuration(seconds) {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtCount(n) {
  if (!Number(n)) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export const QUALITIES = [2160, 1440, 1080, 720, 480, 360, 240, 144];
export const AUDIO_FORMATS = ['MP3', 'M4A', 'Best audio'];