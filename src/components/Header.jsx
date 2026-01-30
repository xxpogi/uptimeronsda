import React from 'react';

export function Header({ onAddSite, onBulkImport, stats }) {
  return (
    <header className="glass-static sticky top-4 mx-4 mt-4 mb-8 px-6 py-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Uptime Monitor</h1>
            <p className="text-sm text-white/50 flex items-center gap-3">
              <span>{stats.total} sites</span>
              {stats.up > 0 && <span className="text-emerald-400">{stats.up} online</span>}
              {stats.down > 0 && <span className="text-red-400">{stats.down} down</span>}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-3" role="navigation" aria-label="Main actions">
          <button 
            onClick={onBulkImport} 
            className="btn btn-secondary"
            aria-label="Bulk import sites"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">Import</span>
          </button>
          <button 
            onClick={onAddSite} 
            className="btn btn-primary"
            aria-label="Add new site"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Site
          </button>
        </nav>
      </div>
    </header>
  );
}
