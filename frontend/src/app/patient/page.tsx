"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  Calendar,
  Pill,
  FileText,
  ShoppingBag,
  Ambulance,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Activity,
  Heart
} from "lucide-react";

interface Appointment {
  id: number;
  doctorId: number;
  doctorName?: string;
  doctorSpecialty?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Reminder {
  id: number;
  medicineName: string;
  dosage: string;
  scheduledAt?: string;
  status: string; // PENDING, TAKEN, SKIPPED
}

interface AdherenceSummary {
  totalEligible: number;
  takenCount: number;
  missedCount: number;
  pendingCount: number;
  skippedCount: number;
  adherencePercentage: number;
}

interface Prescription {
  id: number;
  doctorId: number;
  doctorName?: string;
  createdAt: string;
  status: string;
  itemsCount?: number;
}

interface PharmacyOrder {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface EmergencyRequest {
  id: number;
  status: string;
  pickupAddress: string;
  assignedAmbulanceReg?: string;
  estimatedArrivalMinutes?: number;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.id;

  // Section States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [adherence, setAdherence] = useState<AdherenceSummary | null>(null);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);

  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(null);
  const [loadingEmergency, setLoadingEmergency] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchReminders();
    fetchPrescriptions();
    fetchOrders();
    fetchEmergency();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      if (!patientId) return;
      const data = await apiFetch<Appointment[]>(`/api/appointments/patient/${patientId}`, { userId: patientId });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Appointments fetch error", e);
      setLoadError(true);
    } finally {
      setLoadingAppts(false);
    }
  };

  const fetchReminders = async () => {
    try {
      if (!patientId) return;
      const [data, adherenceData] = await Promise.all([
        apiFetch<Reminder[]>("/api/medicines/today", { userId: patientId }),
        apiFetch<AdherenceSummary>("/api/medicines/adherence", { userId: patientId }),
      ]);
      setReminders(Array.isArray(data) ? data : []);
      setAdherence(adherenceData || null);
    } catch (e) {
      console.error("Reminders fetch error", e);
      setLoadError(true);
    } finally {
      setLoadingReminders(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      if (!patientId) return;
      const data = await apiFetch<Prescription[]>(`/api/prescriptions/patient/${patientId}`, { userId: patientId });
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Prescriptions fetch error", e);
      setLoadError(true);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!patientId) return;
      const data = await apiFetch<PharmacyOrder[]>("/api/pharmacy/orders/patient", { userId: patientId });
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Orders fetch error", e);
      setLoadError(true);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchEmergency = async () => {
    try {
      if (!patientId) return;
      const data = await apiFetch<EmergencyRequest>("/api/emergency/my-active", { userId: patientId });
      if (data && data.id) {
        setActiveEmergency(data);
      } else {
        setActiveEmergency(null);
      }
    } catch (e) {
      console.error("Emergency fetch error", e);
      setLoadError(true);
    } finally {
      setLoadingEmergency(false);
    }
  };

  const handleReminderAction = async (reminderId: number, newStatus: "TAKEN" | "SKIPPED") => {
    try {
      await apiFetch(`/api/medicines/reminders/${reminderId}/${newStatus === "TAKEN" ? "taken" : "skipped"}`, {
        method: "PATCH",
        userId: patientId
      });
      fetchReminders();
    } catch (e) {
      alert("Failed to update reminder status");
    }
  };

  // Time of day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Upcoming appointment filter
  const upcomingAppt = appointments.find(a => a.status === "CONFIRMED" || a.status === "REQUESTED");

  const takenCount = adherence?.takenCount ?? 0;
  const adherencePct = Math.round(adherence?.adherencePercentage ?? 100);

  // Active pharmacy order
  const activeOrder = orders.find(o => ["PLACED", "CONFIRMED", "PREPARING", "READY"].includes(o.status));

  // Latest prescription
  const latestPrescription = prescriptions.length > 0 ? prescriptions[0] : null;

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-700 to-sky-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="bg-sky-500/30 text-sky-200 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border border-sky-400/20 inline-block">
            Rural Healthcare Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {greeting}, {user?.username || "Patient"}! 👋
          </h1>
          <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
            Welcome to your unified companion. Track appointments, daily dosage schedules, prescriptions, pharmacy orders, and emergency services in real-time.
          </p>
        </div>
        <div className="absolute right-4 bottom-4 opacity-10 hidden md:block pointer-events-none">
          <Heart className="w-48 h-48 text-white" />
        </div>
      </div>

      {loadError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-800 flex items-center justify-between gap-4">
          <span>Some dashboard data could not be loaded. Please try again.</span>
          <button type="button" onClick={() => window.location.reload()} className="font-bold underline shrink-0">Retry</button>
        </div>
      )}

      {/* Safety Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3.5 items-start text-amber-900 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950 block mb-0.5">Emergency service notice</span>
          For life-threatening emergencies, immediately dial your local emergency provider (108 / 112).
        </div>
      </div>

      {/* Active Emergency Banner */}
      {activeEmergency && (
        <div className="bg-rose-950 border-2 border-rose-500/50 rounded-2xl p-6 text-white space-y-4 shadow-xl animate-pulse">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <span className="bg-rose-800 text-rose-100 text-xs px-2.5 py-0.5 rounded font-bold uppercase">
                  Active Emergency #{activeEmergency.id}
                </span>
                <h2 className="text-xl font-bold mt-1 text-white">Ambulance Dispatch in Progress</h2>
              </div>
            </div>
            <Link
              href="/patient/emergency"
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow"
            >
              Track Live Status &rarr;
            </Link>
          </div>
          <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-800/40 text-xs text-rose-200 flex justify-between">
            <span>Status: <strong className="text-white">{activeEmergency.status}</strong></span>
            <span>Location: <strong className="text-white">{activeEmergency.pickupAddress}</strong></span>
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          <Link
            href="/patient/doctors"
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-sky-500 hover:shadow-md transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto group-hover:bg-sky-600 group-hover:text-white transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">Find Doctor</div>
          </Link>

          <Link
            href="/patient/appointments"
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-sky-500 hover:shadow-md transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto group-hover:bg-blue-600 group-hover:text-white transition">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">Appointments</div>
          </Link>

          <Link
            href="/patient/prescriptions"
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-sky-500 hover:shadow-md transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:bg-emerald-600 group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">Prescriptions</div>
          </Link>

          <Link
            href="/patient/medicines"
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-sky-500 hover:shadow-md transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition">
              <Pill className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">Daily Medicines</div>
          </Link>

          <Link
            href="/patient/orders"
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-sky-500 hover:shadow-md transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:bg-amber-600 group-hover:text-white transition">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">Order Medicines</div>
          </Link>

          <Link
            href="/patient/emergency"
            className="bg-white border border-rose-200 rounded-2xl p-4 hover:bg-rose-50 transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto group-hover:bg-rose-600 group-hover:text-white transition">
              <Ambulance className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-rose-700">Emergency 108</div>
          </Link>

        </div>
      </div>

      {/* Main Dashboard Cards Grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming Appointment */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                Upcoming Appointment
              </h3>
              <Link href="/patient/appointments" className="text-xs font-semibold text-sky-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingAppts ? (
              <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
            ) : upcomingAppt ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="badge-scheduled uppercase text-[10px] mb-1 inline-block">
                    {upcomingAppt.status}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base">
                    Doctor Visit #{upcomingAppt.doctorId}
                  </h4>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(`${upcomingAppt.appointmentDate}T${upcomingAppt.startTime}`).toLocaleString()}
                  </div>
                </div>
                <Link
                  href="/patient/appointments"
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Manage Appointment
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs text-slate-500">No upcoming appointments scheduled.</p>
                <Link
                  href="/patient/doctors"
                  className="inline-block bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                >
                  Find a Doctor & Book
                </Link>
              </div>
            )}
          </div>

          {/* Today's Dosage Reminders & Adherence */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-indigo-600" />
                  Today's Medicines & Schedule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily dose reminders & adherence tracking
                </p>
              </div>

              {/* Adherence Indicator */}
              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-right">
                <div className="text-xs font-bold text-indigo-900">
                  Adherence: {adherencePct}%
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold">
                  {takenCount} taken · {adherence?.skippedCount ?? 0} skipped · {adherence?.missedCount ?? 0} missed
                </div>
              </div>
            </div>

            {loadingReminders ? (
              <div className="animate-pulse h-24 bg-slate-100 rounded-2xl" />
            ) : reminders.length > 0 ? (
              <div className="space-y-3">
                {reminders.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.medicineName}</div>
                        <div className="text-xs text-slate-500">Dose: {item.dosage}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "TAKEN" ? (
                        <span className="badge-completed text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> TAKEN
                        </span>
                      ) : item.status === "SKIPPED" ? (
                        <span className="badge-cancelled text-xs flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> SKIPPED
                        </span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReminderAction(item.id, "TAKEN")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Mark Taken
                          </button>
                          <button
                            onClick={() => handleReminderAction(item.id, "SKIPPED")}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-500">No medicine reminders scheduled for today.</p>
              </div>
            )}

            <div className="pt-2 text-right">
              <Link href="/patient/medicines" className="text-xs font-bold text-indigo-600 hover:underline">
                View Full Dosage Schedule &rarr;
              </Link>
            </div>
          </div>

        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">

          {/* Latest Prescription Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-emerald-600" />
              Prescription Summary
            </h3>

            {loadingPrescriptions ? (
              <div className="animate-pulse h-16 bg-slate-100 rounded-2xl" />
            ) : latestPrescription ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="badge-completed text-[10px] font-bold uppercase">
                      {latestPrescription.status}
                    </span>
                    <div className="font-bold text-slate-900 text-sm mt-1">
                      Prescription #{latestPrescription.id}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(latestPrescription.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Link
                  href={`/patient/prescriptions/${latestPrescription.id}`}
                  className="block w-full text-center bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs py-2 rounded-xl transition"
                >
                  View Details & Medicines
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                No active prescriptions found.
              </div>
            )}
          </div>

          {/* Active Pharmacy Order Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              Pharmacy Order Status
            </h3>

            {loadingOrders ? (
              <div className="animate-pulse h-16 bg-slate-100 rounded-2xl" />
            ) : activeOrder ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">Order #{activeOrder.id}</span>
                  <span className="badge-in-progress uppercase text-[10px]">
                    {activeOrder.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Total: <strong className="text-slate-800">₹{activeOrder.totalAmount}</strong>
                </div>
                <Link
                  href="/patient/orders"
                  className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl transition shadow-xs"
                >
                  Track Order Progress
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                No active pharmacy orders.
              </div>
            )}
          </div>

          {/* Quick Profile Summary Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center">
                {user?.username ? user.username.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <div className="font-bold text-sm">{user?.username || "Patient Profile"}</div>
                <div className="text-xs text-slate-400">Role: Patient</div>
              </div>
            </div>
            <Link
              href="/patient/profile"
              className="block text-center text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 py-2 rounded-xl transition border border-slate-700"
            >
              Manage Health History & Vitals
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
