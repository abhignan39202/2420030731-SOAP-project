'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  EmergencyRequest,
  EmergencyStatus,
  nextOperatorStatus,
  nextStatusLabel,
  isActiveStatus,
  STATUS_LABELS,
  TIMELINE_STEPS,
} from '@/types/ambulance';
import {
  MapPin,
  Hospital,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Circle,
  Loader2,
  Navigation,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'ASSIGNED':       return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'EN_ROUTE':       return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'ARRIVED':        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    case 'PATIENT_PICKED': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'HOSPITAL_REACHED': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    case 'COMPLETED':      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'CANCELLED':      return 'bg-slate-600/30 text-slate-400 border-slate-600/40';
    default:               return 'bg-slate-700/30 text-slate-400 border-slate-600/40';
  }
}

function nextActionColor(next: string) {
  switch (next) {
    case 'EN_ROUTE':       return 'bg-blue-700 hover:bg-blue-600';
    case 'ARRIVED':        return 'bg-amber-700 hover:bg-amber-600';
    case 'PATIENT_PICKED': return 'bg-purple-700 hover:bg-purple-600';
    case 'HOSPITAL_REACHED': return 'bg-indigo-700 hover:bg-indigo-600';
    case 'COMPLETED':      return 'bg-emerald-700 hover:bg-emerald-600';
    default:               return 'bg-red-700 hover:bg-red-600';
  }
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Timeline Component ────────────────────────────────────────────────────────

function StatusTimeline({ current }: { current: string }) {
  const currentIdx = TIMELINE_STEPS.indexOf(current as EmergencyStatus);
  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, idx) => {
        const isPast    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture  = idx > currentIdx;
        return (
          <div key={step} className="flex items-start gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                isPast    ? 'bg-emerald-600 border-emerald-500' :
                isCurrent ? 'bg-red-600 border-red-400 ring-2 ring-red-500/30' :
                            'bg-slate-800 border-slate-700'
              }`}>
                {isPast    && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                {isFuture  && <Circle className="w-3 h-3 text-slate-600" />}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-6 mt-0.5 ${isPast ? 'bg-emerald-600' : 'bg-slate-700'}`} />
              )}
            </div>
            {/* Label */}
            <div className={`pt-0.5 pb-4 text-sm font-semibold ${
              isPast    ? 'text-emerald-400' :
              isCurrent ? 'text-white' :
                          'text-slate-600'
            }`}>
              {STATUS_LABELS[step] || step}
              {isCurrent && (
                <span className="ml-2 text-xs font-normal text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActiveEmergencyPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [emergency, setEmergency] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Confirmation modal
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Location update
  const [locUpdating, setLocUpdating] = useState(false);
  const [locMsg, setLocMsg]     = useState<string | null>(null);
  const [locError, setLocError] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const locationWatchId = useRef<number | null>(null);
  const lastLocationSentAt = useRef(0);
  const locationUpdateInFlight = useRef(false);

  const clearLocationWatch = useCallback(() => {
    if (locationWatchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }
    locationWatchId.current = null;
  }, []);

  const stopLocationSharing = useCallback(() => {
    clearLocationWatch();
    setLocationSharing(false);
  }, [clearLocationWatch]);

  const fetchActive = useCallback(async () => {
    try {
      setError(null);
      if (!userId) return;
      const data = await apiFetch<EmergencyRequest>('/api/ambulance/operator/active', { userId });
      setEmergency(data && data.id ? data : null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to load active emergency.';
      if (message.includes('204') || message.includes('No Content')) {
        setEmergency(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void fetchActive(), 0);
    const interval = window.setInterval(() => void fetchActive(), 12000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchActive]);

  const emergencyStatus = emergency?.status;
  const activeAmbulanceId = emergency?.assignedAmbulance?.id;

  useEffect(() => {
    if ((!emergencyStatus || !isActiveStatus(emergencyStatus) || !activeAmbulanceId)
      && locationWatchId.current !== null) {
      stopLocationSharing();
    }
  }, [emergencyStatus, activeAmbulanceId, stopLocationSharing]);

  useEffect(() => () => clearLocationWatch(), [clearLocationWatch]);

  // ── Status Transition ────────────────────────────────────────────────────────

  const handleTransition = async () => {
    if (!emergency || !confirmTarget) return;
    setTransitioning(true);
    try {
      const updated = await apiFetch<EmergencyRequest>(
        `/api/emergency/${emergency.id}/advance`,
        { method: 'PATCH' }
      );
      setEmergency(updated);
      setConfirmTarget(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update status.';
      if (msg.includes('409') || msg.includes('Conflict')) {
        alert('This emergency is no longer available — another action may have already been taken. Refreshing…');
        fetchActive();
      } else if (msg.includes('403')) {
        alert('You are not authorised to modify this emergency.');
      } else {
        alert(`Unable to update status: ${msg}`);
      }
      setConfirmTarget(null);
    } finally {
      setTransitioning(false);
    }
  };

  // ── Location Update ──────────────────────────────────────────────────────────

  const startLocationSharing = () => {
    if (!emergency?.assignedAmbulance || locationWatchId.current !== null) return;
    if (!navigator.geolocation) {
      setLocError(true);
      setLocMsg('This device does not support GPS location sharing.');
      return;
    }

    setLocError(false);
    setLocMsg('Waiting for a GPS location…');
    setLocationSharing(true);
    lastLocationSentAt.current = 0;
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (locationUpdateInFlight.current || now - lastLocationSentAt.current < 5000) return;

        lastLocationSentAt.current = now;
        locationUpdateInFlight.current = true;
        setLocUpdating(true);
        const timestamp = new Date(position.timestamp).toISOString();
        void apiFetch(
          `/api/ambulances/${emergency.assignedAmbulance!.id}/location`,
          {
            method: 'PATCH',
            userId: user?.id,
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp,
            }),
          }
        ).then(async () => {
          setLocError(false);
          setLocMsg(`GPS location sent at ${new Date(timestamp).toLocaleTimeString('en-IN')}.`);
          await fetchActive();
        }).catch((e: unknown) => {
          setLocError(true);
          setLocMsg(`Location update failed: ${e instanceof Error ? e.message : 'Unable to send GPS location.'}`);
        }).finally(() => {
          locationUpdateInFlight.current = false;
          setLocUpdating(false);
        });
      },
      (error) => {
        clearLocationWatch();
        setLocationSharing(false);
        setLocError(true);
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow access and start sharing again.'
          : error.code === error.TIMEOUT
            ? 'The GPS location request timed out. Start sharing to retry.'
            : 'The device could not determine its GPS location.';
        setLocMsg(message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  };

  const handleLocationSharing = () => {
    if (locationSharing) {
      stopLocationSharing();
      setLocError(false);
      setLocMsg('Location sharing stopped.');
      return;
    }
    setLocMsg(null);
    startLocationSharing();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading active emergency…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/60 border border-red-800 rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-red-300 font-medium">Emergency assignment could not be loaded.</p>
          <p className="text-red-400/70 text-sm mt-1">{error}</p>
        </div>
        <button onClick={fetchActive} className="text-xs text-red-400 hover:text-red-300 underline">
          Retry
        </button>
      </div>
    );
  }

  if (!emergency) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Emergency Assignment</h2>
        <p className="text-slate-400 text-sm">
          Your unit is standing by. You will see active assignments here when one is dispatched to you.
        </p>
      </div>
    );
  }

  const nextStatus = nextOperatorStatus(emergency.status);
  const amb = emergency.assignedAmbulance;
  const op  = emergency.assignedOperator;

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
            Emergency #{emergency.id}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-white">Active Emergency</h1>
        </div>
        <div className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${statusColor(emergency.status)}`}>
          {STATUS_LABELS[emergency.status] || emergency.status}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* Left: details (3 cols) */}
        <div className="lg:col-span-3 space-y-5">

          {/* Emergency Info */}
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
                      Coordinates · {emergency.pickupLatitude?.toFixed(4)}, {emergency.pickupLongitude?.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hospital className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-slate-500 text-xs">Destination Hospital</div>
                  <div className="text-white font-semibold">{emergency.hospitalName || 'District Hospital'}</div>
                  {emergency.hospitalAddress && (
                    <div className="text-slate-500 text-xs mt-0.5">{emergency.hospitalAddress}</div>
                  )}
                </div>
              </div>
              {emergency.emergencyDescription && (
                <div className="sm:col-span-2 border-t border-slate-800 pt-3">
                  <div className="text-slate-500 text-xs mb-1">Emergency Description</div>
                  <div className="text-slate-300">{emergency.emergencyDescription}</div>
                </div>
              )}
            </div>
          </div>

          {/* Times & ETA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Timing</h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500 text-xs">Assignment Time</div>
                <div className="text-white font-semibold mt-0.5">{formatTime(emergency.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs">Last Update</div>
                <div className="text-white font-semibold mt-0.5">{formatTime(emergency.updatedAt)}</div>
              </div>
              {emergency.estimatedArrivalMinutes != null && (
                <div>
                <div className="text-slate-500 text-xs">Estimated arrival</div>
                  <div className="text-amber-300 font-bold mt-0.5">{emergency.estimatedArrivalMinutes} min</div>
                </div>
              )}
            </div>
          </div>

          {/* Ambulance & Operator */}
          {(amb || op) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Assignment</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {amb && (
                  <div>
                    <div className="text-slate-500 text-xs">Ambulance</div>
                    <div className="text-white font-bold">{amb.registrationNumber}</div>
                    <div className="text-slate-400 text-xs">{amb.vehicleType?.replace(/_/g, ' ')}</div>
                    <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor(amb.status)}`}>
                      {amb.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {op && (
                  <div>
                    <div className="text-slate-500 text-xs">Assigned Operator</div>
                    <div className="text-white font-bold">{op.name}</div>
                    <div className="text-slate-400 text-xs">{op.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

      {/* Operator GPS location sharing */}
          {amb && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Live GPS location
                </h2>
              </div>
              <p className="text-slate-500 text-xs">
                Share this device&apos;s actual GPS position with the patient while this emergency is active. You can stop sharing at any time.
              </p>
              {amb.latitude != null && amb.longitude != null && (
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs text-slate-400">
                  Last reported · <span className="font-mono text-slate-200">{amb.latitude.toFixed(5)}, {amb.longitude.toFixed(5)}</span>
                  {amb.lastLocationUpdate && <span className="block mt-1">Updated {formatTime(amb.lastLocationUpdate)}</span>}
                </div>
              )}
              {locMsg && (
                <p role="status" className={`text-xs ${locError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {locMsg}
                </p>
              )}
              <button
                onClick={handleLocationSharing}
                disabled={locUpdating && !locationSharing}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                {locUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {locationSharing ? 'Stop sharing location' : 'Start sharing GPS location'}
              </button>
            </div>
          )}
        </div>

        {/* Right: timeline + action (2 cols) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5">Emergency Timeline</h2>
            <StatusTimeline current={emergency.status} />
          </div>

          {/* Next Action */}
          {nextStatus && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Next Action</h2>
              <p className="text-slate-500 text-xs">
                Advance this emergency to the next stage. A confirmation is required before submitting.
              </p>
              <button
                onClick={() => setConfirmTarget(nextStatus)}
                disabled={transitioning}
                className={`w-full py-3.5 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 ${nextActionColor(nextStatus)}`}
              >
                {transitioning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                  : nextStatusLabel(nextStatus)
                }
              </button>
            </div>
          )}

          {/* Completed state */}
          {(emergency.status === 'COMPLETED' || emergency.status === 'CANCELLED') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-white font-bold">
                {emergency.status === 'COMPLETED' ? 'Emergency Completed' : 'Emergency Cancelled'}
              </p>
              {emergency.completedAt && (
                <p className="text-slate-500 text-xs">{formatTime(emergency.completedAt)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-sm w-full shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Status Change</h3>
              <p className="text-slate-400 text-sm">
                Mark this emergency as{' '}
                <span className="text-white font-bold">
                  {STATUS_LABELS[confirmTarget as keyof typeof STATUS_LABELS] || confirmTarget}
                </span>
                ?
              </p>
              <p className="text-slate-500 text-xs">This action cannot be undone.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                disabled={transitioning}
                className="py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTransition}
                disabled={transitioning}
                className={`py-2.5 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 ${nextActionColor(confirmTarget)}`}
              >
                {transitioning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                  : 'Confirm'
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
