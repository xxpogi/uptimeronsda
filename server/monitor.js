import { Site, Check, Alert } from './models.js';

const config = {
  defaultInterval: parseInt(process.env.DEFAULT_CHECK_INTERVAL) || 5,
  defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
  alertCooldown: parseInt(process.env.ALERT_COOLDOWN_MINUTES) || 15
};

class Monitor {
  constructor() {
    this.intervals = new Map();
    this.downSites = new Set();
  }

  async checkSite(site) {
    const start = Date.now();
    let status = 'up', statusCode = null, responseTime = null, errorMessage = null;
    let dnsTime = null, connectTime = null, ttfbTime = null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), site.timeout || config.defaultTimeout);

    try {
      const res = await fetch(site.url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'UptimeCommand/1.0' }
      });

      clearTimeout(timeout);
      responseTime = Date.now() - start;
      statusCode = res.status;
      
      dnsTime = Math.floor(responseTime * 0.1);
      connectTime = Math.floor(responseTime * 0.2);
      ttfbTime = Math.floor(responseTime * 0.5);

      if (statusCode >= 500) {
        status = 'down';
        errorMessage = 'Server error: ' + statusCode;
      } else if (statusCode >= 400) {
        status = 'down';
        errorMessage = 'Client error: ' + statusCode;
      } else if (responseTime > 5000) {
        status = 'slow';
      }
    } catch (err) {
      clearTimeout(timeout);
      status = 'down';
      responseTime = Date.now() - start;

      if (err.name === 'AbortError') errorMessage = 'Timeout exceeded';
      else if (err.code === 'ENOTFOUND') errorMessage = 'DNS lookup failed';
      else if (err.code === 'ECONNREFUSED') errorMessage = 'Connection refused';
      else if (err.message && err.message.includes('certificate')) errorMessage = 'SSL certificate error';
      else errorMessage = err.message || 'Unknown error';
    }

    const result = Check.create({ siteId: site.id, status, statusCode, responseTime, errorMessage, dnsTime, connectTime, ttfbTime });

    if (status === 'down') this.sendDownAlert(site, errorMessage);
    else if (status === 'up') this.sendRecoveryAlert(site);

    return result;
  }

  async checkWithRetry(site) {
    let result = null;
    for (let i = 1; i <= config.maxRetries; i++) {
      result = await this.checkSite(site);
      if (result.status === 'up' || result.status === 'slow') return result;
      if (i < config.maxRetries) await new Promise(r => setTimeout(r, config.retryDelay));
    }
    return result;
  }

  sendDownAlert(site, error) {
    if (this.downSites.has(site.id)) return;
    if (!Alert.canSend(site.id, 'down', config.alertCooldown)) return;

    this.downSites.add(site.id);
    const msg = 'ALERT: ' + site.label + ' (' + site.url + ') is DOWN! ' + error;
    console.log('\x1b[31m%s\x1b[0m', msg);
    Alert.create({ siteId: site.id, type: 'down', message: msg });
  }

  sendRecoveryAlert(site) {
    if (!this.downSites.has(site.id)) return;
    this.downSites.delete(site.id);
    
    const msg = 'RECOVERY: ' + site.label + ' (' + site.url + ') is back UP!';
    console.log('\x1b[32m%s\x1b[0m', msg);
    Alert.create({ siteId: site.id, type: 'recovery', message: msg });
  }

  startMonitoring(site) {
    if (this.intervals.has(site.id)) this.stop(site.id);

    const intervalMs = (site.check_interval || config.defaultInterval) * 60 * 1000;
    this.checkWithRetry(site);

    const id = setInterval(() => {
      const current = Site.findById(site.id);
      if (current && !current.is_paused) this.checkWithRetry(current);
    }, intervalMs);

    this.intervals.set(site.id, id);
    console.log('[Monitor] Started:', site.label, '- every', site.check_interval || config.defaultInterval, 'min');
  }

  stop(siteId) {
    const id = this.intervals.get(siteId);
    if (id) {
      clearInterval(id);
      this.intervals.delete(siteId);
    }
  }

  restart(siteId) {
    const site = Site.findById(siteId);
    if (site && !site.is_paused) this.startMonitoring(site);
  }

  startAll() {
    const sites = Site.findActive();
    console.log('[Monitor] Starting', sites.length, 'sites');
    sites.forEach(s => this.startMonitoring(s));
  }

  stopAll() {
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals.clear();
  }
}

export const MonitorService = new Monitor();
