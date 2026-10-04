import { spawn } from 'node:child_process';
import { FAST_MIRRORS, SCIENCE_EDUCATION_PILLARS, SCIENCE_SHORTS_PILLARS } from '../config/constants.js';
import { BINARY, isAvailable } from './ytdlp.service.js';
import { cleanShortsTitle, shuffleArray } from '../utils/helpers.js';
import { feedCache, searchCache, relatedCache } from './cache.service.js';
import { heavyRankCandidates } from './ranking.service.js';

/**
 * Fast Multi-Mirror Invidious / Piped Racing
 */
export async function fetchFastRace(endpoint, timeoutMs = 2800) {
  const fetchSingle = async (base) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0',
        },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          return data;
        }
      }
    } catch (_) {
      clearTimeout(timeout);
    }
    throw new Error('Mirror failed');
  };

  try {
    return await Promise.any(FAST_MIRRORS.map(fetchSingle));
  } catch {
    return null;
  }
}

/**
 * Curated Science & Education Feed
 * Multi-Cluster Parallel Candidate Sourcing (X Algorithm Architecture)
 */
export async function getCuratedFeed({
  type = 'videos',
  category = 'science_all',
  blockShorts = false,
  seed = Date.now(),
  page = 1,
  limit = 24,
}) {
  const isShorts = type === 'shorts';
  if (isShorts && blockShorts) return [];

  const cacheKey = `feed:${type}:${category}:${blockShorts}:${seed}:${page}:${limit}`;
  const cached = feedCache.get(cacheKey);
  if (cached) return cached;

  // ================= 1. SHORTS FEED (STRICTLY <= 60s, UP TO 300 SHORTS) =================
  if (isShorts) {
    const shuffledPillars = shuffleArray(SCIENCE_SHORTS_PILLARS);
    const startIdx = ((page - 1) * 4) % shuffledPillars.length;
    const selectedTopics = shuffledPillars.slice(startIdx, startIdx + 6);

    const candidatePool = [];

    const fetchPromises = selectedTopics.map(async (topic) => {
      const endpoint = `/api/v1/search?q=${encodeURIComponent(topic)}&type=video`;
      const data = await fetchFastRace(endpoint, 2600);
      if (data && Array.isArray(data)) {
        let count = 0;
        for (const item of data) {
          const dur = Number(item.lengthSeconds) || 0;
          if (item.videoId && dur > 0 && dur <= 60) {
            const avatar = (item.authorThumbnails && item.authorThumbnails[item.authorThumbnails.length - 1]?.url) ||
                           (item.authorThumbnails && item.authorThumbnails[0]?.url) ||
                           item.authorThumbnail || '';
            candidatePool.push({
              id: item.videoId,
              type: 'shorts',
              title: cleanShortsTitle(item.title),
              uploader: item.author || 'Science Creator',
              duration: dur,
              views: item.viewCount || 0,
              thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
              avatar: avatar,
              url: `https://www.youtube.com/shorts/${item.videoId}`,
            });
            count++;
            if (count >= 5) break;
          }
        }
      }
    });

    await Promise.allSettled(fetchPromises);

    // If needed, supplement with yt-dlp
    if (candidatePool.length < limit && isAvailable()) {
      try {
        const ytdlpItems = await searchYtDlp(`ytsearch30:${selectedTopics[0]}`, 30, true);
        candidatePool.push(...ytdlpItems);
      } catch (_) {}
    }

    // Rank & de-cluster with Heavy Ranker
    let rankedShorts = heavyRankCandidates(candidatePool, { isShorts: true });
    if (rankedShorts.length < limit) {
      const mockShorts = getScienceMockShorts();
      const existingIds = new Set(rankedShorts.map((x) => x.id));
      for (const m of mockShorts) {
        if (!existingIds.has(m.id)) {
          rankedShorts.push(m);
        }
      }
      rankedShorts = heavyRankCandidates(rankedShorts, { isShorts: true });
    }

    const result = rankedShorts.slice(0, limit);
    feedCache.set(cacheKey, result);
    return result;
  }

  // ================= 2. LONG-FORM FEED (STRICTLY >= 75s, UP TO 100 VIDEOS) =================
  const pool = SCIENCE_EDUCATION_PILLARS[category] || SCIENCE_EDUCATION_PILLARS.science_all;
  const shuffledPillars = shuffleArray(pool);
  const startIdx = ((page - 1) * 4) % shuffledPillars.length;
  const pickedTopics = shuffledPillars.slice(startIdx, startIdx + 8);

  const rawCandidates = [];

  const searchPromises = pickedTopics.map(async (topic) => {
    const endpoint = `/api/v1/search?q=${encodeURIComponent(topic)}&type=video`;
    const data = await fetchFastRace(endpoint, 2600);
    if (data && Array.isArray(data)) {
      let addedFromTopic = 0;
      for (const item of data) {
        const dur = Number(item.lengthSeconds) || 0;
        if (item.videoId && (!dur || dur >= 75)) {
          const avatar = (item.authorThumbnails && item.authorThumbnails[item.authorThumbnails.length - 1]?.url) ||
                         (item.authorThumbnails && item.authorThumbnails[0]?.url) ||
                         item.authorThumbnail || '';
          rawCandidates.push({
            id: item.videoId,
            type: 'video',
            title: item.title,
            uploader: item.author || 'Curated Channel',
            duration: dur,
            views: item.viewCount || 0,
            publishedText: item.publishedText || '',
            thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            avatar: avatar,
            url: `https://www.youtube.com/watch?v=${item.videoId}`,
          });
          addedFromTopic++;
          if (addedFromTopic >= 6) break;
        }
      }
    }
  });

  await Promise.allSettled(searchPromises);

  // Fallback to yt-dlp if mirrors gave few candidates
  if (rawCandidates.length < limit && isAvailable()) {
    try {
      const items = await searchYtDlp(`ytsearch30:${pickedTopics[0]}`, 30, false);
      rawCandidates.push(...items);
    } catch (_) {}
  }

  // Apply Heavy Ranker with X algorithm channel de-clustering
  let rankedVideos = heavyRankCandidates(rawCandidates, { preferredCategory: category, isShorts: false });
  if (rankedVideos.length < limit) {
    const mockVideos = getScienceMockVideos(category);
    const existingIds = new Set(rankedVideos.map((x) => x.id));
    for (const m of mockVideos) {
      if (!existingIds.has(m.id)) {
        rankedVideos.push(m);
      }
    }
    rankedVideos = heavyRankCandidates(rankedVideos, { preferredCategory: category, isShorts: false });
  }

  const result = rankedVideos.slice(0, limit);
  feedCache.set(cacheKey, result);
  return result;
}

/**
 * Search with Channel Card Detection
 */
export async function searchWithChannels(query, type = 'all', blockShorts = false) {
  if (!query || !query.trim()) return { channel: null, items: [] };

  const cleanQ = query.trim();
  const cacheKey = `search:${cleanQ.toLowerCase()}:${type}:${blockShorts}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const isShortSearch = type === 'shorts';
  const searchQuery = isShortSearch ? `${cleanQ} #shorts` : cleanQ;

  const endpoint = `/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=all`;
  const [invidiousData, channelSearchData] = await Promise.all([
    fetchFastRace(endpoint, 2500),
    fetchFastRace(`/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=channel`, 2200).catch(() => null),
  ]);

  let channelCard = null;
  const videos = [];

  if (channelSearchData && Array.isArray(channelSearchData) && channelSearchData.length > 0) {
    const ch = channelSearchData[0];
    if (ch && (ch.author || ch.title || ch.authorId)) {
      const name = ch.author || ch.title || cleanQ;
      channelCard = {
        id: ch.authorId || ch.ucid || 'channel',
        name: name,
        handle: ch.handle || `@${name.replace(/\s+/g, '').toLowerCase()}`,
        avatar: (ch.authorThumbnails && ch.authorThumbnails[ch.authorThumbnails.length - 1]?.url) ||
                (ch.authorThumbnails && ch.authorThumbnails[0]?.url) ||
                ch.authorThumbnail || '',
        subCount: ch.subCount ? formatSubscribers(ch.subCount) : (ch.subscriberCount || 'Official Channel'),
        videoCount: ch.videoCount ? `${ch.videoCount} videos` : '',
        description: ch.description || ch.descriptionHtml || `Official channel for ${name}`,
        verified: ch.isVerified || ch.verified !== false,
      };
    }
  }

  if (invidiousData && Array.isArray(invidiousData)) {
    for (const item of invidiousData) {
      if ((item.type === 'channel' || item.authorThumbnails || (item.authorId && !item.videoId)) && !channelCard) {
        const name = item.author || item.title || cleanQ;
        channelCard = {
          id: item.authorId || item.ucid,
          name: name,
          handle: item.handle || `@${name.replace(/\s+/g, '').toLowerCase()}`,
          avatar: (item.authorThumbnails && item.authorThumbnails[item.authorThumbnails.length - 1]?.url) ||
                  (item.authorThumbnails && item.authorThumbnails[0]?.url) ||
                  item.authorThumbnail || '',
          subCount: item.subCount ? formatSubscribers(item.subCount) : (item.subscriberCount || 'Official Creator'),
          videoCount: item.videoCount ? `${item.videoCount} videos` : '',
          description: item.description || item.descriptionHtml || `Official content by ${name}`,
          verified: item.isVerified || item.verified !== false,
        };
      } else if (item.videoId || item.type === 'video') {
        const dur = Number(item.lengthSeconds) || 0;
        if (blockShorts && dur > 0 && dur <= 60) continue;
        const isShort = isShortSearch || (dur > 0 && dur <= 60);
        const avatar = (item.authorThumbnails && item.authorThumbnails[item.authorThumbnails.length - 1]?.url) ||
                       (item.authorThumbnails && item.authorThumbnails[0]?.url) ||
                       item.authorThumbnail || '';
        videos.push({
          id: item.videoId,
          type: isShort ? 'shorts' : 'video',
          title: isShort ? cleanShortsTitle(item.title) : item.title,
          uploader: item.author || 'Creator',
          duration: dur,
          views: item.viewCount || 0,
          publishedText: item.publishedText || '',
          thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
          avatar: avatar,
          url: isShort ? `https://www.youtube.com/shorts/${item.videoId}` : `https://www.youtube.com/watch?v=${item.videoId}`,
        });
      }
    }
  }

  if (!channelCard && videos.length > 0) {
    const topAuthor = videos[0].uploader;
    const isChannelQuery = cleanQ.length >= 3 && (
      topAuthor.toLowerCase().includes(cleanQ.toLowerCase()) ||
      cleanQ.toLowerCase().includes(topAuthor.toLowerCase())
    );

    if (isChannelQuery) {
      channelCard = {
        id: 'channel_auto',
        name: topAuthor,
        handle: `@${topAuthor.replace(/\s+/g, '').toLowerCase()}`,
        avatar: videos[0].avatar || '',
        subCount: 'Verified Creator',
        videoCount: `${videos.length}+ videos`,
        description: `Explore popular videos, deep dives, and uploads from ${topAuthor}.`,
        verified: true,
      };
    }
  }

  if (videos.length === 0 && isAvailable()) {
    try {
      const ytdlpItems = await searchYtDlp(`ytsearch25:${searchQuery}`, 25, isShortSearch);
      videos.push(...ytdlpItems);
      if (!channelCard && videos.length > 0) {
        const author = videos[0].uploader;
        channelCard = {
          id: 'channel_ytdlp',
          name: author,
          handle: `@${author.replace(/\s+/g, '').toLowerCase()}`,
          avatar: '',
          subCount: 'Official Channel',
          videoCount: `${videos.length}+ videos`,
          description: `All videos and highlights from ${author}.`,
          verified: true,
        };
      }
    } catch (_) {}
  }

  const rankedItems = heavyRankCandidates(videos, { isShorts: isShortSearch });
  const result = { channel: channelCard, items: rankedItems.slice(0, 30) };
  searchCache.set(cacheKey, result);
  return result;
}

/**
 * Related / Up-Next Videos for Playing View
 */
export async function getRelatedVideos(videoId) {
  if (!videoId) return [];
  const cacheKey = `related:${videoId}`;
  const cached = relatedCache.get(cacheKey);
  if (cached) return cached;

  const endpoint = `/api/v1/videos/${videoId}`;
  const data = await fetchFastRace(endpoint, 3000);

  if (data && data.recommendedVideos && Array.isArray(data.recommendedVideos) && data.recommendedVideos.length > 0) {
    const related = data.recommendedVideos
      .filter((r) => r.videoId)
      .map((r) => ({
        id: r.videoId,
        type: 'video',
        title: r.title,
        uploader: r.author || 'Creator',
        duration: r.lengthSeconds || 0,
        views: r.viewCount || 0,
        thumbnail: `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
        avatar: (r.authorThumbnails && r.authorThumbnails[0]?.url) || r.authorThumbnail || '',
        url: `https://www.youtube.com/watch?v=${r.videoId}`,
      }));
    const rankedRelated = heavyRankCandidates(related, { isShorts: false });
    relatedCache.set(cacheKey, rankedRelated);
    return rankedRelated;
  }

  const fallbackFeed = await getCuratedFeed({ type: 'videos', category: 'science_all' });
  return fallbackFeed.slice(0, 15);
}

function searchYtDlp(query, limit = 20, isShorts = false) {
  return new Promise((resolve) => {
    if (!BINARY) return resolve([]);
    const child = spawn(
      BINARY,
      ['--dump-single-json', '--flat-playlist', '--no-warnings', query],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const chunks = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve([]);
    }, 10000);

    child.stdout.on('data', (d) => chunks.push(d));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const entries = parsed.entries || [];
          const results = entries
            .filter((e) => e.id)
            .map((e) => {
              const dur = Math.round(Number(e.duration) || 0);
              return {
                id: e.id,
                type: isShorts || (dur > 0 && dur <= 60) ? 'shorts' : 'video',
                title: isShorts ? cleanShortsTitle(e.title) : e.title,
                uploader: e.uploader || e.channel || 'YouTube Creator',
                duration: dur,
                views: Number(e.view_count) || 0,
                thumbnail: `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
                avatar: '',
                url: isShorts ? `https://www.youtube.com/shorts/${e.id}` : `https://www.youtube.com/watch?v=${e.id}`,
              };
            })
            .filter((e) => {
              if (isShorts) return e.duration > 0 && e.duration <= 60;
              return !e.duration || e.duration >= 75;
            })
            .slice(0, limit);
          return resolve(results);
        } catch {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve([]);
    });
  });
}

function formatSubscribers(num) {
  if (typeof num === 'string') return num;
  if (!num || isNaN(num)) return '';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M subscribers';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K subscribers';
  return `${num} subscribers`;
}

function getScienceMockVideos(category) {
  const scienceCreators = [
    { title: 'The Quantum Paradox That Broke Classical Physics', uploader: 'Veritasium', views: 4200000, dur: 1260, id: '423xKdaft8w' },
    { title: 'The Largest Star in the Universe – Size Comparison', uploader: 'Kurzgesagt – In a Nutshell', views: 18500000, dur: 640, id: '1-NxOD9m2i0' },
    { title: 'The Essence of Calculus, Chapter 1', uploader: '3Blue1Brown', views: 9800000, dur: 1020, id: 'WUvTyaaNkzM' },
    { title: 'How Does a Microscopic Jet Engine Work?', uploader: 'Real Engineering', views: 3100000, dur: 890, id: 'n228bHqVp1A' },
    { title: 'The James Webb Telescope Discovered Something Impossible', uploader: 'PBS Space Time', views: 5400000, dur: 980, id: 'v2eY0lX9X5k' },
    { title: 'MIT 6.006 Introduction to Algorithms (Full Lecture)', uploader: 'MIT OpenCourseWare', views: 4100000, dur: 3180, id: 'OQ5jsbhAv_M' },
    { title: 'Master Your Sleep & Enhance Mental Focus Protocol', uploader: 'Huberman Lab', views: 6200000, dur: 4500, id: 'gX7z3nsh3iA' },
    { title: 'The Crazy Physics of High Speed Fluid Dynamics', uploader: 'SmarterEveryDay', views: 7900000, dur: 1140, id: '1v48YGLb5yU' },
    { title: 'How Microchips Are Made (3D Transistor Animation)', uploader: 'Branch Education', views: 4800000, dur: 1350, id: 'C4K_d_f8D7c' },
    { title: 'Why ASML Machines Are The Most Complex in History', uploader: 'Asianometry', views: 2900000, dur: 1180, id: 'j4rP66Q51d0' },
    { title: 'The Mould Effect (The Chain Fountain Explained)', uploader: 'Steve Mould', views: 3600000, dur: 740, id: 'rB83DpBJQsE' },
    { title: 'Cosmic Dawn – The Earliest Stars in the Universe', uploader: 'NASA', views: 12400000, dur: 1820, id: '6FNpKEU48W0' },
  ];

  return scienceCreators.map((item, idx) => ({
    id: item.id,
    type: 'video',
    title: item.title,
    uploader: item.uploader,
    duration: item.dur,
    views: item.views,
    publishedText: 'Curated Science',
    thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    avatar: '',
    url: `https://www.youtube.com/watch?v=${item.id}`,
  }));
}

function getScienceMockShorts() {
  const shorts = [
    { title: 'Why sound waves bend in cold water', uploader: 'Steve Mould', views: 1200000, dur: 45, id: 'd2A3wPzFhTI' },
    { title: 'The unbelievable geometry of 4D shapes', uploader: '3Blue1Brown', views: 3400000, dur: 55, id: 'w1A4u79f5B0' },
    { title: 'Microscopic look at immune cells attacking bacteria', uploader: 'Real Science', views: 2800000, dur: 48, id: 'uH3jP8k6yX4' },
    { title: 'How rockets steer in the vacuum of space', uploader: 'Real Engineering', views: 1900000, dur: 58, id: 't4U0LgHk3hA' },
    { title: 'Extreme High Speed Balloon Pop at 100,000 FPS', uploader: 'SmarterEveryDay', views: 4200000, dur: 50, id: 'gH3a0dY2j9c' },
    { title: 'Chemical Reaction that creates metallic trees', uploader: 'NileRed', views: 5100000, dur: 59, id: 'jX7_vF8a1_E' },
  ];
  return shorts.map((s) => ({
    id: s.id,
    type: 'shorts',
    title: s.title,
    uploader: s.uploader,
    duration: s.dur,
    views: s.views,
    thumbnail: `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`,
    avatar: '',
    url: `https://www.youtube.com/shorts/${s.id}`,
  }));
}
