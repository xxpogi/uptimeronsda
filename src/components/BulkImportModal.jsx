import React, { useState, useRef, useEffect } from 'react';

export function BulkImportModal({ isOpen, onClose, onSubmit }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const lines = input.split('\n').filter(line => line.trim());
      const sites = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        const url = parts[0];
        const label = parts[1] || url;
        const tags = parts.slice(2);
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          throw new Error('Invalid URL: ' + url);
        }
        return { url, label, tags };
      });

      if (sites.length === 0) throw new Error('No valid URLs found');

      await onSubmit(sites);
      setInput('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="bulk-title">
      <div className="glass-static w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="bulk-title" className="text-xl font-semibold text-white">Bulk Import</h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-white/50 mb-4">One site per line: URL, Label, Tags...</p>

        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-4 text-sm text-white/40 font-mono">
          https://google.com, Google, search<br/>
          https://github.com, GitHub
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea 
            ref={textareaRef}
            value={input} 
            onChange={e => setInput(e.target.value)}
            placeholder="https://example.com, My Site"
            className="input h-36 resize-none mb-4 font-mono text-sm" 
            required 
            aria-label="Sites to import"
          />

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
              {loading ? <span className="loader"></span> : 'Import Sites'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
