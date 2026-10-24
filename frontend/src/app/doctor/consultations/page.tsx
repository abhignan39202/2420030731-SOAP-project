"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Stethoscope, RefreshCw, AlertCircle } from "lucide-react";

interface Consultation {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  symptoms?: string;
  diagnosis?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function DoctorConsultationsPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "IN_PROGRESS" | "SCHEDULED" | "COMPLETED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchConsultations = async () => {
    if (!doctorId) {
      setLoading(false);
      setError("You must be signed in to view consultations.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<Consultation[]>(`/api/consultations/doctor/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError("Unable to load consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [doctorId]);

  const filteredConsultations = consultations.filter((c) => {
    if (activeTab === "ALL") return true;
    return c.status === activeTab;
  });

  const counts = {
    ALL: consultations.length,
    IN_PROGRESS: consultations.filter(c => c.status === "IN_PROGRESS").length,
    SCHEDULED: consultations.filter(c => c.status === "SCHEDULED").length,
    COMPLETED: consultations.filter(c => c.status === "COMPLETED").length,
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "SCHEDULED": return "bg-sky-100 text-sky-800 border-sky-200";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
      case "COMPLETED": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CANCELLED": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" />
            Clinical Consultation Workspace
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage patient sessions, clinical notes, diagnoses, and follow-up instructions.
          </p>
        </div>
        <button
          onClick={fetchConsultations}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(["ALL", "IN_PROGRESS", "SCHEDULED", "COMPLETED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === tab ? "bg-white shadow-xs text-slate-900" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.replace("_", " ")} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-40 bg-slate-100 rounded-3xl" />)}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <p className="font-bold">{error}</p>
          <button onClick={fetchConsultations} className="text-rose-700 font-bold underline text-xs">Retry</button>
        </div>
      ) : filteredConsultations.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No consultations in this category.</p>
          <p className="text-xs text-slate-500">Consultations are created from confirmed appointments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredConsultations.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md hover:border-teal-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Appt #{c.appointmentId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Patient #{c.patientId}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                {c.symptoms && (
                  <div className="bg-amber-50 p-3 rounded-2xl text-xs text-amber-900 border border-amber-200">
                    <strong className="block font-bold mb-0.5">Symptoms:</strong>
                    <p className="line-clamp-2">{c.symptoms}</p>
                  </div>
                )}

                {c.diagnosis && (
                  <div className="bg-teal-50 p-3 rounded-2xl text-xs text-teal-900 border border-teal-200">
                    <strong className="block font-bold mb-0.5">Diagnosis:</strong>
                    <p className="line-clamp-1">{c.diagnosis}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <Link
                  href={`/doctor/consultations/${c.id}`}
                  className={`block w-full py-2.5 text-center font-bold rounded-xl text-xs transition ${
                    c.status === "IN_PROGRESS"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : c.status === "SCHEDULED"
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {c.status === "IN_PROGRESS"
                    ? "Resume Workspace →"
                    : c.status === "SCHEDULED"
                    ? "Start Consultation →"
                    : "View Completed Record →"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
