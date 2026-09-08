'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { SystemHealthResponse } from '@/types';
import { Activity, Database, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';

export const SystemStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<string>('');

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealth(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll every 30 seconds for live status
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    const isHealthy = health?.status === 'ok';
    return (
      <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 bg-slate-100 border border-slate-200 rounded">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            isHealthy ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
          )}
        />
        <span className="text-gov-slate">
          {isHealthy ? 'System Secure' : 'Connecting to API...'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gov-border rounded p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-gov-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gov-navy" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gov-slate">
            System Operational Status
          </h4>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="text-xs text-gov-muted hover:text-gov-navy flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Refresh Status"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          <span>{lastChecked ? `Checked ${lastChecked}` : 'Checking...'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3">
        {/* Component 1: API */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-gov-slate">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gov-muted font-medium">
              API Service
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gov-dark mt-0.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  health?.components.api.status === 'operational'
                    ? 'bg-emerald-600'
                    : 'bg-rose-500'
                )}
              />
              {health?.components.api.status === 'operational'
                ? `Operational (${health.latencyMs}ms)`
                : 'Degraded / Offline'}
            </div>
          </div>
        </div>

        {/* Component 2: Database */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-gov-slate">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gov-muted font-medium">
              Database
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gov-dark mt-0.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  health?.components.database.status?.startsWith('connected')
                    ? 'bg-emerald-600'
                    : 'bg-amber-500'
                )}
              />
              {health?.components.database.status || 'Checking...'}
            </div>
          </div>
        </div>

        {/* Component 3: Authentication */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-gov-slate">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gov-muted font-medium">
              Auth Provider
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gov-dark mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Supabase Auth</span>
            </div>
          </div>
        </div>

        {/* Component 4: Security Layer */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-gov-slate">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gov-muted font-medium">
              Security Layer
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gov-dark mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Helmet & CORS Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
