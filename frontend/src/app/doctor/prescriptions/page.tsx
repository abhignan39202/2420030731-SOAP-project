"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ClipboardList, Plus, RefreshCw, AlertCircle } from "lucide-react";

interface PrescriptionSummary {
  id: number;
  consultationId: number;
  patientId: number;
  doctorId: number;
  status: "DRAFT" | "FINALIZED" | "CANCELLED";
  diagnosis?: string;
  generalInstructions?: string;
  issuedAt?: string;
  createdAt: string;
  itemCount?: number;
}

export default function DoctorPrescriptionsPage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPrescriptions = async () => {
    setLoading(true);
    setError("");
    try {
      if (!doctorId) return;
      const data = await apiFetch<PrescriptionSummary[]>(`/api/prescriptions/doctor/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError("Unable to load prescriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [doctorId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FINALIZED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">FINALIZED</span>;
      case "DRAFT":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">DRAFT</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">CANCELLED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-slate-700" />
            Issued Prescriptions
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage prescriptions created for your completed consultations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPrescriptions}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/doctor/prescriptions/new"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Prescription
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-40 bg-slate-100 rounded-3xl" />)}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-800 text-sm space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <p className="font-bold">{error}</p>
          <button onClick={fetchPrescriptions} className="text-rose-700 font-bold underline text-xs">Retry</button>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No prescriptions issued yet.</p>
          <p className="text-xs text-slate-500">
            Create a prescription after completing a consultation.
          </p>
          <Link
            href="/doctor/prescriptions/new"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            Create Prescription
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prescriptions.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Rx #{p.id}</span>
                  {getStatusBadge(p.status)}
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">Patient #{p.patientId}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultation #{p.consultationId} &bull; {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {p.diagnosis && (
                  <div className="bg-teal-50 p-3 rounded-2xl text-xs text-teal-900 border border-teal-200">
                    <strong className="block font-bold mb-0.5">Diagnosis:</strong>
                    <p>{p.diagnosis}</p>
                  </div>
                )}

                {p.issuedAt && (
                  <div className="text-xs text-slate-500">
                    Issued: <strong className="text-slate-800">{new Date(p.issuedAt).toLocaleDateString()}</strong>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <Link
                  href={`/patient/prescriptions/${p.id}`}
                  className="block w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
                >
                  View Prescription Record →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
