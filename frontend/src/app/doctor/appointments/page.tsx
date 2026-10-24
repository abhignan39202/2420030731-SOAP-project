"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Stethoscope } from "lucide-react";

interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reason?: string;
  consultationId?: number;
  symptoms?: string;
}

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"REQUESTED" | "CONFIRMED" | "COMPLETED" | "ALL">("ALL");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [doctorId]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      if (!doctorId) return;
      const [data, consultations] = await Promise.all([
        apiFetch<Appointment[]>(`/api/appointments/doctor/${doctorId}`, {
          userId: doctorId,
          userRoles: "DOCTOR",
        }),
        apiFetch<Array<{ id: number; appointmentId: number; symptoms?: string }>>(`/api/consultations/doctor/${doctorId}`, {
          userId: doctorId,
          userRoles: "DOCTOR",
        }),
      ]);
      const consultationByAppointment = new Map((Array.isArray(consultations) ? consultations : []).map((c) => [c.appointmentId, c]));
      setAppointments((Array.isArray(data) ? data : []).map((appointment) => {
        const consultation = consultationByAppointment.get(appointment.id);
        return { ...appointment, consultationId: consultation?.id, symptoms: consultation?.symptoms };
      }));
    } catch (e: any) {
      setError("Unable to load appointments. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: number) => {
    setActionLoading(id);
    try {
      await apiFetch(`/api/appointments/${id}/confirm`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setMsg(`Appointment #${id} confirmed.`);
      fetchAppointments();
    } catch (e: any) {
      alert(e.message || "Failed to confirm appointment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/api/appointments/${id}/cancel`, {
        method: "PATCH",
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setMsg(`Appointment #${id} cancelled.`);
      fetchAppointments();
    } catch (e: any) {
      alert(e.message || "Failed to cancel appointment");
    } finally {
      setActionLoading(null);
    }
  };

  const TABS: Array<"ALL" | "REQUESTED" | "CONFIRMED" | "COMPLETED"> = ["ALL", "REQUESTED", "CONFIRMED", "COMPLETED"];

  const filtered = activeTab === "ALL" ? appointments : appointments.filter(a => a.status === activeTab);

  const counts = {
    ALL: appointments.length,
    REQUESTED: appointments.filter(a => a.status === "REQUESTED").length,
    CONFIRMED: appointments.filter(a => a.status === "CONFIRMED").length,
    COMPLETED: appointments.filter(a => a.status === "COMPLETED").length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky-600" />
            Patient Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review appointment requests, confirm schedules, and start consultations.
          </p>
        </div>
        <button
          onClick={fetchAppointments}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold p-3 rounded-2xl flex justify-between items-center">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-slate-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === tab
                ? "bg-white shadow-xs text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Appointment List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-20 bg-slate-100 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <p className="font-bold">{error}</p>
          <button onClick={fetchAppointments} className="text-rose-700 font-bold underline text-xs">Retry</button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(appt => (
            <div
              key={appt.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    appt.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    appt.status === "REQUESTED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    appt.status === "COMPLETED" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                    "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {appt.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: #{appt.id}</span>
                </div>

                <div className="font-bold text-slate-900 text-base">Patient #{appt.patientId}</div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(`${appt.appointmentDate}T${appt.startTime}`).toLocaleString()}
                  </span>
                  {appt.reason && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                      {appt.reason}
                    </span>
                  )}
                  {appt.symptoms && (
                    <span className="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-900">
                      Symptoms: {appt.symptoms}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {appt.status === "REQUESTED" && (
                  <>
                    <button
                      onClick={() => handleConfirm(appt.id)}
                      disabled={actionLoading === appt.id}
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {actionLoading === appt.id ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={actionLoading === appt.id}
                      className="flex-1 sm:flex-initial bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
                    >
                      Decline
                    </button>
                  </>
                )}
                {appt.status === "CONFIRMED" && appt.consultationId && (
                  <Link
                    href={`/doctor/consultations/${appt.consultationId}`}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <Stethoscope className="w-3.5 h-3.5" /> Start Consultation
                  </Link>
                )}
                {appt.status === "CONFIRMED" && !appt.consultationId && (
                  <span className="text-xs text-slate-500 px-2">Waiting for patient symptoms</span>
                )}
                {appt.status === "CONFIRMED" && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    disabled={actionLoading === appt.id}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No appointments in this category.</p>
          <p className="text-xs text-slate-500">Appointments booked by patients will appear here.</p>
        </div>
      )}

    </div>
  );
}
