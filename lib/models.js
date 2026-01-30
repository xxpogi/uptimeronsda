import { query } from './db.js';
import { sanitizeForCSV, sanitizeLabel } from './security.js';

export const Site = {
  async create(data) {
    const result = await query(
      `INSERT INTO sites (url, label, check_interval, timeout, is_paused, tags, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.url,
        sanitizeLabel(data.label),
        Math.min(Math.max(data.checkInterval || 5, 1), 60),
        Math.min(Math.max(data.timeout || 30000, 1000), 120000),
        false,
        Array.isArray(data.tags) ? data.tags.slice(0, 10).map(t => sanitizeLabel(t)) : [],
        sanitizeLabel(data.groupName || '')
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM sites WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findAll() {
    const result = await query('SELECT * FROM sites ORDER BY created_at DESC');
    return result.rows;
  },

  async findActive() {
    const result = await query('SELECT * FROM sites WHERE is_paused = FALSE ORDER BY created_at DESC');
    return result.rows;
  },

  async findByUrl(url) {
    const result = await query('SELECT * FROM sites WHERE url = $1', [url]);
    return result.rows[0] || null;
  },

  async update(id, data) {
    const sets = [];
    const values = [];
    let paramCount = 1;

    if (data.label !== undefined) {
      sets.push(`label = $${paramCount++}`);
      values.push(sanitizeLabel(data.label));
    }
    if (data.checkInterval !== undefined) {
      sets.push(`check_interval = $${paramCount++}`);
      values.push(Math.min(Math.max(data.checkInterval, 1), 60));
    }
    if (data.timeout !== undefined) {
      sets.push(`timeout = $${paramCount++}`);
      values.push(Math.min(Math.max(data.timeout, 1000), 120000));
    }
    if (data.isPaused !== undefined) {
      sets.push(`is_paused = $${paramCount++}`);
      values.push(Boolean(data.isPaused));
    }
    if (data.tags !== undefined) {
      sets.push(`tags = $${paramCount++}`);
      values.push(Array.isArray(data.tags) ? data.tags.slice(0, 10).map(t => sanitizeLabel(t)) : []);
    }
    if (data.groupName !== undefined) {
      sets.push(`group_name = $${paramCount++}`);
      values.push(sanitizeLabel(data.groupName));
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE sites SET ${sets.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    await query('DELETE FROM sites WHERE id = $1', [id]);
  },

  async bulkCreate(sites, maxItems = 50) {
    const results = [];
    const items = Array.isArray(sites) ? sites.slice(0, maxItems) : [];
    for (const s of items) {
      if (s.url) {
        const existing = await this.findByUrl(s.url);
        if (!existing) {
          results.push(await this.create(s));
        }
      }
    }
    return results;
  }
};

export const Check = {
  async create(data) {
    const result = await query(
      `INSERT INTO checks (site_id, status, status_code, response_time, error_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.siteId,
        data.status,
        data.statusCode || null,
        data.responseTime || null,
        data.errorMessage ? String(data.errorMessage).slice(0, 500) : null
      ]
    );
    return result.rows[0];
  },

  async findLatest(siteId) {
    const result = await query(
      'SELECT * FROM checks WHERE site_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [siteId]
    );
    return result.rows[0] || null;
  },

  async findBySite(siteId, opts = {}) {
    const limit = Math.min(opts.limit || 100, 500);
    const result = await query(
      'SELECT * FROM checks WHERE site_id = $1 ORDER BY checked_at DESC LIMIT $2',
      [siteId, limit]
    );
    return result.rows;
  },

  async getUptime(siteId, hours = 24) {
    const maxHours = Math.min(hours, 720);
    const result = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'up') as up_count
       FROM checks
       WHERE site_id = $1 AND checked_at >= NOW() - INTERVAL '1 hour' * $2`,
      [siteId, maxHours]
    );
    const { total, up_count } = result.rows[0];
    if (parseInt(total) === 0) return 100;
    return Math.round((parseInt(up_count) / parseInt(total)) * 10000) / 100;
  },

  async getStats(siteId, hours = 24) {
    const maxHours = Math.min(hours, 720);
    const result = await query(
      `SELECT
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE status = 'up') as up_count,
        COUNT(*) FILTER (WHERE status = 'down') as down_count,
        AVG(response_time) FILTER (WHERE response_time IS NOT NULL) as avg_response_time,
        MIN(response_time) FILTER (WHERE response_time IS NOT NULL) as min_response_time,
        MAX(response_time) FILTER (WHERE response_time IS NOT NULL) as max_response_time
       FROM checks
       WHERE site_id = $1 AND checked_at >= NOW() - INTERVAL '1 hour' * $2`,
      [siteId, maxHours]
    );
    const row = result.rows[0];
    if (parseInt(row.total_checks) === 0) return null;
    return {
      total_checks: parseInt(row.total_checks),
      up_count: parseInt(row.up_count),
      down_count: parseInt(row.down_count),
      avg_response_time: row.avg_response_time ? parseFloat(row.avg_response_time) : null,
      min_response_time: row.min_response_time ? parseInt(row.min_response_time) : null,
      max_response_time: row.max_response_time ? parseInt(row.max_response_time) : null
    };
  },

  async getHourlyStats(siteId, hours = 24) {
    const maxHours = Math.min(hours, 168);
    const result = await query(
      `SELECT
        DATE_TRUNC('hour', checked_at) as hour,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'up') as up_count,
        AVG(response_time) FILTER (WHERE response_time IS NOT NULL) as avg_response_time
       FROM checks
       WHERE site_id = $1 AND checked_at >= NOW() - INTERVAL '1 hour' * $2
       GROUP BY DATE_TRUNC('hour', checked_at)
       ORDER BY hour`,
      [siteId, maxHours]
    );
    return result.rows.map(row => ({
      hour: row.hour,
      total: parseInt(row.total),
      up_count: parseInt(row.up_count),
      avg_response_time: row.avg_response_time ? parseFloat(row.avg_response_time) : 0
    }));
  },

  async exportCSV(siteId) {
    const checks = await this.findBySite(siteId, { limit: 5000 });
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
  async create(data) {
    const result = await query(
      `INSERT INTO alerts (site_id, type, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.siteId, data.type, String(data.message || '').slice(0, 500)]
    );
    return result.rows[0];
  },

  async findBySite(siteId, limit = 50) {
    const maxLimit = Math.min(limit, 100);
    const result = await query(
      'SELECT * FROM alerts WHERE site_id = $1 ORDER BY sent_at DESC LIMIT $2',
      [siteId, maxLimit]
    );
    return result.rows;
  },

  async getLastAlert(siteId, type) {
    const result = await query(
      'SELECT * FROM alerts WHERE site_id = $1 AND type = $2 ORDER BY sent_at DESC LIMIT 1',
      [siteId, type]
    );
    return result.rows[0] || null;
  },

  async canSend(siteId, type, cooldownMin) {
    const last = await this.getLastAlert(siteId, type);
    if (!last) return true;
    return (Date.now() - new Date(last.sent_at).getTime()) > cooldownMin * 60 * 1000;
  }
};
