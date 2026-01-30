import { db } from './db.js';
import { sanitizeForCSV, sanitizeLabel } from './security.js';
import { v4 as uuidv4 } from 'uuid';

export const Site = {
  create(data) {
    const id = uuidv4();
    const site = {
      id,
      url: data.url,
      label: sanitizeLabel(data.label),
      check_interval: Math.min(Math.max(data.checkInterval || 5, 1), 60),
      timeout: Math.min(Math.max(data.timeout || 30000, 1000), 120000),
      is_paused: false,
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 10).map(t => sanitizeLabel(t)) : [],
      group_name: sanitizeLabel(data.groupName || ''),
      created_at: new Date().toISOString()
    };
    db.sites.set(id, site);
    return site;
  },

  findById(id) {
    return db.sites.get(id) || null;
  },

  findAll() {
    return Array.from(db.sites.values()).sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  },

  findActive() {
    return this.findAll().filter(s => !s.is_paused);
  },

  findByUrl(url) {
    return Array.from(db.sites.values()).find(s => s.url === url);
  },

  update(id, data) {
    const site = db.sites.get(id);
    if (!site) return null;
    
    if (data.label !== undefined) site.label = sanitizeLabel(data.label);
    if (data.checkInterval !== undefined) site.check_interval = Math.min(Math.max(data.checkInterval, 1), 60);
    if (data.timeout !== undefined) site.timeout = Math.min(Math.max(data.timeout, 1000), 120000);
    if (data.isPaused !== undefined) site.is_paused = Boolean(data.isPaused);
    if (data.tags !== undefined) site.tags = Array.isArray(data.tags) ? data.tags.slice(0, 10).map(t => sanitizeLabel(t)) : [];
    if (data.groupName !== undefined) site.group_name = sanitizeLabel(data.groupName);
    
    db.sites.set(id, site);
    return site;
  },

  delete(id) {
    db.sites.delete(id);
    for (const [checkId, check] of db.checks) {
      if (check.site_id === id) db.checks.delete(checkId);
    }
    for (const [alertId, alert] of db.alerts) {
      if (alert.site_id === id) db.alerts.delete(alertId);
    }
  },

  bulkCreate(sites, maxItems = 50) {
    const results = [];
    const items = Array.isArray(sites) ? sites.slice(0, maxItems) : [];
    for (const s of items) {
      if (s.url && !this.findByUrl(s.url)) {
        results.push(this.create(s));
      }
    }
    return results;
  }
};

export const Check = {
  create(data) {
    const id = db.nextCheckId();
    const check = {
      id,
      site_id: data.siteId,
      status: data.status,
      status_code: data.statusCode || null,
      response_time: data.responseTime || null,
      error_message: data.errorMessage ? String(data.errorMessage).slice(0, 500) : null,
      checked_at: new Date().toISOString()
    };
    db.checks.set(id, check);
    return check;
  },

  findLatest(siteId) {
    let latest = null;
    let latestTime = 0;
    for (const check of db.checks.values()) {
      if (check.site_id === siteId) {
        const time = new Date(check.checked_at).getTime();
        if (time > latestTime) {
          latestTime = time;
          latest = check;
        }
      }
    }
    return latest;
  },

  findBySite(siteId, opts = {}) {
    const limit = Math.min(opts.limit || 100, 500);
    return Array.from(db.checks.values())
      .filter(c => c.site_id === siteId)
      .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))
      .slice(0, limit);
  },

  getUptime(siteId, hours = 24) {
    const maxHours = Math.min(hours, 720);
    const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
    let total = 0, upCount = 0;
    
    for (const check of db.checks.values()) {
      if (check.site_id === siteId && new Date(check.checked_at) >= cutoff) {
        total++;
        if (check.status === 'up') upCount++;
      }
    }
    
    if (total === 0) return 100;
    return Math.round((upCount / total) * 10000) / 100;
  },

  getStats(siteId, hours = 24) {
    const maxHours = Math.min(hours, 720);
    const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
    const checks = [];
    
    for (const check of db.checks.values()) {
      if (check.site_id === siteId && new Date(check.checked_at) >= cutoff) {
        checks.push(check);
      }
    }
    
    if (checks.length === 0) return null;
    
    const responseTimes = checks.filter(c => c.response_time).map(c => c.response_time);
    return {
      total_checks: checks.length,
      up_count: checks.filter(c => c.status === 'up').length,
      down_count: checks.filter(c => c.status === 'down').length,
      avg_response_time: responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : null,
      min_response_time: responseTimes.length ? Math.min(...responseTimes) : null,
      max_response_time: responseTimes.length ? Math.max(...responseTimes) : null
    };
  },

  getHourlyStats(siteId, hours = 24) {
    const maxHours = Math.min(hours, 168);
    const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
    const hourlyMap = new Map();
    
    for (const check of db.checks.values()) {
      if (check.site_id === siteId && new Date(check.checked_at) >= cutoff) {
        const hour = check.checked_at.slice(0, 13) + ':00:00';
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { hour, total: 0, up_count: 0, response_times: [] });
        }
        const h = hourlyMap.get(hour);
        h.total++;
        if (check.status === 'up') h.up_count++;
        if (check.response_time) h.response_times.push(check.response_time);
      }
    }
    
    return Array.from(hourlyMap.values())
      .map(h => ({
        hour: h.hour,
        total: h.total,
        up_count: h.up_count,
        avg_response_time: h.response_times.length ? h.response_times.reduce((a, b) => a + b, 0) / h.response_times.length : 0
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  },

  exportCSV(siteId) {
    const checks = this.findBySite(siteId, { limit: 5000 });
    const headers = ['ID', 'Status', 'Code', 'Response(ms)', 'Error', 'Time'];
    const rows = checks.map(c => [
      sanitizeForCSV(c.id),
      sanitizeForCSV(c.status),
      sanitizeForCSV(c.status_code),
      sanitizeForCSV(c.response_time),
      sanitizeForCSV(c.error_message),
      sanitizeForCSV(c.checked_at)
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
};

export const Alert = {
  create(data) {
    const id = db.nextAlertId();
    const alert = {
      id,
      site_id: data.siteId,
      type: data.type,
      message: String(data.message || '').slice(0, 500),
      sent_at: new Date().toISOString()
    };
    db.alerts.set(id, alert);
    return alert;
  },

  findBySite(siteId, limit = 50) {
    const maxLimit = Math.min(limit, 100);
    return Array.from(db.alerts.values())
      .filter(a => a.site_id === siteId)
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      .slice(0, maxLimit);
  },

  getLastAlert(siteId, type) {
    const alerts = this.findBySite(siteId).filter(a => a.type === type);
    return alerts[0] || null;
  },

  canSend(siteId, type, cooldownMin) {
    const last = this.getLastAlert(siteId, type);
    if (!last) return true;
    return (Date.now() - new Date(last.sent_at).getTime()) > cooldownMin * 60 * 1000;
  }
};
