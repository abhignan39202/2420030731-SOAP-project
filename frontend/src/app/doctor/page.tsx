"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import {
  Calendar,
  Stethoscope,
  ClipboardList,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
}

interface Consultation {
  id: number;
  appointmentId: number;
  patientId: number;
  status: string;
  symptoms?: string;
  diagnosis?: string;
  createdAt: string;
}

interface DoctorProfile {
  userId: number;
  specialization?: string;
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [apptLoading, setApptLoading] = useState(true);
  const [consultLoading, setConsultLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [apptError, setApptError] = useState("");
  const [consultError, setConsultError] = useState("");

  useEffect(() => {
    fetchAppointments();
    fetchConsultations();
    fetchProfile();
  }, [doctorId]);

  const fetchAppointments = async () => {
    setApptLoading(true);
    setApptError("");
    try {
      if (!doctorId) return;
      const data = await apiFetch<Appointment[]>(`/api/appointments/doctor/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setApptError("Unable to load appointments.");
    } finally {
      setApptLoading(false);
    }
  };

  const fetchConsultations = async () => {
    setConsultLoading(true);
    setConsultError("");
    try {
      if (!doctorId) return;
      const data = await apiFetch<Consultation[]>(`/api/consultations/doctor/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setConsultations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setConsultError("Unable to load consultations.");
    } finally {
      setConsultLoading(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileMissing(false);
    setProfileError("");
    try {
      if (!doctorId) return;
      const data = await apiFetch<DoctorProfile>(`/api/doctors/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setProfile(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfile(null);
        setProfileMissing(true);
      } else {
        setProfileError("Unable to load your doctor profile.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Derived data
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(
    (a) => new Date(`${a.appointmentDate}T${a.startTime}`).toDateString() === today
  );
  const pendingAppts = appointments.filter((a) => a.status === "REQUESTED");
  const confirmedAppts = appointments.filter((a) => a.status === "CONFIRMED");
  const inProgressConsults = consultations.filter((c) => c.status === "IN_PROGRESS");
  const completedConsults = consultations.filter((c) => c.status === "COMPLETED");

  const KPIs = [
    {
      label: "Today's Appointments",
      value: apptLoading ? "—" : todayAppts.length,
      sub: "Scheduled for today",
      color: "bg-sky-50 border-sky-200 text-sky-800",
      icon: Calendar,
      href: "/doctor/appointments",
    },
    {
      label: "Pending Requests",
      value: apptLoading ? "—" : pendingAppts.length,
      sub: "Awaiting confirmation",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      icon: AlertCircle,
      href: "/doctor/appointments",
    },
    {
      label: "Active Consultations",
      value: consultLoading ? "—" : inProgressConsults.length,
      sub: "Sessions in progress",
      color: "bg-rose-50 border-rose-200 text-rose-800",
      icon: Stethoscope,
      href: "/doctor/consultations",
    },
    {
      label: "Completed Consultations",
      value: consultLoading ? "—" : completedConsults.length,
      sub: "All time",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: CheckCircle2,
      href: "/doctor/consultations",
    },
  ];

  const QUICK_ACTIONS = [
    { label: "View Appointments", href: "/doctor/appointments", icon: Calendar, color: "bg-sky-600 hover:bg-sky-700" },
    { label: "Start Consultation", href: "/doctor/consultations", icon: Stethoscope, color: "bg-teal-600 hover:bg-teal-700" },
    { label: "My Patients", href: "/doctor/patients", icon: Users, color: "bg-indigo-600 hover:bg-indigo-700" },
    { label: "Create Prescription", href: "/doctor/prescriptions/new", icon: ClipboardList, color: "bg-slate-700 hover:bg-slate-800" },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-slate-400 text-sm font-semibold mb-1">{greeting},</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Dr. {user?.username || "Doctor"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here&apos;s your clinical schedule for today.
            {profile?.specialization && (
              <span className="ml-2 text-teal-400 font-semibold">
                {profile.specialization}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs text-slate-300 font-mono">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {!profileLoading && profileMissing && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-sky-900">Complete your doctor profile</h2>
            <p className="text-sm text-sky-800 mt-1">Add your specialty and qualification to finish setting up your account.</p>
          </div>
          <Link href="/doctor/profile" className="bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold rounded-xl px-4 py-2 text-center">
            Set up profile
          </Link>
        </div>
      )}

      {!profileLoading && profileError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-800 flex justify-between items-center gap-3">
          <span>{profileError}</span>
          <button onClick={fetchProfile} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={`bg-white border rounded-2xl p-4 hover:shadow-md transition space-y-2 ${kpi.color.split(" ").map(c => c.startsWith("border") ? c : "").filter(Boolean).join(" ")} hover:border-slate-300 border`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{kpi.value}</div>
              <div>
                <div className="font-bold text-xs text-slate-900">{kpi.label}</div>
                <div className="text-[10px] text-slate-500">{kpi.sub}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={`${action.color} text-white rounded-2xl p-4 flex flex-col items-start gap-2 transition shadow-xs`}
            >
              <Icon className="w-5 h-5 text-white/80" />
              <span className="font-bold text-xs leading-tight">{action.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Today's Appointments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Today&apos;s Appointments
            </h2>
            <Link href="/doctor/appointments" className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {apptLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse h-12 bg-slate-100 rounded-2xl" />
              <div className="animate-pulse h-12 bg-slate-100 rounded-2xl" />
            </div>
          ) : apptError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 flex justify-between items-center">
              <span>{apptError}</span>
              <button onClick={fetchAppointments} className="text-rose-700 font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : todayAppts.length > 0 ? (
            <div className="space-y-2">
              {todayAppts.slice(0, 4).map((appt) => (
                <Link
                  key={appt.id}
                  href={`/doctor/appointments`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Patient #{appt.patientId}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(`${appt.appointmentDate}T${appt.startTime}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    appt.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                    appt.status === "REQUESTED" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                    "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {appt.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              No appointments scheduled for today.
            </div>
          )}
        </div>

        {/* Active & Recent Consultations */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Recent Consultations
            </h2>
            <Link href="/doctor/consultations" className="text-[11px] font-bold text-teal-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {consultLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse h-12 bg-slate-100 rounded-2xl" />
              <div className="animate-pulse h-12 bg-slate-100 rounded-2xl" />
            </div>
          ) : consultError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 flex justify-between items-center">
              <span>{consultError}</span>
              <button onClick={fetchConsultations} className="text-rose-700 font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : consultations.length > 0 ? (
            <div className="space-y-2">
              {consultations.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/doctor/consultations/${c.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Patient #{c.patientId}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Appt #{c.appointmentId} &bull; {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    c.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                    c.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                    "bg-sky-100 text-sky-700 border border-sky-200"
                  }`}>
                    {c.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              No consultations found.
            </div>
          )}
        </div>

      </div>

      {/* Pending Appointment Requests */}
      {pendingAppts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-4 shadow-xs">
          <h2 className="font-bold text-amber-900 text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Pending Appointment Requests ({pendingAppts.length})
          </h2>
          <div className="space-y-2">
            {pendingAppts.slice(0, 3).map((appt) => (
              <div key={appt.id} className="bg-white border border-amber-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Patient #{appt.patientId}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(`${appt.appointmentDate}T${appt.startTime}`).toLocaleString()} &bull; {appt.reason || "General Consultation"}
                  </div>
                </div>
                <Link
                  href={`/doctor/appointments`}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
