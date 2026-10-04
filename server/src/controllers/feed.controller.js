import { getCuratedFeed } from '../services/invidious.service.js';

export async function getFeed(req, res) {
  const {
    type = 'videos',
    category = 'science_all',
    blockShorts = '0',
    seed = Date.now(),
    page = 1,
    limit = 24,
  } = req.query;
  const shouldBlockShorts = blockShorts === '1' || blockShorts === 'true';

  try {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(300, Math.max(5, parseInt(limit, 10) || 24));

    const items = await getCuratedFeed({
      type,
      category,
      blockShorts: shouldBlockShorts,
      seed,
      page: pageNum,
      limit: limitNum,
    });
    return res.json({
      ok: true,
      type,
      category,
      page: pageNum,
      items,
      maxLimit: type === 'shorts' ? 300 : 100,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch curated feed: ' + err.message });
  }
}
