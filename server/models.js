import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export const Site = {
  create(data) {
    const id = uuidv4();
    const site = {
      id,
      url: data.url,
      label: data.label,
      check_interval: data.checkInterval || 5,
      timeout: data.timeout || 30000,
      is_paused: false,
      tags: data.tags || [],
      group_name: data.groupName || '',
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
    
    if (data.label !== undefined) site.label = data.label;
    if (data.checkInterval !== undefined) site.check_interval = data.checkInterval;
    if (data.timeout !== undefined) site.timeout = data.timeout;
    if (data.isPaused !== undefined) site.is_paused = data.isPaused;
    if (data.tags !== undefined) site.tags = data.tags;
    if (data.groupName !== undefined) site.group_name = data.groupName;
    
    db.sites.set(id, site);
    return site;
  },

  delete(id) {
    db.sites.delete(id);
    // Clean up related checks and alerts
    for (const [checkId, check] of db.checks) {
      if (check.site_id === id) db.checks.delete(checkId);
    }
    for (const [alertId, alert] of db.alerts) {
      if (alert.site_id === id) db.alerts.delete(alertId);
    }
  },

  bulkCreate(sites) {
    const results = [];
    for (const s of sites) {
      if (!this.findByUrl(s.url)) {
        results.push(this.create(s));
      }
    }
    return results;
  }
};

export const Check = {
  create(data) {
    const id = ++db.checkId;
    const check = {
      id,
      site_id: data.siteId,
      status: data.status,
      status_code: data.statusCode || null,
      response_time: data.responseTime || null,
      error_message: data.errorMessage || null,
      dns_time: data.dnsTime || null,
      connect_time: data.connectTime || null,
      ttfb_time: data.ttfbTime || null,
      checked_at: new Date().toISOString()
    };
    db.checks.set(id, check);
    return check;
  },

  findById(id) {
    return db.checks.get(id);
  },

  findLatest(siteId) {
    const checks = Array.from(db.checks.values())
      .filter(c => c.site_id === siteId)
      .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));
    return checks[0] || null;
  },

  findBySite(siteId, opts = {}) {
    const { limit = 100 } = opts;
    return Array.from(db.checks.values())
      .filter(c => c.site_id === siteId)
      .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))
      .slice(0, limit);
  },

  getUptime(siteId, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const checks = Array.from(db.checks.values())
      .filter(c => c.site_id === siteId && new Date(c.checked_at) >= cutoff);
    
    if (checks.length === 0) return 100;
    const upCount = checks.filter(c => c.status === 'up').length;
    return Math.round((upCount / checks.length) * 10000) / 100;
  },

  getStats(siteId, hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const checks = Array.from(db.checks.values())
      .filter(c => c.site_id === siteId && new Date(c.checked_at) >= cutoff);
    
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
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const checks = Array.from(db.checks.values())
      .filter(c => c.site_id === siteId && new Date(c.checked_at) >= cutoff);
    
    const hourlyMap = new Map();
    checks.forEach(c => {
      const hour = c.checked_at.slice(0, 13) + ':00:00';
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { hour, total: 0, up_count: 0, response_times: [] });
      }
      const h = hourlyMap.get(hour);
      h.total++;
      if (c.status === 'up') h.up_count++;
      if (c.response_time) h.response_times.push(c.response_time);
    });
    
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
    const checks = this.findBySite(siteId, { limit: 10000 });
    const h = ['ID', 'Status', 'Code', 'Response(ms)', 'Error', 'Time'];
    const rows = checks.map(c => [c.id, c.status, c.status_code || '', c.response_time || '', c.error_message || '', c.checked_at]);
    return [h, ...rows].map(r => r.join(',')).join('\n');
  }
};

export const Alert = {
  create(data) {
    const id = ++db.alertId;
    const alert = {
      id,
      site_id: data.siteId,
      type: data.type,
      message: data.message,
      sent_at: new Date().toISOString()
    };
    db.alerts.set(id, alert);
    return alert;
  },

  findById(id) {
    return db.alerts.get(id);
  },

  findBySite(siteId, limit = 50) {
    return Array.from(db.alerts.values())
      .filter(a => a.site_id === siteId)
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      .slice(0, limit);
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
