"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Ambulance, ShieldAlert } from "lucide-react";
import { AutomatedEmergencyDetection } from "@/components/AutomatedEmergencyDetection";
import { isActiveStatus, type EmergencyRequest } from "@/types/ambulance";

const STATUS_TIMELINE = [
  "REQUESTED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "PATIENT_PICKED",
  "HOSPITAL_REACHED",
  "COMPLETED"
];

export default function PatientEmergencyPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(null);
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Form fields
  const [pickupAddress, setPickupAddress] = useState("");
  const [emergencyDescription, setEmergencyDescription] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");

  const fetchActiveEmergency = useCallback(async () => {
    try {
      if (!patientId) return;
      const activeData = await apiFetch<EmergencyRequest>("/api/emergency/my-active", { userId: patientId });
      if (activeData && activeData.id) {
        setActiveEmergency(activeData);
      } else {
        setActiveEmergency(null);
      }
    } catch (e) {
      console.error("Failed to fetch active emergency", e);
    }
  }, [patientId]);

  const fetchEmergencyHistory = useCallback(async () => {
    try {
      if (!patientId) return;
      const historyData = await apiFetch<EmergencyRequest[]>("/api/emergency/history", { userId: patientId });
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (e) {
      console.error("Failed to fetch emergency history", e);
    }
  }, [patientId]);

  const fetchEmergencyData = useCallback(async () => {
    await Promise.all([fetchActiveEmergency(), fetchEmergencyHistory()]);
  }, [fetchActiveEmergency, fetchEmergencyHistory]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => void fetchEmergencyData(), 0);
    return () => {
      window.clearTimeout(initialFetch);
    };
  }, [fetchEmergencyData]);

  useEffect(() => {
    const emergencyStatus = activeEmergency?.status;
    const emergencyId = activeEmergency?.id;
    const assignedAmbulanceId = activeEmergency?.assignedAmbulance?.id;
    if (!emergencyId || !emergencyStatus || !isActiveStatus(emergencyStatus)) return;
    // The existing REST polling pattern refreshes persisted ambulance GPS every five seconds.
    const intervalMs = assignedAmbulanceId ? 5000 : 10000;
    const interval = window.setInterval(() => void fetchActiveEmergency(), intervalMs);
    return () => window.clearInterval(interval);
  }, [activeEmergency?.id, activeEmergency?.status, activeEmergency?.assignedAmbulance?.id, fetchActiveEmergency]);

  const handleCreateEmergency = async () => {
    setRequesting(true);
    setRequestError(null);
    try {
      if (!patientId) throw new Error("You must be signed in to request an ambulance.");
      if (!pickupAddress.trim()) throw new Error("Enter a pickup address or nearby landmark.");
      if (!navigator.geolocation) throw new Error("This browser does not support location access.");

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (error) => {
          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            reject(new Error("Location permission was denied. Allow location access and try again."));
          } else if (error.code === GeolocationPositionError.TIMEOUT) {
            reject(new Error("Getting your location timed out. Please try again."));
          } else {
            reject(new Error("Your current location is unavailable. Please try again."));
          }
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });

      const data = await apiFetch<EmergencyRequest>("/api/emergency/request", {
        method: "POST",
        userId: patientId,
        body: JSON.stringify({
          pickupAddress: pickupAddress.trim(),
          pickupLatitude: position.coords.latitude,
          pickupLongitude: position.coords.longitude,
          emergencyDescription,
          hospitalName,
          hospitalAddress
        })
      });

      setActiveEmergency(data);
      setShowConfirmModal(false);
      fetchEmergencyData();
    } catch (e: unknown) {
      setRequestError(e instanceof Error ? e.message : "Failed to create the emergency request.");
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelEmergency = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this emergency request?")) return;
    try {
      await apiFetch(`/api/emergency/${id}/cancel`, {
        method: "PATCH",
        userId: patientId
      });
      fetchEmergencyData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Cannot cancel emergency");
    }
  };

  const getStatusStepIndex = (status: string) => {
    return STATUS_TIMELINE.indexOf(status);
  };

  const ambulance = activeEmergency?.assignedAmbulance;
  const hasAmbulanceLocation = ambulance?.latitude != null && ambulance.longitude != null;
  const ambulanceMapUrl = hasAmbulanceLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${ambulance.longitude! - 0.01}%2C${ambulance.latitude! - 0.01}%2C${ambulance.longitude! + 0.01}%2C${ambulance.latitude! + 0.01}&layer=mapnik&marker=${ambulance.latitude}%2C${ambulance.longitude}`
    : null;
  const ambulanceMapLink = hasAmbulanceLocation
    ? `https://www.openstreetmap.org/?mlat=${ambulance.latitude}&mlon=${ambulance.longitude}#map=16/${ambulance.latitude}/${ambulance.longitude}`
    : null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-rose-600 flex items-center gap-2">
            <Ambulance className="w-6 h-6" />
            Emergency Ambulance Service (108)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Academic emergency workflow simulation with persisted ambulance assignments and status updates.
          </p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-sm flex gap-3 items-start">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-amber-950 font-bold mb-0.5">
            Academic simulation — not a certified emergency dispatch system
          </strong>
            For life-threatening emergencies, contact local emergency services (108 / 112). Your current location is requested only when you confirm a request.
        </div>
      </div>

      {!activeEmergency && (
        <AutomatedEmergencyDetection
          patientId={patientId}
          onEmergencyCreated={(emergency) => {
            setActiveEmergency(emergency);
            void fetchEmergencyData();
          }}
        />
      )}

      {/* Active Emergency Tracker */}
      {activeEmergency ? (
        <div className="bg-slate-900 text-white border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Active Dispatch #{activeEmergency.id}
              </span>
              <h2 className="text-2xl font-extrabold mt-2 text-white">
                Ambulance Dispatch Status
              </h2>
            </div>
            {["REQUESTED", "ASSIGNED", "EN_ROUTE"].includes(activeEmergency.status) && (
              <button
                onClick={() => handleCancelEmergency(activeEmergency.id)}
                className="bg-slate-800 hover:bg-rose-900/50 text-rose-300 text-xs font-bold px-4 py-2 rounded-xl border border-rose-800/40 transition"
              >
                Cancel Request
              </button>
            )}
          </div>

          {/* Persisted ETA Card */}
          {activeEmergency.estimatedArrivalMinutes !== undefined && activeEmergency.estimatedArrivalMinutes !== null && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-400 font-semibold">Estimated Arrival Time</div>
                <div className="text-3xl font-extrabold text-emerald-300 mt-0.5">
                  ~{activeEmergency.estimatedArrivalMinutes} mins
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                Estimated arrival
              </span>
            </div>
          )}

          {/* Status Progress Bar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatch Progress Timeline</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {STATUS_TIMELINE.map((status, idx) => {
                const currentIdx = getStatusStepIndex(activeEmergency.status);
                const isDone = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={status} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? "bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse"
                          : isDone
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] leading-tight ${isCurrent ? "text-rose-400 font-bold" : isDone ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                      {status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Unit Details */}
          <div className="grid sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Assigned Ambulance</span>
              <strong className="text-white text-sm font-bold block mt-0.5">
                {activeEmergency.assignedAmbulance?.registrationNumber || "No unit assigned yet"}
              </strong>
              {activeEmergency.assignedAmbulance && (
                <div className="text-slate-400 mt-1">
                  Type: {activeEmergency.assignedAmbulance.vehicleType}
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-400 block font-semibold">Ambulance Operator</span>
              <strong className="text-white text-sm font-bold block mt-0.5">
                {activeEmergency.assignedOperator?.name || "No operator assigned yet"}
              </strong>
              {activeEmergency.assignedOperator?.phone && (
                <div className="text-emerald-400 font-semibold mt-1">
                  📞 {activeEmergency.assignedOperator.phone}
                </div>
              )}
            </div>

            <div className="sm:col-span-2 border-t border-slate-800 pt-3">
              <span className="text-slate-400 block font-semibold">Pickup Address</span>
              <span className="text-slate-200 font-bold">{activeEmergency.pickupAddress}</span>
            </div>
          </div>

          {/* Actual operator-reported GPS position, refreshed from persisted backend state. */}
          {activeEmergency.assignedAmbulance && (
            <section className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3" aria-live="polite" data-testid="ambulance-live-location">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Ambulance Location</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Updated from the ambulance operator&apos;s GPS.</p>
                </div>
                <span className="text-[10px] text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-2.5 py-1">
                  Refreshes every 5 seconds
                </span>
              </div>

              {hasAmbulanceLocation && ambulanceMapUrl ? (
                <>
                  <iframe
                    key={`${ambulance.latitude},${ambulance.longitude}`}
                    title="Map of the ambulance's latest reported GPS position"
                    src={ambulanceMapUrl}
                    className="w-full h-64 rounded-xl border border-slate-800 bg-slate-900"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-200" data-testid="ambulance-coordinates">
                      {ambulance.latitude!.toFixed(5)}, {ambulance.longitude!.toFixed(5)}
                    </span>
                    <span className="text-slate-400">
                      {ambulance.lastLocationUpdate
                        ? `Reported ${new Date(ambulance.lastLocationUpdate).toLocaleString("en-IN")}`
                        : "Location timestamp unavailable"}
                    </span>
                  </div>
                  {ambulanceMapLink && (
                    <a href={ambulanceMapLink} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-sky-300 hover:text-sky-200 underline">
                      Open map
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400" data-testid="ambulance-location-waiting">
                  Waiting for the operator&apos;s first GPS location update.
                </p>
              )}
            </section>
          )}
        </div>
      ) : (
        /* Request Dispatch Button & Modal trigger */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xs">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <Ambulance className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Emergency Assistance Request</h2>
            <p className="text-slate-500 text-sm">
              Create a simulated emergency request. If an available staffed ambulance exists, the backend assigns it and shares the persisted assignment with its operator.
            </p>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg shadow-rose-900/20 transition transform hover:scale-105 active:scale-95"
          >
            🚨 REQUEST AMBULANCE NOW
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-extrabold text-rose-600 flex items-center gap-2">
              <Ambulance className="w-6 h-6" /> Confirm Emergency Dispatch
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="emergency-pickup-address" className="block font-bold text-slate-700 mb-1">Pickup address or nearby landmark</label>
                <input
                  id="emergency-pickup-address"
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label htmlFor="emergency-description" className="block font-bold text-slate-700 mb-1">Emergency description / symptoms</label>
                <input
                  id="emergency-description"
                  type="text"
                  value={emergencyDescription}
                  onChange={(e) => setEmergencyDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="emergency-hospital" className="block font-bold text-slate-700 mb-1">Target Hospital</label>
                  <input
                    id="emergency-hospital"
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="emergency-hospital-address" className="block font-bold text-slate-700 mb-1">Hospital Address</label>
                  <input
                    id="emergency-hospital-address"
                    type="text"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold">
              Confirming requests your browser&apos;s current GPS position and saves it with this request. Only an available unit with an available operator can be assigned.
            </div>

            {requestError && <p role="alert" className="text-sm text-rose-700 font-semibold">{requestError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={requesting}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEmergency}
                disabled={requesting || !pickupAddress.trim()}
                className="px-6 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                {requesting ? "Getting location & saving..." : "Confirm & Request Ambulance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency History Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Emergency Response History</h2>
        {history.length === 0 ? (
          <p className="text-slate-500 text-xs">No past emergency requests recorded.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-900">Request #{h.id} &bull; {h.pickupAddress}</div>
                  <div className="text-slate-400 mt-0.5">
                    {new Date(h.createdAt).toLocaleString()} &bull; Hospital: {h.hospitalName || "N/A"}
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                  h.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  h.status === "CANCELLED" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                  "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
