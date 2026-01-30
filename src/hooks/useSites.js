import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSites = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getSites();
      setSites(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
    const interval = setInterval(fetchSites, 30000);
    return () => clearInterval(interval);
  }, [fetchSites]);

  const addSite = async (data) => {
    const site = await api.createSite(data);
    setSites(prev => [site, ...prev]);
    return site;
  };

  const updateSite = async (id, data) => {
    const updated = await api.updateSite(id, data);
    setSites(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    return updated;
  };

  const deleteSite = async (id) => {
    await api.deleteSite(id);
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const checkSite = async (id) => {
    const result = await api.checkSite(id);
    await fetchSites();
    return result;
  };

  const bulkImport = async (sitesData) => {
    const result = await api.bulkImport(sitesData);
    await fetchSites();
    return result;
  };

  return { sites, loading, error, refresh: fetchSites, addSite, updateSite, deleteSite, checkSite, bulkImport };
}
