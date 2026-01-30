import React from 'react';

export function StatsPanel({ sites }) {
  const stats = {
    total: sites.length,
    up: sites.filter(s => !s.is_paused && s.latestCheck?.status === 'up').length,
    down: sites.filter(s => !s.is_paused && s.latestCheck?.status === 'down').length,
    avgUptime: sites.length > 0 
      ? (sites.reduce((acc, s) => acc + (s.uptime24h || 100), 0) / sites.length).toFixed(1)
      : '100.0',
    avgResponse: sites.filter(s => s.avgResponseTime).length > 0
      ? Math.round(sites.reduce((acc, s) => acc + (s.avgResponseTime || 0), 0) / sites.filter(s => s.avgResponseTime).length)
      : 0
  };

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 mb-8" aria-label="Statistics overview">
      <StatCard label="Total Sites" value={stats.total} />
      <StatCard label="Online" value={stats.up} variant="success" />
      <StatCard label="Uptime (24h)" value={stats.avgUptime + '%'} variant="accent" />
      <StatCard label="Avg Response" value={stats.avgResponse + 'ms'} />
    </section>
  );
}

function StatCard({ label, value, variant }) {
  const variants = {
    success: 'border-emerald-500/20 bg-emerald-500/5',
    accent: 'border-violet-500/20 bg-violet-500/5',
    default: 'border-white/5 bg-white/[0.02]'
  };

  const valueColors = {
    success: 'text-emerald-400',
    accent: 'text-violet-400',
    default: 'text-white'
  };

  return (
    <article className={'rounded-2xl p-5 border ' + (variants[variant] || variants.default)}>
      <p className="text-sm text-white/50 mb-2">{label}</p>
      <p className={'text-3xl font-semibold tracking-tight ' + (valueColors[variant] || valueColors.default)}>
        {value}
      </p>
    </article>
  );
}
