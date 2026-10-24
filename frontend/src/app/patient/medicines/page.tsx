"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Pill, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

interface Reminder {
  id: number;
  medicationId: number;
  medicineId?: number;
  patientId: number;
  prescriptionId?: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  scheduledAt?: string;
  scheduledTime?: string;
  status: "PENDING" | "TAKEN" | "MISSED" | "SKIPPED";
  takenAt?: string;
  acknowledgedAt?: string;
  instructions?: string;
}

interface AdherenceSummary {
  totalEligible: number;
  takenCount: number;
  missedCount: number;
  pendingCount: number;
  skippedCount: number;
  adherencePercentage: number;
}

interface Medication {
  id: number;
  patientId: number;
  prescriptionId: number;
  medicineName: string;
  dosageValue: string;
  dosageUnit: string;
  frequency: string;
  startDate: string;
  endDate: string;
  instructions?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export default function PatientMedicinesPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [activeTab, setActiveTab] = useState<"today" | "medications" | "history">("today");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [history, setHistory] = useState<Reminder[]>([]);
  const [adherence, setAdherence] = useState<AdherenceSummary>({
    totalEligible: 0,
    takenCount: 0,
    missedCount: 0,
    pendingCount: 0,
    skippedCount: 0,
    adherencePercentage: 100,
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (!patientId) return;
      const [remData, medData, adherenceData, historyData] = await Promise.all([
        apiFetch<Reminder[]>("/api/medicines/today", { userId: patientId }),
        apiFetch<Medication[]>("/api/medications", { userId: patientId }),
        apiFetch<AdherenceSummary>("/api/medicines/adherence", { userId: patientId }),
        apiFetch<Reminder[]>("/api/medicines/history?size=100", { userId: patientId }),
      ]);
      setReminders(Array.isArray(remData) ? remData : []);
      setMedications(Array.isArray(medData) ? medData : []);
      setAdherence(adherenceData || {
        totalEligible: 0,
        takenCount: 0,
        missedCount: 0,
        pendingCount: 0,
        skippedCount: 0,
        adherencePercentage: 100,
      });
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err: any) {
      console.error("Failed to fetch medicine schedule", err);
      setError("Unable to connect to Medicine Service. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const handleUpdateStatus = async (id: number, newStatus: "TAKEN" | "SKIPPED") => {
    try {
      await apiFetch(`/api/medicines/reminders/${id}/${newStatus === "TAKEN" ? "taken" : "skipped"}`, {
        method: "PATCH",
        userId: patientId,
      });
      setMsg(`Medication marked ${newStatus} ✓`);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update reminder status");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Pill className="w-6 h-6 text-indigo-600" />
            Daily Medicine Reminders & Adherence
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track daily dosage schedules and log medication compliance.
          </p>
        </div>
        <Link
          href="/patient/prescriptions"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
        >
          View Prescriptions &rarr;
        </Link>
      </div>

      {/* Adherence Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1">
          <span className="bg-indigo-500/30 text-indigo-200 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Medication Adherence
          </span>
          <h2 className="text-2xl font-extrabold">Adherence History</h2>
          <p className="text-indigo-100 text-xs sm:text-sm">
            {adherence.takenCount} taken · {adherence.skippedCount} skipped · {adherence.missedCount} missed.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-6 py-4 rounded-2xl text-center">
          <div className="text-3xl sm:text-4xl font-extrabold text-white">
            {Math.round(adherence.adherencePercentage)}%
          </div>
          <div className="text-xs font-bold text-indigo-200 mt-0.5">
            Adherence Rate
          </div>
        </div>
      </div>

      {/* Notification Messages */}
      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold p-4 rounded-2xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-slate-500 hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="text-rose-700 hover:underline font-bold flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Schedules are generated automatically
          </h3>
          <p className="text-xs text-slate-500">
            Finalizing a prescription creates the persisted medication schedule for this account.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab("today")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "today" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Today's Reminders ({reminders.length})
        </button>
        <button
          onClick={() => setActiveTab("medications")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "medications" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Active Medications ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "history" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Adherence History ({history.length})
        </button>
      </div>

      {/* TAB 1: Today's Reminders */}
      {activeTab === "today" && (
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse h-24 bg-slate-100 rounded-3xl" />
          ) : reminders.length > 0 ? (
            reminders.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-100">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{r.medicineName}</h4>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {r.dosage}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Due: <strong className="text-slate-800">{(r.scheduledTime || r.scheduledAt) ? new Date(r.scheduledTime || r.scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong> &bull; Frequency: {r.frequency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {r.status === "TAKEN" ? (
                    <span className="badge-completed text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> TAKEN
                    </span>
                  ) : r.status === "SKIPPED" ? (
                    <span className="badge-cancelled text-xs flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> SKIPPED
                    </span>
                  ) : r.status === "MISSED" ? (
                    <span className="badge-cancelled text-xs flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> MISSED
                    </span>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleUpdateStatus(r.id, "TAKEN")}
                        className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
                      >
                        Mark Taken
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, "SKIPPED")}
                        className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">No reminders scheduled for today.</p>
              <p className="text-xs text-slate-500">Schedules appear here after a doctor finalizes a prescription.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Active Medications */}
      {activeTab === "medications" && (
        <div className="grid md:grid-cols-2 gap-4">
          {medications.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-900 text-base">{m.medicineName}</h4>
                <span className="badge-completed text-[10px] uppercase font-bold">
                  {m.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>Dosage: <strong className="text-slate-800">{m.dosageValue} {m.dosageUnit}</strong></div>
                <div>Frequency: <strong className="text-slate-800">{m.frequency}</strong></div>
                <div>Course: <strong className="text-slate-800">{m.startDate} to {m.endDate}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3">
          {history.length > 0 ? history.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900 text-sm">{r.medicineName} <span className="font-semibold text-slate-500">{r.dosage}</span></div>
                <div className="text-xs text-slate-500 mt-1">
                  {(r.scheduledTime || r.scheduledAt) ? new Date(r.scheduledTime || r.scheduledAt!).toLocaleString() : "Scheduled dose"}
                  {r.takenAt ? ` · Taken ${new Date(r.takenAt).toLocaleString()}` : ""}
                </div>
              </div>
              <span className={`text-xs font-bold ${r.status === "TAKEN" ? "text-emerald-700" : r.status === "PENDING" ? "text-amber-700" : "text-slate-600"}`}>{r.status}</span>
            </div>
          )) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-sm text-slate-500">No adherence history yet.</div>
          )}
        </div>
      )}

    </div>
  );
}
