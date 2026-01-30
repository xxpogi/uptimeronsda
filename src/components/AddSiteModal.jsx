import React, { useState, useEffect, useRef } from 'react';

export function AddSiteModal({ isOpen, onClose, onSubmit, editSite }) {
  const [formData, setFormData] = useState({
    url: '', label: '', checkInterval: 5, timeout: 30000, tags: '', groupName: '', isPaused: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editSite) {
      setFormData({
        url: editSite.url,
        label: editSite.label,
        checkInterval: editSite.check_interval || 5,
        timeout: editSite.timeout || 30000,
        tags: (editSite.tags || []).join(', '),
        groupName: editSite.group_name || '',
        isPaused: editSite.is_paused || false
      });
    } else {
      setFormData({ url: '', label: '', checkInterval: 5, timeout: 30000, tags: '', groupName: '', isPaused: false });
    }
    setError('');
  }, [editSite, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        checkInterval: parseInt(formData.checkInterval),
        timeout: parseInt(formData.timeout),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }, editSite?.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="glass-static w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 id="modal-title" className="text-xl font-semibold text-white">
            {editSite ? 'Edit Site' : 'Add New Site'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="url" className="block text-sm text-white/60 mb-2">URL</label>
            <input 
              ref={inputRef}
              id="url"
              type="url" 
              value={formData.url} 
              disabled={!!editSite}
              onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com" 
              className="input" 
              required 
            />
          </div>

          <div>
            <label htmlFor="label" className="block text-sm text-white/60 mb-2">Label</label>
            <input 
              id="label"
              type="text" 
              value={formData.label}
              onChange={e => setFormData(p => ({ ...p, label: e.target.value }))}
              placeholder="My Website" 
              className="input" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="interval" className="block text-sm text-white/60 mb-2">Check Interval</label>
              <select id="interval" value={formData.checkInterval} className="input"
                onChange={e => setFormData(p => ({ ...p, checkInterval: e.target.value }))}>
                <option value="1">1 min</option>
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="30">30 min</option>
              </select>
            </div>
            <div>
              <label htmlFor="timeout" className="block text-sm text-white/60 mb-2">Timeout</label>
              <select id="timeout" value={formData.timeout} className="input"
                onChange={e => setFormData(p => ({ ...p, timeout: e.target.value }))}>
                <option value="10000">10 sec</option>
                <option value="30000">30 sec</option>
                <option value="60000">60 sec</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm text-white/60 mb-2">Tags (comma separated)</label>
            <input 
              id="tags"
              type="text" 
              value={formData.tags}
              onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
              placeholder="production, api" 
              className="input" 
            />
          </div>

          {editSite && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.isPaused}
                onChange={e => setFormData(p => ({ ...p, isPaused: e.target.checked }))}
                className="w-5 h-5 rounded bg-white/5 border-white/20 text-violet-500 focus:ring-violet-500 focus:ring-offset-0" 
              />
              <span className="text-sm text-white/60">Pause monitoring</span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
              {loading ? <span className="loader"></span> : (editSite ? 'Save Changes' : 'Add Site')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
