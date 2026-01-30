// Vercel Serverless API - Single site operations
import { Site, Check, Alert } from '../../lib/models.js';
import { isValidUUID, checkRateLimit } from '../../lib/security.js';
import { validateSiteUpdate } from '../../lib/validation.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { id } = req.query;

  // Validate UUID
  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid site ID format' });
  }

  try {
    const site = Site.findById(id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        ...site,
        latestCheck: Check.findLatest(id),
        uptime24h: Check.getUptime(id, 24),
        stats: Check.getStats(id, 24)
      });
    }

    if (req.method === 'PUT') {
      const validation = validateSiteUpdate(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const updated = Site.update(id, req.body);
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      Site.delete(id);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
