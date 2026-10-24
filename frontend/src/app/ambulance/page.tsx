'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import {
  EmergencyRequest,
  AmbulanceInfo,
  nextOperatorStatus,
  nextStatusLabel,
  isActiveStatus,
  STATUS_LABELS,
} from '@/types/ambulance';
import {
  Siren,
  MapPin,
  Hospital,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'ASSIGNED':     return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'EN_ROUTE':     return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'ARRIVED':      return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    case 'PATIENT_PICKED': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'HOSPITAL_REACHED': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    case 'COMPLETED':    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'CANCELLED':    return 'bg-slate-600/30 text-slate-400 border-slate-600/40';
    default:             return 'bg-slate-700/30 text-slate-400 border-slate-600/40';
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmbulanceDashboardPage() {
  const { user } = useAuth();

  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(null);
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [ambulance, setAmbulance] = useState<AmbulanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Active emergency for this operator
      if (!user?.id) return;
      const activeRes = await apiFetch<EmergencyRequest>('/api/ambulance/operator/active', { userId: user.id });
      setActiveEmergency(activeRes && (activeRes as any).id ? activeRes : null);

      // History (last 3 for dashboard preview)
      const hist = await apiFetch<EmergencyRequest[]>('/api/ambulance/operator/history', { userId: user.id });
      setHistory(Array.isArray(hist) ? hist.slice(0, 3) : []);

      // Ambulance assigned to this operator (from active emergency if present)
      if (activeRes && (activeRes as any).assignedAmbulance) {
        setAmbulance((activeRes as any).assignedAmbulance as AmbulanceInfo);
      }
    } catch (e: any) {
      // 204 No Content from /active means no active emergency — not an error
      if (e.message?.includes('204') || e.message?.includes('No Content')) {
        setActiveEmergency(null);
      } else {
        setError(e.message || 'Unable to load operator data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Poll every 12 s only while an emergency is active
    const interval = setInterval(() => {
      if (activeEmergency && isActiveStatus(activeEmergency.status)) {
        fetchData();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchData, activeEmergency?.status]);

  const nextStatus = activeEmergency ? nextOperatorStatus(activeEmergency.status) : null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading operator data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white" id="ambulance-dashboard-heading">
          {greeting()},{' '}
          <span className="text-red-400">{user?.username || 'Operator'}</span>
        </h1>
        <p className="text-slate-400 text-sm">
          {ambulance
            ? `Assigned Ambulance: ${ambulance.registrationNumber} · ${ambulance.vehicleType?.replace(/_/g, ' ')}`
            : 'Manage emergency assignments and track dispatch status.'}
        </p>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Status Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Active Assignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Siren className="w-4 h-4" /> Active Assignment
          </div>
          {activeEmergency ? (
            <>
              <div className="text-2xl font-extrabold text-white">#{activeEmergency.id}</div>
              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor(activeEmergency.status)}`}>
                {STATUS_LABELS[activeEmergency.status] || activeEmergency.status}
              </span>
            </>
          ) : (
            <>
              <div className="text-xl font-extrabold text-slate-400">None</div>
              <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                Standby
              </span>
            </>
          )}
        </div>

        {/* Ambulance Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Truck className="w-4 h-4" /> Ambulance Status
          </div>
          {ambulance ? (
            <>
              <div className="text-lg font-extrabold text-white">{ambulance.registrationNumber}</div>
              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor(ambulance.status)}`}>
                {ambulance.status?.replace(/_/g, ' ')}
              </span>
            </>
          ) : (
            <>
              <div className="text-xl font-extrabold text-slate-400">—</div>
              <span className="text-xs text-slate-500">No ambulance data</span>
            </>
          )}
        </div>

        {/* Last Update */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-4 h-4" /> Last Update
          </div>
          {activeEmergency?.updatedAt ? (
            <div className="text-sm font-semibold text-slate-300">
              {formatTime(activeEmergency.updatedAt)}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">—</div>
          )}
        </div>

      </div>

      {/* ── Active Assignment Card ── */}
      {activeEmergency ? (
        <div className="bg-slate-900 border-2 border-red-700/50 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                Active Emergency #{activeEmergency.id}
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">Emergency Response</h2>
            </div>
            <Link
              href="/ambulance/emergency"
              className="shrink-0 text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              Full Details <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 bg-slate-950 rounded-xl p-4 border border-slate-800 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-slate-500 text-xs">Pickup Location</div>
                <div className="text-white font-semibold">{activeEmergency.pickupAddress}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hospital className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-slate-500 text-xs">Destination Hospital</div>
                <div className="text-white font-semibold">{activeEmergency.hospitalName || 'District Hospital'}</div>
              </div>
            </div>
            {activeEmergency.emergencyDescription && (
              <div className="sm:col-span-2 border-t border-slate-800 pt-3">
                <div className="text-slate-500 text-xs mb-1">Emergency Description</div>
                <div className="text-slate-300">{activeEmergency.emergencyDescription}</div>
              </div>
            )}
            {activeEmergency.estimatedArrivalMinutes != null && (
              <div className="sm:col-span-2 border-t border-slate-800 pt-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-slate-500 text-xs">Estimated arrival:</span>
                <span className="text-amber-300 font-bold text-sm">
                  {activeEmergency.estimatedArrivalMinutes} min
                </span>
              </div>
            )}
          </div>

          {/* Next Action Button */}
          {nextStatus && (
            <Link
              href="/ambulance/emergency"
              className="block w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-center text-sm transition shadow-lg"
            >
              {nextStatusLabel(nextStatus)}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Ambulance Unit Standby</h2>
          <p className="text-slate-400 text-sm">
            No active emergency assignment. Your unit is ready for dispatch.
          </p>
        </div>
      )}

      {/* ── Recent History Preview ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Recent Dispatch History</h2>
          <Link href="/ambulance/history" className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No completed dispatches yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    Dispatch #{h.id} · {h.pickupAddress}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {formatTime(h.createdAt)} · {h.hospitalName || 'Hospital'}
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-bold ${statusColor(h.status)}`}>
                  {STATUS_LABELS[h.status] || h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
