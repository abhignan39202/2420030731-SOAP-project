'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import VideoRoom from '@/components/consultation/VideoRoom';

interface Consultation {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  doctorName?: string;
  symptoms?: string;
  clinicalNotes?: string; // May be null for patient
  diagnosis?: string;
  followUpInstructions?: string;
  followUpDate?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function PatientConsultationRoomPage() {
  const params = useParams();
  const { user, token } = useAuth();
  const id = params?.id;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConsultation = useCallback(async () => {
    if (!id || !user?.id) {
      setLoading(false);
      setError('You must be signed in to open a consultation room.');
      return;
    }
    setError('');
    try {
      const data: Consultation = await apiFetch(`/api/consultations/${id}`, {
        userId: user.id,
      });
      setConsultation(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 403 ? 'You do not have permission to access this consultation.' : err instanceof Error ? err.message : 'Unable to load consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void fetchConsultation();
  }, [fetchConsultation]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-200">Scheduled — Awaiting Doctor</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-200 animate-pulse">Consultation Active</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">Completed</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-semibold border border-rose-200">Cancelled</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Opening Consultation Room...
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 mb-4">{error || 'Consultation room not found.'}</p>
        <button onClick={() => { setLoading(true); void fetchConsultation(); }} className="mb-3 rounded-lg border px-4 py-2">Try again</button>
        <Link href="/patient/consultations" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
          Return to Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/patient/consultations" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
              &larr; Portal
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-bold text-slate-900">Virtual Consultation Room #{consultation.id}</h1>
          </div>

          <div>{getStatusBadge(consultation.status)}</div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Doctor & Appointment Details */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center font-bold text-xl">
                👨‍⚕️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{consultation.doctorName || `Doctor #${consultation.doctorId}`}</h3>
                <p className="text-xs text-teal-600 font-medium">Assigned Medical Practitioner</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Appointment ID:</span>
                <span className="font-semibold text-slate-800">#{consultation.appointmentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room Status:</span>
                <span className="font-semibold text-slate-800">{consultation.status}</span>
              </div>
              {consultation.startedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Started At:</span>
                  <span className="font-semibold text-slate-800">{new Date(consultation.startedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (2 spans): Symptoms & Medical Consultation Output */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Symptoms Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>📝</span>
                <span>Your Symptoms & Details</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded">Read-only record</span>
            </div>
            <div className="w-full min-h-28 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 whitespace-pre-wrap">
              {consultation.symptoms || 'No symptoms recorded.'}
            </div>
          </div>

          {/* Consultation Output: Diagnosis & Follow-up */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span>🩺</span>
              <span>Doctor Summary & Clinical Guidance</span>
            </h3>

            {consultation.diagnosis ? (
              <div className="space-y-6">
                <div className="bg-teal-50 border border-teal-200 p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">Official Diagnosis</span>
                  <p className="text-base font-bold text-teal-950">{consultation.diagnosis}</p>
                </div>

                {consultation.followUpInstructions && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Follow-Up Care Instructions</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                      {consultation.followUpInstructions}
                    </div>
                  </div>
                )}

                {consultation.followUpDate && (
                  <div className="flex items-center space-x-3 bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900">
                    <span className="text-lg">📅</span>
                    <div>
                      <strong className="block font-semibold">Suggested Follow-Up Date:</strong>
                      <span>{new Date(consultation.followUpDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <div className="text-3xl">⏳</div>
                <p className="text-sm font-medium">Awaiting Doctor Consultation Summary</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Once your doctor conducts the consultation and submits clinical notes, your diagnosis and care plan will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <VideoRoom
          consultationId={consultation.id}
          consultationStatus={consultation.status}
          role="PATIENT"
          token={token}
        />
      </div>
    </div>
  );
}
