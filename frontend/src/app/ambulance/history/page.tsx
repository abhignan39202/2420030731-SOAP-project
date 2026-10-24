'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EmergencyRequest, STATUS_LABELS } from '@/types/ambulance';
import { History, AlertTriangle, RefreshCw, ChevronRight, Filter } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'CANCELLED': return 'bg-slate-600/30 text-slate-400 border-slate-600/40';
    default:          return 'bg-slate-700/30 text-slate-400 border-slate-600/40';
  }
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_FILTERS = ['ALL', 'COMPLETED', 'CANCELLED'] as const;
type FilterType = typeof STATUS_FILTERS[number];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmergencyHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory]     = useState<EmergencyRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<FilterType>('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) return;
      const data = await apiFetch<EmergencyRequest[]>('/api/ambulance/operator/history', { userId: user.id });
      setHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Unable to load emergency history.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = filter === 'ALL'
    ? history
    : history.filter((h) => h.status === filter);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-red-400" />
            Emergency History
          </h1>
          <p className="text-slate-400 text-sm mt-1">Completed and cancelled dispatch records for your unit.</p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Refresh history"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition ${
              filter === f
                ? 'bg-red-700 text-white border-red-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-slate-600 text-xs ml-auto">{filtered.length} records</span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 font-medium">Emergency history could not be loaded.</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button onClick={fetchHistory} className="text-xs text-red-400 hover:text-red-300 underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-7 h-7 text-red-400 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-semibold">No dispatch records found.</p>
          <p className="text-slate-600 text-sm">
            {filter === 'ALL'
              ? 'Completed dispatches will appear here.'
              : `No ${filter.toLowerCase()} emergencies to show.`}
          </p>
        </div>
      )}

      {/* History List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-slate-800/60 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <div className="col-span-1">ID</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Pickup</div>
            <div className="col-span-2">Hospital</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Completed</div>
            <div className="col-span-1"></div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800">
            {filtered.map((h) => (
              <div key={h.id} className="px-5 py-4 grid sm:grid-cols-12 gap-2 items-center text-sm hover:bg-slate-800/30 transition">
                <div className="sm:col-span-1 font-mono font-bold text-white">#{h.id}</div>
                <div className="sm:col-span-2 text-slate-400 text-xs">{formatTime(h.createdAt)}</div>
                <div className="sm:col-span-3 text-white font-medium truncate">{h.pickupAddress}</div>
                <div className="sm:col-span-2 text-slate-300 truncate">{h.hospitalName || '—'}</div>
                <div className="sm:col-span-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor(h.status)}`}>
                    {STATUS_LABELS[h.status] || h.status}
                  </span>
                </div>
                <div className="sm:col-span-1 text-slate-500 text-xs">{formatTime(h.completedAt)}</div>
                <div className="sm:col-span-1 text-right">
                  <Link
                    href={`/ambulance/history/${h.id}`}
                    className="inline-flex items-center text-xs text-red-400 hover:text-red-300 gap-0.5"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
