'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface PrescriptionSummary {
  id: number;
  consultationId: number;
  patientId: number;
  doctorId: number;
  doctorName?: string;
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
  diagnosis?: string;
  generalInstructions?: string;
  issuedAt?: string;
  createdAt: string;
  itemCount?: number;
}

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      if (!patientId) return;
      const data: PrescriptionSummary[] = await apiFetch(`/api/prescriptions/patient/${patientId}`, {
        userId: patientId,
      });
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">FINALIZED (Official)</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">DRAFT (Pending Doctor Review)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">CANCELLED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              +
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Patient Prescription History</h1>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link href="/patient/consultations" className="text-teal-600 font-medium hover:underline">
              Consultations Portal &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Medical Prescriptions</h2>
          <p className="text-sm text-slate-600">
            View officially issued prescriptions, medication dosages, schedules, and doctor instructions.
          </p>
          <Link href="/patient/prescriptions/scan" className="inline-flex mt-4 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
            Scan Prescription
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading prescriptions...</div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="text-4xl">💊</div>
            <h3 className="text-lg font-bold text-slate-900">No Prescriptions Found</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              You do not have any issued prescriptions yet. Once your doctor completes a consultation and issues a prescription, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Prescription #{p.id}
                    </span>
                    {getStatusBadge(p.status)}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {p.doctorName || `Doctor #${p.doctorId}`}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consultation #{p.consultationId} • Issued: {p.issuedAt ? new Date(p.issuedAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {p.diagnosis && (
                    <div className="bg-teal-50 p-3 rounded-xl text-xs text-teal-900 border border-teal-100">
                      <strong className="block font-semibold mb-0.5">Diagnosis:</strong>
                      <p>{p.diagnosis}</p>
                    </div>
                  )}

                  {p.generalInstructions && (
                    <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border border-slate-100">
                      <strong className="block text-slate-900 font-semibold mb-0.5">Instructions:</strong>
                      <p className="line-clamp-2">{p.generalInstructions}</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 mt-4">
                  <Link
                    href={`/patient/prescriptions/${p.id}`}
                    className="block w-full py-2.5 text-center bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
                  >
                    View Official Prescription &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
