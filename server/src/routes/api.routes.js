import { Router } from 'express';
import { rateLimit } from '../middlewares/rateLimiter.js';
import { getFeed } from '../controllers/feed.controller.js';
import { handleSearch } from '../controllers/search.controller.js';
import { getVideoInfo, handleRelatedVideos } from '../controllers/video.controller.js';
import { handleDownload } from '../controllers/download.controller.js';
import { isAvailable, FFMPEG_PRESENT } from '../services/ytdlp.service.js';

const router = Router();

// Health and Version Check
router.get(['/health', '/api/health', '/api/version'], (req, res) => {
  res.json({
    ok: true,
    service: 'videofetch-server',
    version: '2.1.0',
    ytdlp: isAvailable(),
    ffmpeg: FFMPEG_PRESENT,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Curated Science & Education Feed
router.get('/api/feed', rateLimit('feed', 60, 60_000), getFeed);

// Search with Channel Identification
router.get('/api/search', rateLimit('search', 40, 60_000), handleSearch);

// Video Metadata Info
router.post('/api/info', rateLimit('info', 30, 60_000), getVideoInfo);

// Related Videos Below Player
router.get('/api/related', rateLimit('related', 40, 60_000), handleRelatedVideos);

// Download & Stream
router.get(['/api/download', '/api/stream'], rateLimit('download', 40, 60_000), handleDownload);

export default router;
