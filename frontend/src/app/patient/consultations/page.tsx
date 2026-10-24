'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface Consultation {
  id: number;
  appointmentId: number;
  doctorId: number;
  doctorName?: string;
  symptoms?: string;
  diagnosis?: string;
  followUpInstructions?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function PatientConsultationsPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [appointmentIdInput, setAppointmentIdInput] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const fetchConsultations = async () => {
    if (!patientId) {
      setLoading(false);
      setLoadError('You must be signed in to view consultations.');
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const data: Consultation[] = await apiFetch(`/api/consultations/patient/${patientId}`, {
        userId: patientId,
      });
      setConsultations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setConsultations([]);
      setLoadError(err.message || 'Failed to load consultations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [patientId]);

  useEffect(() => {
    const appointmentId = new URLSearchParams(window.location.search).get('appointmentId');
    if (appointmentId) {
      setAppointmentIdInput(appointmentId);
      setShowNewModal(true);
    }
  }, []);

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setErrorMsg('You must be signed in to enter a consultation room.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const appointmentId = Number(appointmentIdInput);
      if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
        throw new Error('Enter a valid confirmed appointment ID.');
      }
      const res: Consultation = await apiFetch('/api/consultations', {
        method: 'POST',
        userId: patientId,
        body: JSON.stringify({
          appointmentId,
          symptoms: symptomsInput,
        }),
      });

      setShowNewModal(false);
      setAppointmentIdInput('');
      setSymptomsInput('');
      fetchConsultations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create consultation room.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              +
            </Link>
            <h1 className="text-lg font-bold text-slate-900">Patient Consultation Portal</h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
            >
              + Enter Consultation Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Virtual Consultations</h2>
          <p className="text-sm text-slate-600">
            View your active consultation rooms, symptoms history, diagnosis, and doctor instructions.
          </p>
        </div>

        {loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button onClick={fetchConsultations} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading consultations...</div>
        ) : consultations.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="text-4xl">🩺</div>
            <h3 className="text-lg font-bold text-slate-900">No Consultations Found</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              You don&apos;t have any active or previous consultations. Enter a confirmed appointment ID to join a consultation room.
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Enter Consultation Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consultations.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Appointment #{c.appointmentId}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      {c.doctorName || `Doctor #${c.doctorId}`}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {c.symptoms && (
                    <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border border-slate-100">
                      <strong className="block text-slate-900 font-semibold mb-1">Reported Symptoms:</strong>
                      <p className="line-clamp-2">{c.symptoms}</p>
                    </div>
                  )}

                  {c.diagnosis && (
                    <div className="bg-teal-50 p-3 rounded-xl text-xs text-teal-900 border border-teal-100">
                      <strong className="block font-semibold mb-0.5">Diagnosis:</strong>
                      <p className="line-clamp-2">{c.diagnosis}</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 mt-4">
                  <Link
                    href={`/patient/consultations/${c.id}`}
                    className="block w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors"
                  >
                    Open Consultation Room &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Consultation Room */}
        {showNewModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Join Consultation Room</h3>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateConsultation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Confirmed Appointment ID</label>
                  <input
                    type="number"
                    required
                    value={appointmentIdInput}
                    onChange={(e) => setAppointmentIdInput(e.target.value)}
                    placeholder="e.g. 10"
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be a CONFIRMED appointment assigned to you.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Describe Your Symptoms</label>
                  <textarea
                    rows={3}
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    placeholder="Fever, cough, body pain, duration..."
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {submitting ? 'Connecting...' : 'Enter Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
