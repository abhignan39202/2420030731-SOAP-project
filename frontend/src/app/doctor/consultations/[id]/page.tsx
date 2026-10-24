"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { ArrowLeft, CheckCircle2, AlertCircle, ClipboardList } from "lucide-react";
import VideoRoom from "@/components/consultation/VideoRoom";

interface Consultation {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  symptoms?: string;
  clinicalNotes?: string;
  diagnosis?: string;
  followUpInstructions?: string;
  followUpDate?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function DoctorConsultationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const id = params?.id;
  const doctorId = user?.id;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const fetchConsultation = useCallback(async () => {
    if (!id || !doctorId) {
      setLoading(false);
      setError("You must be signed in to open a consultation.");
      return;
    }
    setError("");
    setNotFound(false);
    setForbidden(false);
    try {
      const data = await apiFetch<Consultation>(`/api/consultations/${id}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setConsultation(data);
      setClinicalNotes(data.clinicalNotes || "");
      setDiagnosis(data.diagnosis || "");
      setFollowUpInstructions(data.followUpInstructions || "");
      setFollowUpDate(data.followUpDate || "");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : "Unable to load consultation. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id, doctorId]);

  useEffect(() => {
    void fetchConsultation();
  }, [fetchConsultation]);

  const handleStartConsultation = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await apiFetch<Consultation>(`/api/consultations/${id}/start`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setConsultation(res);
      setMsg("Consultation started. Status: IN PROGRESS.");
    } catch (err: any) {
      setError(err.message || "Failed to start consultation.");
    } finally {
      setStarting(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await apiFetch<Consultation>(`/api/consultations/${id}/update`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
        body: JSON.stringify({
          clinicalNotes,
          diagnosis,
          followUpInstructions,
          followUpDate: followUpDate || null,
        }),
      });
      setConsultation(res);
      setMsg("Draft notes saved successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!diagnosis || diagnosis.trim() === "") {
      setError("Diagnosis is required before completing the consultation.");
      return;
    }
    if (!confirm("Complete this consultation? This action cannot be undone.")) return;

    setCompleting(true);
    setMsg("");
    setError("");
    try {
      // Save latest notes first
      await apiFetch(`/api/consultations/${id}/update`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
        body: JSON.stringify({ clinicalNotes, diagnosis, followUpInstructions, followUpDate: followUpDate || null }),
      });
      // Then complete
      const res = await apiFetch<Consultation>(`/api/consultations/${id}/complete`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setConsultation(res);
      setMsg("Consultation COMPLETED. You may now create a prescription if required.");
    } catch (err: any) {
      setError(err.message || "Failed to complete consultation.");
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-bold border";
    switch (status) {
      case "SCHEDULED": return <span className={`${base} bg-sky-100 text-sky-800 border-sky-200`}>Scheduled</span>;
      case "IN_PROGRESS": return <span className={`${base} bg-amber-100 text-amber-800 border-amber-200 animate-pulse`}>IN PROGRESS</span>;
      case "COMPLETED": return <span className={`${base} bg-emerald-100 text-emerald-800 border-emerald-200`}>COMPLETED</span>;
      case "CANCELLED": return <span className={`${base} bg-rose-100 text-rose-800 border-rose-200`}>CANCELLED</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-16 bg-slate-100 rounded-3xl" />
        <div className="animate-pulse h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-400" />
        <h2 className="text-lg font-bold text-rose-900">Access Denied</h2>
        <p className="text-xs text-rose-700">You don&apos;t have permission to access this consultation.</p>
        <Link href="/doctor/consultations" className="inline-block bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl">
          ← Back to Consultations
        </Link>
      </div>
    );
  }

  if (notFound || !consultation) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
        <p className="text-slate-600 text-sm font-semibold">{notFound ? "Consultation not found." : error || "Unable to load consultation."}</p>
        {!notFound && <button onClick={() => { setLoading(true); void fetchConsultation(); }} className="rounded-xl bg-teal-700 px-4 py-2 text-white">Try again</button>}
        <Link href="/doctor/consultations" className="inline-block bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl">
          ← Back to Consultations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/doctor/consultations" className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Consultations
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-sm font-bold text-slate-900">Clinical Workspace #{consultation.id}</h1>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(consultation.status)}
          {consultation.status === "SCHEDULED" && (
            <button
              onClick={handleStartConsultation}
              disabled={starting}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs disabled:opacity-50"
            >
              {starting ? "Starting..." : "▶ Start Consultation"}
            </button>
          )}
          {consultation.status === "IN_PROGRESS" && (
            <button
              onClick={handleCompleteConsultation}
              disabled={completing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs disabled:opacity-50"
            >
              {completing ? "Completing..." : "✓ Complete Consultation"}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Left: Patient Info */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center border border-indigo-200">
                P
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Patient #{consultation.patientId}</h3>
                <p className="text-xs text-slate-500">Appointment #{consultation.appointmentId}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Consultation ID:</span>
                <span className="font-semibold text-slate-800">#{consultation.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold text-slate-800">{consultation.status}</span>
              </div>
              {consultation.startedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Started:</span>
                  <span className="font-semibold text-slate-800">{new Date(consultation.startedAt).toLocaleTimeString()}</span>
                </div>
              )}
              {consultation.completedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed:</span>
                  <span className="font-semibold text-slate-800">{new Date(consultation.completedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Patient Symptoms */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 space-y-2 text-xs">
            <strong className="block font-bold text-amber-900">Patient-Reported Symptoms</strong>
            <p className="text-slate-800 bg-white/70 p-3 rounded-xl border border-amber-200 leading-relaxed">
              {consultation.symptoms || "No symptoms reported by patient."}
            </p>
          </div>

          {/* Completed: Link to Create Prescription */}
          {consultation.status === "COMPLETED" && (
            <Link
              href={`/doctor/prescriptions/new?consultationId=${consultation.id}`}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-xs"
            >
              <ClipboardList className="w-4 h-4" />
              Create Prescription for this Consultation
            </Link>
          )}

          <div className="bg-slate-100 p-3 rounded-2xl text-xs text-slate-600">
            <strong className="block text-slate-800 font-bold mb-0.5">🔒 Data Privacy</strong>
            Clinical notes are protected and accessible only to authorized medical practitioners.
          </div>
        </div>

        {/* Right: Clinical Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">Doctor Clinical Record</h3>

            {msg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-2xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveNotes} className="space-y-5">

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Clinical Notes <span className="text-slate-400 font-normal">(Internal Observations)</span>
                </label>
                <textarea
                  rows={4}
                  disabled={consultation.status === "COMPLETED" || consultation.status === "CANCELLED"}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Vitals (BP, pulse, temp), examination findings, history of present illness..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Primary Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={consultation.status === "COMPLETED" || consultation.status === "CANCELLED"}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Viral Bronchitis / Hypertension Grade I"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Treatment & Follow-Up Instructions
                </label>
                <textarea
                  rows={3}
                  disabled={consultation.status === "COMPLETED" || consultation.status === "CANCELLED"}
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  placeholder="Dietary advice, rest recommendations, medication guidance, warning signs..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Follow-Up Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  disabled={consultation.status === "COMPLETED" || consultation.status === "CANCELLED"}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              {consultation.status !== "COMPLETED" && consultation.status !== "CANCELLED" && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {saving ? "Saving Draft..." : "Save Draft Notes"}
                  </button>

                  {consultation.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      onClick={handleCompleteConsultation}
                      disabled={completing}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50"
                    >
                      {completing ? "Completing..." : "✓ Finalize & Complete Consultation"}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <VideoRoom
        consultationId={consultation.id}
        consultationStatus={consultation.status}
        role="DOCTOR"
        token={token}
      />

    </div>
  );
}
