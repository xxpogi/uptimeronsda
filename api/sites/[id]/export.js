// Vercel Serverless API - Export site data as CSV
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

  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid site ID format' });
  }

  try {
    await initDatabase();

    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const csv = await Check.exportCSV(id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${site.label}-history.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
