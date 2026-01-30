// In-memory database storage
export const db = {
  sites: new Map(),
  checks: new Map(),
  alerts: new Map(),
  checkId: 0,
  alertId: 0
};

export function initDatabase() {
  console.log('[Database] In-memory storage initialized');
}
