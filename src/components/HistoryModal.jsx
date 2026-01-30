import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ResponseChart } from './ResponseChart';

export function HistoryModal({ isOpen, onClose, site }) {
  const [history, setHistory] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (isOpen && site) {
      setLoading(true);
      api.getHistory(site.id)
        .then((hist) => {
          setHistory(hist);
          // Transform hourlyStats for chart display
          const chartFormatted = (hist.hourlyStats || []).map(h => ({
            time: h.hour,
            avgResponseTime: h.avg_response_time || 0,
            uptime: h.total > 0 ? Math.round((h.up_count / h.total) * 100) : 100
          }));
          setChartData(chartFormatted);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, site]);

  const handleExport = async () => {
    const csv = await api.exportHistory(site.id);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = site.label.replace(/[^a-z0-9]/gi, '_') + '_history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen || !site) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'History' },
    { id: 'chart', label: 'Charts' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="glass-static w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-white">{site.label}</h2>
            <p className="text-sm text-white/40">{site.url}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn btn-secondary text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <nav className="flex border-b border-white/5" role="tablist">
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
              className={'px-6 py-4 text-sm font-medium transition-colors ' + 
                (tab === t.id ? 'text-violet-400 border-b-2 border-violet-400' : 'text-white/50 hover:text-white')}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6" role="tabpanel">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="loader"></div>
            </div>
          ) : tab === 'overview' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Uptime 24h" value={(site.uptime24h || 100) + '%'} />
              <Stat label="Uptime 7d" value={(site.uptime7d || 100) + '%'} />
              <Stat label="Avg Response" value={(history?.stats?.avg_response_time ? Math.round(history.stats.avg_response_time) : 0) + 'ms'} />
              <Stat label="Total Checks" value={history?.stats?.total_checks || 0} />
            </div>
          ) : tab === 'history' ? (
            <div className="space-y-2">
              {history?.checks?.length > 0 ? (
                history.checks.slice(0, 30).map((c, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.02] border border-white/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={'status-indicator ' + c.status}></div>
                      <span className={'badge ' + (c.status === 'up' ? 'badge-success' : c.status === 'down' ? 'badge-danger' : 'badge-warning')}>
                        {c.status}
                      </span>
                    </div>
                    <span className="text-white/60 tabular-nums">{c.response_time ? c.response_time + 'ms' : '—'}</span>
                    <span className="text-sm text-white/40">{new Date(c.checked_at).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-white/40 py-12">No checks recorded yet</p>
              )}
            </div>
          ) : (
            <ResponseChart data={chartData} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
      <p className="text-sm text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}
