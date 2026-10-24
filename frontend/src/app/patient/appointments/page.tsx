"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Calendar, Clock, UserCheck, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";

interface Appointment {
  id: number;
  doctorId: number;
  doctorName?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
  consultationId?: number;
  symptoms?: string;
}

export default function PatientAppointmentsPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST" | "CANCELLED">("UPCOMING");

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      if (!patientId) return;
      const [data, consultations] = await Promise.all([
        apiFetch<Appointment[]>(`/api/appointments/patient/${patientId}`, { userId: patientId }),
        apiFetch<Array<{ id: number; appointmentId: number; symptoms?: string }>>(`/api/consultations/patient/${patientId}`, { userId: patientId }),
      ]);
      const consultationByAppointment = new Map((Array.isArray(consultations) ? consultations : []).map((c) => [c.appointmentId, c]));
      setAppointments((Array.isArray(data) ? data : []).map((appointment) => {
        const consultation = consultationByAppointment.get(appointment.id);
        return { ...appointment, consultationId: consultation?.id, symptoms: consultation?.symptoms };
      }));
    } catch (e) {
      console.error("Failed to fetch appointments", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await apiFetch(`/api/appointments/${id}/cancel`, {
        method: "PATCH",
        userId: patientId
      });
      fetchAppointments();
    } catch (e: any) {
      alert(e.message || "Failed to cancel appointment");
    }
  };

  const upcomingAppts = appointments.filter(a => a.status === "CONFIRMED" || a.status === "REQUESTED");
  const pastAppts = appointments.filter(a => a.status === "COMPLETED");
  const cancelledAppts = appointments.filter(a => a.status === "CANCELLED");

  const displayedAppts = activeTab === "UPCOMING" ? upcomingAppts : activeTab === "PAST" ? pastAppts : cancelledAppts;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky-600" />
            My Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your upcoming virtual doctor consultations and view visit history.
          </p>
        </div>
        <Link
          href="/patient/doctors"
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2"
        >
          <UserCheck className="w-4 h-4" /> Book New Appointment
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("UPCOMING")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition ${
            activeTab === "UPCOMING"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Upcoming ({upcomingAppts.length})
        </button>
        <button
          onClick={() => setActiveTab("PAST")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition ${
            activeTab === "PAST"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Completed ({pastAppts.length})
        </button>
        <button
          onClick={() => setActiveTab("CANCELLED")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition ${
            activeTab === "CANCELLED"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Cancelled ({cancelledAppts.length})
        </button>
      </div>

      {/* Appointment Cards */}
      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse h-24 bg-slate-100 rounded-2xl" />
          <div className="animate-pulse h-24 bg-slate-100 rounded-2xl" />
        </div>
      ) : displayedAppts.length > 0 ? (
        <div className="space-y-3">
          {displayedAppts.map((appt) => (
            <div
              key={appt.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-sky-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    appt.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    appt.status === "CANCELLED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-sky-50 text-sky-700 border-sky-200"
                  }`}>
                    {appt.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: #{appt.id}</span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Doctor Consultation #{appt.doctorId}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(`${appt.appointmentDate}T${appt.startTime}`).toLocaleString()}
                  </div>
                  {appt.reason && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 mt-2">
                      Reason: {appt.reason}
                    </div>
                  )}
                  {appt.symptoms && (
                    <div className="text-xs text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 mt-2">
                      Symptoms: {appt.symptoms}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeTab === "UPCOMING" && (
                  <button
                    onClick={() => handleCancelAppointment(appt.id)}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl border border-slate-200 transition"
                  >
                    Cancel Appointment
                  </button>
                )}

                {activeTab !== "CANCELLED" && appt.consultationId && (
                  <Link
                    href={`/patient/consultations/${appt.consultationId}`}
                    className="w-full sm:w-auto bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1"
                  >
                    View Consultation <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {appt.status === "CONFIRMED" && !appt.consultationId && (
                  <Link
                    href={`/patient/consultations?appointmentId=${appt.id}`}
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center justify-center gap-1"
                  >
                    Submit Symptoms <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No {activeTab.toLowerCase()} appointments found.</p>
          {activeTab === "UPCOMING" && (
            <Link
              href="/patient/doctors"
              className="inline-block bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
            >
              Book Your First Appointment
            </Link>
          )}
        </div>
      )}

    </div>
  );
}
