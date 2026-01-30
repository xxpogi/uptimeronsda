// In-memory database with TTL cleanup and thread-safe ID generation
// For production, use Vercel KV, Upstash Redis, or PlanetScale

class Database {
  constructor() {
    this.sites = new Map();
    this.checks = new Map();
    this.alerts = new Map();
    this.checkIdCounter = 0;
    this.alertIdCounter = 0;
    this.MAX_CHECKS_PER_SITE = 1000;
    this.MAX_ALERTS_PER_SITE = 100;
    this.CHECK_TTL_HOURS = 168; // 7 days
  }

  // Thread-safe ID generation
  nextCheckId() {
    return ++this.checkIdCounter;
  }

  nextAlertId() {
    return ++this.alertIdCounter;
  }

  // Cleanup old records to prevent memory leak
  cleanup() {
    const cutoff = new Date(Date.now() - this.CHECK_TTL_HOURS * 60 * 60 * 1000);
    
    for (const [id, check] of this.checks) {
      if (new Date(check.checked_at) < cutoff) {
        this.checks.delete(id);
      }
    }

    // Limit checks per site
    const checksBySite = new Map();
    for (const [id, check] of this.checks) {
      if (!checksBySite.has(check.site_id)) {
        checksBySite.set(check.site_id, []);
      }
      checksBySite.get(check.site_id).push({ id, checked_at: check.checked_at });
    }

    for (const [siteId, checks] of checksBySite) {
      if (checks.length > this.MAX_CHECKS_PER_SITE) {
        checks.sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));
        const toDelete = checks.slice(this.MAX_CHECKS_PER_SITE);
        toDelete.forEach(c => this.checks.delete(c.id));
      }
    }
  }
}

// Singleton instance
export const db = new Database();

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => db.cleanup(), 60 * 60 * 1000);
}
