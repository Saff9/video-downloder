/**
 * Helper utilities for VideoFetch server
 */

export const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', re: /(?:youtube\.com|youtu\.be)/i, color: '#ff0000' },
  { id: 'tiktok', label: 'TikTok', re: /tiktok\.com/i, color: '#00f2fe' },
  { id: 'instagram', label: 'Instagram', re: /instagram\.com/i, color: '#e1306c' },
  { id: 'facebook', label: 'Facebook', re: /(?:facebook\.com|fb\.watch)/i, color: '#1877f2' },
  { id: 'twitter', label: 'X / Twitter', re: /(?:twitter\.com|x\.com)/i, color: '#1da1f2' },
  { id: 'reddit', label: 'Reddit', re: /(?:reddit\.com|redd\.it)/i, color: '#ff4500' },
  { id: 'vimeo', label: 'Vimeo', re: /vimeo\.com/i, color: '#1ab7ea' },
  { id: 'dailymotion', label: 'Dailymotion', re: /dailymotion\.com/i, color: '#0066dc' },
  { id: 'generic', label: 'Universal', re: /^https?:\/\//i, color: '#888888' },
];

export function detectPlatform(url) {
  if (typeof url !== 'string') return PLATFORMS[PLATFORMS.length - 1];
  for (const p of PLATFORMS) {
    if (p.re.test(url)) return p;
  }
  return PLATFORMS[PLATFORMS.length - 1];
}

export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'Please enter a valid URL.' };
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'URL must start with http:// or https://' };
  }
  try {
    const u = new URL(trimmed);
    if (!u.hostname || !u.hostname.includes('.')) {
      return { ok: false, error: 'Invalid domain name in URL.' };
    }
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false, error: 'Malformed URL.' };
  }
}

export function sanitizeFilename(name) {
  if (typeof name !== 'string') return 'download';
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'download';
}

export function cleanShortsTitle(t) {
  if (!t) return 'Shorts Video';
  return t.replace(/#shorts\b/gi, '').replace(/#short\b/gi, '').trim() || t;
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
