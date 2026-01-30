import React, { lazy, Suspense } from 'react';

// Lazy load recharts for better initial load performance
const AreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const Area = lazy(() => import('recharts').then(m => ({ default: m.Area })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));

function ChartFallback() {
  return (
    <div className="h-48 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
      <div className="loader"></div>
    </div>
  );
}

export function ResponseChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/5 h-48 flex items-center justify-center">
        <p className="text-white/40">No data available</p>
      </div>
    );
  }

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const tooltipStyle = {
    contentStyle: { 
      background: 'rgba(9,9,11,0.95)', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: '12px',
      padding: '12px'
    },
    labelStyle: { color: 'rgba(255,255,255,0.6)' },
    itemStyle: { color: '#8b5cf6' }
  };

  return (
    <Suspense fallback={<ChartFallback />}>
      <div className="space-y-6">
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
          <h3 className="text-sm font-medium text-white/60 mb-4">Response Time (24h)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickFormatter={(v) => v + 'ms'} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(value) => [Math.round(value) + 'ms', 'Response']} />
                <Area type="monotone" dataKey="avgResponseTime" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorResp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5">
          <h3 className="text-sm font-medium text-white/60 mb-4">Uptime (24h)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tickFormatter={formatTime} stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} domain={[0, 100]} tickFormatter={(v) => v + '%'} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} itemStyle={{ color: '#10b981' }} formatter={(value) => [value + '%', 'Uptime']} />
                <Area type="monotone" dataKey="uptime" stroke="#10b981" strokeWidth={2} fill="url(#colorUp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
