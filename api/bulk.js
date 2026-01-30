// Vercel Serverless API - Bulk import sites
import { initDatabase } from '../lib/db.js';
import { Site } from '../lib/models.js';
import { validateBulkImport } from '../lib/validation.js';
import { checkRateLimit } from '../lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    await initDatabase();

    const { sites } = req.body;

    const validation = validateBulkImport(sites);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const created = await Site.bulkCreate(validation.validSites, 50);

    return res.status(201).json({
      imported: created.length,
      skipped: validation.validSites.length - created.length,
      rejected: validation.errors.length,
      sites: created
    });
  } catch (error) {
    console.error('Bulk Import Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
