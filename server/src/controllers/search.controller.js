import { searchWithChannels } from '../services/invidious.service.js';

export async function handleSearch(req, res) {
  const { q = '', type = 'all', blockShorts = '0' } = req.query;
  if (!q.trim()) {
    return res.json({ ok: true, query: '', channel: null, items: [] });
  }

  const shouldBlockShorts = blockShorts === '1' || blockShorts === 'true';

  try {
    const { channel, items } = await searchWithChannels(q, type, shouldBlockShorts);
    return res.json({
      ok: true,
      query: q,
      type,
      channel,
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed: ' + err.message });
  }
}
