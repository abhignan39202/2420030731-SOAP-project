'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  EmergencyRequest,
  STATUS_LABELS,
  TIMELINE_STEPS,
} from '@/types/ambulance';
import { ArrowLeft, AlertTriangle, RefreshCw, CheckCircle2, Circle, MapPin, Hospital, Clock } from 'lucide-react';

function statusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'CANCELLED': return 'bg-slate-600/30 text-slate-400 border-slate-600/40';
    default:          return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  }
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusTimeline({ current }: { current: string }) {
  const currentIdx = current === 'CANCELLED'
    ? TIMELINE_STEPS.indexOf('ASSIGNED') // show up to assigned for cancelled
    : TIMELINE_STEPS.indexOf(current as any);

  return (
    <div>
      {TIMELINE_STEPS.map((step, idx) => {
        const isPast    = current !== 'CANCELLED' && idx <= currentIdx;
        const isCurrent = idx === currentIdx && current !== 'CANCELLED';
        const isFuture  = !isPast && !isCurrent;
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                isPast    ? 'bg-emerald-600 border-emerald-500' :
                isCurrent ? 'bg-emerald-600 border-emerald-500' :
                            'bg-slate-800 border-slate-700'
              }`}>
                {(isPast || isCurrent) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                {isFuture              && <Circle className="w-3 h-3 text-slate-600" />}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-0.5 ${(isPast || isCurrent) ? 'bg-emerald-600' : 'bg-slate-700'}`} />
              )}
            </div>
            <div className={`pt-0.5 pb-4 text-sm font-semibold ${
              isPast || isCurrent ? 'text-emerald-400' : 'text-slate-600'
            }`}>
              {STATUS_LABELS[step] || step}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function HistoryDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const { user } = useAuth();
  const [emergency, setEmergency] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch<EmergencyRequest>(`/api/emergency/${id}`, { userId: user.id })
      .then((data) => setEmergency(data))
      .catch((e) => setError(e.message || 'Unable to load emergency details.'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
      </div>
    );
  }

  if (error || !emergency) {
    return (
      <div className="space-y-4">
        <Link href="/ambulance/history" className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300">{error || 'Emergency not found.'}</p>
        </div>
      </div>
    );
  }

  const amb = emergency.assignedAmbulance;
  const op  = emergency.assignedOperator;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ambulance/history" className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300">
          <ArrowLeft className="w-4 h-4" /> History
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-400 text-sm">Emergency #{emergency.id}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-white">Emergency #{emergency.id}</h1>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusColor(emergency.status)}`}>
          {STATUS_LABELS[emergency.status] || emergency.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Details */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Emergency Details</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-500 text-xs">Pickup Location</div>
                  <div className="text-white font-semibold">{emergency.pickupAddress}</div>
                  {emergency.pickupLatitude != null && (
                    <div className="text-slate-500 text-xs mt-1">
              Coordinates · {emergency.pickupLatitude.toFixed(4)}, {emergency.pickupLongitude?.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hospital className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-500 text-xs">Hospital</div>
                  <div className="text-white font-semibold">{emergency.hospitalName || '—'}</div>
                  {emergency.hospitalAddress && (
                    <div className="text-slate-500 text-xs">{emergency.hospitalAddress}</div>
                  )}
                </div>
              </div>
              {emergency.emergencyDescription && (
                <div className="sm:col-span-2 border-t border-slate-800 pt-3">
                  <div className="text-slate-500 text-xs mb-1">Description</div>
                  <div className="text-slate-300">{emergency.emergencyDescription}</div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Timing</h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Created</div>
                <div className="text-white font-semibold">{formatTime(emergency.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Last Updated</div>
                <div className="text-white font-semibold">{formatTime(emergency.updatedAt)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Completed At</div>
                <div className="text-white font-semibold">{formatTime(emergency.completedAt)}</div>
              </div>
            </div>
          </div>

          {(amb || op) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Assignment</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {amb && (
                  <div>
                    <div className="text-slate-500 text-xs">Ambulance</div>
                    <div className="text-white font-bold">{amb.registrationNumber}</div>
                    <div className="text-slate-400 text-xs">{amb.vehicleType?.replace(/_/g, ' ')}</div>
                  </div>
                )}
                {op && (
                  <div>
                    <div className="text-slate-500 text-xs">Operator</div>
                    <div className="text-white font-bold">{op.name}</div>
                    <div className="text-slate-400 text-xs">{op.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">Emergency Timeline</h2>
            <StatusTimeline current={emergency.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
