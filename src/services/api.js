const API = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(API + endpoint, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.headers.get('content-type')?.includes('text/csv')) return res.text();
  return res.json();
}

export const api = {
  getSites: () => request('/sites'),
  getSite: (id) => request('/sites/' + id),
  createSite: (data) => request('/sites', { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (id, data) => request('/sites/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSite: (id) => request('/sites/' + id, { method: 'DELETE' }),
  bulkImport: (sites) => request('/sites/bulk', { method: 'POST', body: JSON.stringify({ sites }) }),
  checkSite: (id) => request('/sites/' + id + '/check', { method: 'POST' }),
  getStatus: () => request('/status'),
  getHistory: (id) => request('/history/' + id),
  getChartData: (id, hours = 24) => request('/history/' + id + '/chart?hours=' + hours),
  exportHistory: (id) => request('/history/' + id + '/export'),
  getAlerts: (id) => request('/history/' + id + '/alerts')
};
