// Vercel Serverless API - System status
import { initDatabase, query } from '../lib/db.js';
import { Site, Check } from '../lib/models.js';

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

  try {
    await initDatabase();

    const sites = await Site.findAll();
    const activeSites = sites.filter(s => !s.is_paused);

    let upCount = 0;
    let downCount = 0;

    for (const site of activeSites) {
      const latest = await Check.findLatest(site.id);
      if (latest?.status === 'up') upCount++;
      else if (latest?.status === 'down') downCount++;
    }

    const checksCount = await query('SELECT COUNT(*) as count FROM checks');
    const alertsCount = await query('SELECT COUNT(*) as count FROM alerts');

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sites: {
        total: sites.length,
        active: activeSites.length,
        paused: sites.length - activeSites.length,
        up: upCount,
        down: downCount
      },
      storage: {
        sites: sites.length,
        checks: parseInt(checksCount.rows[0].count),
        alerts: parseInt(alertsCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Status Error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}
