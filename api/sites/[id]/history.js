// Vercel Serverless API - Site history
import { initDatabase } from '../../../lib/db.js';
import { Site, Check } from '../../../lib/models.js';
import { isValidUUID, checkRateLimit } from '../../../lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { id } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);

  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid site ID format' });
  }

  try {
    await initDatabase();

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const [checks, hourlyStats, uptime24h, uptime7d] = await Promise.all([
      Check.findBySite(id, { limit }),
      Check.getHourlyStats(id, 24),
      Check.getUptime(id, 24),
      Check.getUptime(id, 168)
    ]);

    return res.status(200).json({
      site,
      checks,
      hourlyStats,
      uptime24h,
      uptime7d
    });
  } catch (error) {
    console.error('History Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
