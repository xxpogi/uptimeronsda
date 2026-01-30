import React, { useState } from 'react';

export function SiteCard({ site, onEdit, onDelete, onCheck, onViewHistory }) {
  const [checking, setChecking] = useState(false);
  
  const status = site.is_paused ? 'paused' : (site.latestCheck?.status || 'pending');
  const responseTime = site.latestCheck?.response_time;
  const lastChecked = site.latestCheck?.checked_at;

  const handleCheck = async () => {
    setChecking(true);
    try { await onCheck(site.id); } 
    finally { setChecking(false); }
  };

  const formatTime = (iso) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const badges = {
    up: { label: 'Online', cls: 'badge-success' },
    down: { label: 'Offline', cls: 'badge-danger' },
    slow: { label: 'Slow', cls: 'badge-warning' },
    paused: { label: 'Paused', cls: 'badge-neutral' },
    pending: { label: 'Pending', cls: 'badge-neutral' }
  };
  const badge = badges[status] || badges.pending;

  return (
    <article className="glass p-6 cursor-pointer" role="article" aria-label={site.label + ' status: ' + badge.label}>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={'status-indicator ' + status} aria-hidden="true"></div>
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate text-base">{site.label}</h3>
            <a 
              href={site.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-white/40 hover:text-violet-400 truncate block transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {site.url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        </div>
        <span className={'badge ' + badge.cls}>{badge.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-white/40 mb-1">Response</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {responseTime ? responseTime + 'ms' : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Uptime</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {site.uptime24h !== undefined ? site.uptime24h + '%' : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Last Check</p>
          <p className="text-base text-white/60">{formatTime(lastChecked)}</p>
        </div>
      </div>

      {site.tags && site.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {site.tags.map((tag, i) => (
            <span key={i} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-5 border-t border-white/5">
        <button 
          onClick={handleCheck} 
          disabled={checking || site.is_paused}
          className="flex-1 btn btn-secondary"
          aria-label="Check site now"
        >
          {checking ? <span className="loader" aria-label="Checking"></span> : 'Check Now'}
        </button>
        <button onClick={() => onViewHistory(site)} className="btn btn-ghost" aria-label="View history">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        <button onClick={() => onEdit(site)} className="btn btn-ghost" aria-label="Edit site">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(site.id)} className="btn btn-ghost btn-danger" aria-label="Delete site">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </article>
  );
}
