const API = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(API + endpoint, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  if (res.status === 204) return null;

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
  bulkImport: (sites) => request('/bulk', { method: 'POST', body: JSON.stringify({ sites }) }),
  checkSite: (id) => request('/sites/' + id + '/check', { method: 'POST' }),
  getStatus: () => request('/status'),
  getHistory: (id) => request('/sites/' + id + '/history'),
  exportHistory: (id) => request('/sites/' + id + '/export')
};
