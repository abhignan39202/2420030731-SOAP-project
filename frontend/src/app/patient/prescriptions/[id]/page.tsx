'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface PrescriptionItem {
  id: number;
  medicineName: string;
  dosageValue: string;
  dosageUnit: string;
  frequency: string;
  durationValue: number;
  durationUnit: string;
  route?: string;
  instructions?: string;
}

interface Prescription {
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
  items: PrescriptionItem[];
}

export default function PatientPrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id;

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrescription = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data: Prescription = await apiFetch(`/api/prescriptions/${id}`, {
        userId: user?.id,
      });
      setPrescription(data);
    } catch (err: any) {
      setPrescription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  const formatFrequency = (freq: string) => {
    return freq.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading Prescription...
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 mb-4">Prescription record not found.</p>
        <Link href="/patient/prescriptions" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
          Return to Prescriptions List
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/patient/prescriptions" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
              &larr; Back to History
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-bold text-slate-900">Rx Official Prescription #{prescription.id}</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
            >
              🖨️ Print Prescription
            </button>
          </div>
        </div>
      </header>

      {/* Main Prescription Card (Medical Styling) */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8 print:shadow-none print:border-none print:p-0">
          
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b-2 border-teal-600 pb-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-extrabold text-teal-600">Rx</span>
                <h2 className="text-xl font-bold text-slate-900">Rural Health Companion</h2>
              </div>
              <p className="text-xs text-slate-500">Telemedicine & Virtual Healthcare Services</p>
              <p className="text-xs text-slate-700 font-semibold pt-1">
                Prescribing Medical Practitioner: {prescription.doctorName || `Doctor #${prescription.doctorId}`}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                prescription.status === 'FINALIZED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {prescription.status}
              </span>
              <p className="text-xs text-slate-500">Rx ID: #{prescription.id}</p>
              <p className="text-xs text-slate-500">
                Date: {prescription.issuedAt ? new Date(prescription.issuedAt).toLocaleDateString() : new Date(prescription.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Patient & Consultation Context */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-100">
            <div>
              <span className="text-slate-500 block">Patient ID:</span>
              <strong className="text-slate-900 text-sm">#{prescription.patientId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Consultation Reference:</span>
              <strong className="text-slate-900 text-sm">#{prescription.consultationId}</strong>
            </div>
            {prescription.diagnosis && (
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block">Diagnosis:</span>
                <strong className="text-teal-900 text-sm font-bold">{prescription.diagnosis}</strong>
              </div>
            )}
          </div>

          {/* Prescribed Medicines Table */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>💊</span>
              <span>Prescribed Medications</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Dosage</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{item.medicineName}</td>
                      <td className="p-3 font-medium text-slate-800">{item.dosageValue} {item.dosageUnit}</td>
                      <td className="p-3 font-semibold text-teal-700">{formatFrequency(item.frequency)}</td>
                      <td className="p-3 text-slate-800">{item.durationValue} {item.durationUnit}</td>
                      <td className="p-3 text-slate-600 italic">{item.instructions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* General Doctor Instructions */}
          {prescription.generalInstructions && (
            <div className="bg-teal-50 border border-teal-200 p-5 rounded-2xl space-y-2 text-xs">
              <strong className="block font-bold text-teal-950 text-sm">General Doctor Advice & Instructions</strong>
              <p className="text-teal-900 whitespace-pre-line leading-relaxed">
                {prescription.generalInstructions}
              </p>
            </div>
          )}

          {/* Verification Footer */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-400">
            <div>
              <p>Generated by Rural Health Companion System</p>
              <p>Authentic Digital Prescription Record</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-600">Authorized Medical Practitioner Signature</p>
              <p className="text-teal-700 font-bold">{prescription.doctorName || `Doctor #${prescription.doctorId}`}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
