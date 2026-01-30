// Vercel Serverless API - Sites endpoint
import { db } from '../lib/db.js';
import { Site, Check } from '../lib/models.js';
import { isUrlSafe, isValidUUID, checkRateLimit } from '../lib/security.js';
import { validateSite, validateBulkImport } from '../lib/validation.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    if (req.method === 'GET') {
      const sites = Site.findAll().map(site => ({
        ...site,
        latestCheck: Check.findLatest(site.id),
        uptime24h: Check.getUptime(site.id, 24)
      }));
      return res.status(200).json(sites);
    }

    if (req.method === 'POST') {
      const validation = validateSite(req.body);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // SSRF check
      const urlCheck = isUrlSafe(req.body.url);
      if (!urlCheck.safe) {
        return res.status(400).json({ error: urlCheck.reason });
      }

      // Check for duplicates
      if (Site.findByUrl(req.body.url)) {
        return res.status(409).json({ error: 'Site already exists' });
      }

      const site = Site.create(req.body);
      return res.status(201).json(site);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
