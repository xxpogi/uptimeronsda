import React, { useState, useCallback, useMemo } from 'react';
import { useSites } from './hooks/useSites';
import { Header } from './components/Header';
import { StatsPanel } from './components/StatsPanel';
import { SiteCard } from './components/SiteCard';
import { AddSiteModal } from './components/AddSiteModal';
import { BulkImportModal } from './components/BulkImportModal';
import { HistoryModal } from './components/HistoryModal';

export default function App() {
  const { sites, loading, error, refresh, addSite, updateSite, deleteSite, checkSite, bulkImport } = useSites();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [search, setSearch] = useState('');

  const handleAddOrUpdate = useCallback(async (data, id) => {
    if (id) await updateSite(id, data);
    else await addSite(data);
  }, [updateSite, addSite]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Delete this site?')) await deleteSite(id);
  }, [deleteSite]);

  const handleEdit = useCallback((site) => {
    setEditSite(site);
    setShowAddModal(true);
  }, []);

  const handleViewHistory = useCallback((site) => {
    setSelectedSite(site);
    setShowHistoryModal(true);
  }, []);

  const stats = useMemo(() => ({
    total: sites.length,
    up: sites.filter(s => !s.is_paused && s.latestCheck?.status === 'up').length,
    down: sites.filter(s => !s.is_paused && s.latestCheck?.status === 'down').length
  }), [sites]);

  const filteredSites = useMemo(() => sites.filter(site => 
    !search || 
    site.label.toLowerCase().includes(search.toLowerCase()) ||
    site.url.toLowerCase().includes(search.toLowerCase())
  ), [sites, search]);

  return (
    <div className="min-h-screen pb-16">
      <Header 
        onAddSite={() => { setEditSite(null); setShowAddModal(true); }}
        onBulkImport={() => setShowBulkModal(true)}
        stats={stats}
      />

      <main className="max-w-7xl mx-auto">
        {error && (
          <div className="mx-4 mb-6 p-4 glass border-red-500/20 text-red-400 text-sm flex items-center justify-between" role="alert">
            <span>{error}</span>
            <button onClick={refresh} className="text-red-300 hover:text-white underline ml-4">Retry</button>
          </div>
        )}

        <StatsPanel sites={sites} />

        <div className="px-4 mb-8">
          <div className="relative max-w-md">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="search" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sites..." 
              className="input pl-12" 
              aria-label="Search sites"
            />
          </div>
        </div>

        <section className="px-4" aria-label="Monitored sites">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="loader" aria-label="Loading sites"></div>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="glass p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">
                {sites.length === 0 ? 'No sites yet' : 'No results found'}
              </h2>
              <p className="text-white/50 mb-8 max-w-sm mx-auto">
                {sites.length === 0 ? 'Add your first website to start monitoring uptime and response times.' : 'Try adjusting your search terms.'}
              </p>
              {sites.length === 0 && (
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Site
                </button>
              )}
            </div>
          ) : (
            <div className="sites-grid">
              {filteredSites.map(site => (
                <SiteCard 
                  key={site.id} 
                  site={site}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCheck={checkSite}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <AddSiteModal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); setEditSite(null); }}
        onSubmit={handleAddOrUpdate} 
        editSite={editSite} 
      />
      <BulkImportModal 
        isOpen={showBulkModal} 
        onClose={() => setShowBulkModal(false)} 
        onSubmit={bulkImport} 
      />
      <HistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => { setShowHistoryModal(false); setSelectedSite(null); }}
        site={selectedSite} 
      />
    </div>
  );
}
