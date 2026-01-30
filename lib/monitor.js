import { Site, Check, Alert } from './models.js';
import { isUrlSafe } from './security.js';
import { logger } from './logger.js';

const config = {
  defaultTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  alertCooldown: 15,
  slowThreshold: 5000  // Configurable slow threshold
};

const downSites = new Set();

export async function checkSite(site) {
  // SSRF protection check
  const urlCheck = isUrlSafe(site.url);
  if (!urlCheck.safe) {
    logger.warn('Blocked unsafe URL check', { siteId: site.id, reason: urlCheck.reason });
    return Check.create({
      siteId: site.id,
      status: 'down',
      errorMessage: 'URL blocked: ' + urlCheck.reason
    });
  }

  const start = Date.now();
  let status = 'up', statusCode = null, responseTime = null, errorMessage = null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), site.timeout || config.defaultTimeout);

  try {
    const res = await fetch(site.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'UptimeMonitor/1.0' }
    });

    clearTimeout(timeout);
    responseTime = Date.now() - start;
    statusCode = res.status;

    if (statusCode >= 500) {
      status = 'down';
      errorMessage = 'Server error: ' + statusCode;
    } else if (statusCode >= 400) {
      status = 'down';
      errorMessage = 'Client error: ' + statusCode;
    } else if (responseTime > config.slowThreshold) {
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
    else errorMessage = 'Connection failed';
    
    logger.error('Site check failed', { siteId: site.id, error: err.message });
  }

  const result = Check.create({ siteId: site.id, status, statusCode, responseTime, errorMessage });

  // Alert handling
  if (status === 'down') {
    if (!downSites.has(site.id) && Alert.canSend(site.id, 'down', config.alertCooldown)) {
      downSites.add(site.id);
      const msg = 'ALERT: ' + site.label + ' (' + site.url + ') is DOWN! ' + errorMessage;
      logger.warn(msg, { siteId: site.id, status: 'down' });
      Alert.create({ siteId: site.id, type: 'down', message: msg });
    }
  } else if (status === 'up' && downSites.has(site.id)) {
    downSites.delete(site.id);
    const msg = 'RECOVERY: ' + site.label + ' (' + site.url + ') is back UP!';
    logger.info(msg, { siteId: site.id, status: 'up' });
    Alert.create({ siteId: site.id, type: 'recovery', message: msg });
  }

  return result;
}

export async function checkWithRetry(site) {
  let result = null;
  for (let i = 1; i <= config.maxRetries; i++) {
    result = await checkSite(site);
    if (result.status === 'up' || result.status === 'slow') return result;
    if (i < config.maxRetries) await new Promise(r => setTimeout(r, config.retryDelay));
  }
  return result;
}
