// Vercel Serverless API - Manual site check
import { Site, Check } from '../../../lib/models.js';
import { isValidUUID, isUrlSafe, checkRateLimit } from '../../../lib/security.js';

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

  const { id } = req.query;

  if (!isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid site ID format' });
  }

  try {
    const site = Site.findById(id);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // SSRF protection
    const urlCheck = isUrlSafe(site.url);
    if (!urlCheck.safe) {
      return res.status(400).json({ error: urlCheck.reason });
    }

    const startTime = Date.now();
    let status = 'down';
    let statusCode = null;
    let errorMessage = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), site.timeout || 30000);

      const response = await fetch(site.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'UptimeChecker/1.0' },
        redirect: 'follow'
      });

      clearTimeout(timeout);
      statusCode = response.status;
      status = response.ok ? 'up' : 'down';
    } catch (err) {
      errorMessage = err.name === 'AbortError' ? 'Request timeout' : err.message;
    }

    const responseTime = Date.now() - startTime;
    const check = Check.create({
      siteId: id,
      status,
      statusCode,
      responseTime,
      errorMessage
    });

    return res.status(200).json(check);
  } catch (error) {
    console.error('Check Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
