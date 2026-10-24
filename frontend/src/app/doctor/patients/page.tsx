"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Users, Search, Calendar, FileText, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";

interface PatientBasic {
  patientId: number;
  lastAppointmentDate?: string;
  lastConsultationId?: number;
}

interface Appointment {
  id: number;
  patientId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
}

export default function DoctorPatientsPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatients();
  }, [doctorId]);

  const fetchPatients = async () => {
    setLoading(true);
    setError("");
    try {
      // Derive patients from this doctor's appointments — only authorized relationships
      if (!doctorId) return;
      const data = await apiFetch<Appointment[]>(`/api/appointments/doctor/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError("Unable to load patient data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Derive unique patients from appointments (only authorized by appointment relationship)
  const uniquePatients = Array.from(
    new Map(
      appointments.map(a => [a.patientId, a])
    ).values()
  ).filter(a =>
    searchQuery === "" || String(a.patientId).includes(searchQuery)
  );

  // Group appointments per patient
  const apptsByPatient = appointments.reduce((acc, a) => {
    if (!acc[a.patientId]) acc[a.patientId] = [];
    acc[a.patientId].push(a);
    return acc;
  }, {} as Record<number, Appointment[]>);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            My Patients
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Patients you are authorized to access through confirmed appointments.
          </p>
        </div>
        <button
          onClick={fetchPatients}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Authorization Note */}
      <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold p-4 rounded-2xl">
        🔒 <strong>Data access policy:</strong> You can only view patients with whom you have an established appointment or consultation relationship. Patient data not authorized by this relationship is not accessible.
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Patient ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Patient Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse h-32 bg-slate-100 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <p className="font-bold">{error}</p>
          <button onClick={fetchPatients} className="text-rose-700 font-bold underline text-xs">Retry</button>
        </div>
      ) : uniquePatients.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {uniquePatients.map((latestAppt) => {
            const patientAppts = apptsByPatient[latestAppt.patientId] || [];
            const confirmedCount = patientAppts.filter(a => a.status === "CONFIRMED" || a.status === "COMPLETED").length;
            const lastApptDate = patientAppts
              .map(a => new Date(`${a.appointmentDate}T${a.startTime}`))
              .sort((a, b) => b.getTime() - a.getTime())[0];

            return (
              <div
                key={latestAppt.patientId}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-800 font-bold text-lg flex items-center justify-center border border-indigo-200">
                    P
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base">Patient #{latestAppt.patientId}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Last appointment: {lastApptDate ? lastApptDate.toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2">
                  <div>Total Appointments: <strong className="text-slate-800">{patientAppts.length}</strong></div>
                  <div>Active: <strong className="text-slate-800">{confirmedCount}</strong></div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/doctor/consultations`}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition text-center"
                  >
                    Consultations
                  </Link>
                  <Link
                    href={`/doctor/prescriptions`}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 rounded-xl transition text-center border border-indigo-200"
                  >
                    Prescriptions
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No patients found.</p>
          <p className="text-xs text-slate-500">
            Patients will appear here when they book appointments with you.
          </p>
        </div>
      )}

    </div>
  );
}
