import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import fs from 'fs';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './database.js';
import { Site, Check, Alert } from './models.js';
import { MonitorService } from './monitor.js';
import { validateSite, validateUpdate, handleErrors } from './validators.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

initDatabase();

app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/sites', (req, res) => {
  try {
    const sites = Site.findAll();
    const result = sites.map(site => {
      const latestCheck = Check.findLatest(site.id);
      const uptime24h = Check.getUptime(site.id, 24);
      const uptime7d = Check.getUptime(site.id, 168);
      const stats = Check.getStats(site.id, 24);
      return { ...site, latestCheck, uptime24h, uptime7d, avgResponseTime: stats?.avg_response_time ? Math.round(stats.avg_response_time) : null };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch sites' }); }
});

app.post('/api/sites', validateSite, handleErrors, (req, res) => {
  try {
    if (Site.findByUrl(req.body.url)) return res.status(409).json({ error: 'Site already exists' });
    const site = Site.create(req.body);
    MonitorService.startMonitoring(site);
    res.status(201).json(site);
  } catch (err) { res.status(500).json({ error: 'Failed to create site' }); }
});

app.post('/api/sites/bulk', (req, res) => {
  try {
    const sites = Site.bulkCreate(req.body.sites || []);
    sites.forEach(s => MonitorService.startMonitoring(s));
    res.status(201).json({ imported: sites.length, sites });
  } catch (err) { res.status(500).json({ error: 'Failed to import' }); }
});

app.get('/api/sites/:id', (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    const latestCheck = Check.findLatest(site.id);
    res.json({ ...site, latestCheck, uptime24h: Check.getUptime(site.id, 24), uptime7d: Check.getUptime(site.id, 168), stats: Check.getStats(site.id, 24) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/sites/:id', validateUpdate, handleErrors, (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    const updated = Site.update(req.params.id, req.body);
    if (req.body.isPaused === true) MonitorService.stop(req.params.id);
    else if (req.body.isPaused === false || req.body.checkInterval) MonitorService.restart(req.params.id);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/sites/:id', (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    MonitorService.stop(req.params.id);
    Site.delete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/sites/:id/check', async (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    const result = await MonitorService.checkWithRetry(site);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Check failed' }); }
});

app.get('/api/status', (req, res) => {
  try {
    const sites = Site.findAll();
    const overview = { total: sites.length, up: 0, down: 0, slow: 0, paused: 0 };
    sites.forEach(site => {
      const check = Check.findLatest(site.id);
      if (site.is_paused) overview.paused++;
      else if (check?.status === 'up') overview.up++;
      else if (check?.status === 'down') overview.down++;
      else if (check?.status === 'slow') overview.slow++;
    });
    res.json(overview);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/history/:id', (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    res.json({ siteId: site.id, label: site.label, checks: Check.findBySite(site.id, { limit: 100 }), stats: Check.getStats(site.id, 24), hourlyStats: Check.getHourlyStats(site.id, 24) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/history/:id/chart', (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    const hourly = Check.getHourlyStats(site.id, parseInt(req.query.hours) || 24);
    res.json({ siteId: site.id, chartData: hourly.map(h => ({ time: h.hour, uptime: h.total > 0 ? Math.round((h.up_count / h.total) * 100) : 100, avgResponseTime: Math.round(h.avg_response_time || 0) })) });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/history/:id/export', (req, res) => {
  try {
    const site = Site.findById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'text/csv');
    res.send(Check.exportCSV(site.id));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port);
  });
}

async function findPort(start) {
  for (let p = start; p < start + 100; p++) {
    if (await isPortAvailable(p)) return p;
  }
  return start;
}

async function start() {
  const port = await findPort(parseInt(process.env.PORT) || 3001);
  fs.writeFileSync(path.join(__dirname, '../.port'), String(port));
  app.listen(port, () => {
    console.log('\n  Uptime Monitor API running on port ' + port + '\n');
    MonitorService.startAll();
  });
}

start();
process.on('SIGTERM', () => { MonitorService.stopAll(); process.exit(0); });
process.on('SIGINT', () => { MonitorService.stopAll(); process.exit(0); });
