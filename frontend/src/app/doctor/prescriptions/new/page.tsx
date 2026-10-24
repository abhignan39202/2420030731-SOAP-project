'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface MedicineItem {
  medicineName: string;
  dosageValue: string;
  dosageUnit: string;
  frequency: string;
  durationValue: number;
  durationUnit: string;
  route: string;
  instructions: string;
}

interface CompletedConsultation {
  id: number;
  appointmentId: number;
  patientId: number;
  diagnosis?: string;
  status: string;
}

export default function NewPrescriptionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = user?.id;

  const [consultationId, setConsultationId] = useState('');
  const [consultations, setConsultations] = useState<CompletedConsultation[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [items, setItems] = useState<MedicineItem[]>([
    {
      medicineName: '',
      dosageValue: '',
      dosageUnit: 'mg',
      frequency: 'TWICE_DAILY',
      durationValue: 5,
      durationUnit: 'DAYS',
      route: 'Oral',
      instructions: '',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctorId) {
      setConsultationsLoading(false);
      return;
    }
    apiFetch<CompletedConsultation[]>(`/api/consultations/doctor/${doctorId}`, {
      userId: doctorId,
      userRoles: 'DOCTOR',
    })
      .then((data) => {
        const completed = (Array.isArray(data) ? data : []).filter((consultation) => consultation.status === 'COMPLETED');
        setConsultations(completed);
        const queryId = new URLSearchParams(window.location.search).get('consultationId');
        const selected = queryId && completed.some((consultation) => String(consultation.id) === queryId)
          ? queryId
          : completed.length === 1 ? String(completed[0].id) : '';
        setConsultationId(selected);
      })
      .catch(() => setConsultations([]))
      .finally(() => setConsultationsLoading(false));
  }, [doctorId]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: '',
        dosageValue: '500',
        dosageUnit: 'mg',
        frequency: 'TWICE_DAILY',
        durationValue: 5,
        durationUnit: 'DAYS',
        route: 'Oral',
        instructions: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setError('Prescription must contain at least one medicine item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof MedicineItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateForm = () => {
    if (!consultationId) {
      setError('Consultation ID is required.');
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].medicineName || items[i].medicineName.trim() === '') {
        setError(`Medicine name for item #${i + 1} is required.`);
        return false;
      }
      if (!items[i].dosageValue || items[i].dosageValue.trim() === '') {
        setError(`Dosage for item #${i + 1} is required.`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setMsg('');
    setError('');

    try {
      const res: any = await apiFetch('/api/prescriptions', {
        method: 'POST',
        userId: doctorId,
        userRoles: 'DOCTOR',
        body: JSON.stringify({
          consultationId: parseInt(consultationId, 10),
          generalInstructions,
          items,
        }),
      });

      setMsg(`Prescription Draft #${res.id} saved successfully!`);
      setTimeout(() => router.push(`/doctor/prescriptions`), 1500);
    } catch (err: any) {
      console.warn('Draft save error:', err.message);
      setError(err.message || 'Failed to create draft prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!validateForm()) return;

    setFinalizing(true);
    setMsg('');
    setError('');

    try {
      // 1. Create prescription draft
      const draft: any = await apiFetch('/api/prescriptions', {
        method: 'POST',
        userId: doctorId,
        userRoles: 'DOCTOR',
        body: JSON.stringify({
          consultationId: parseInt(consultationId, 10),
          generalInstructions,
          items,
        }),
      });

      // 2. Finalize prescription
      const finalized: any = await apiFetch(`/api/prescriptions/${draft.id}/finalize`, {
        method: 'PATCH',
        userId: doctorId,
        userRoles: 'DOCTOR',
      });

      setMsg(`Prescription #${finalized.id} FINALIZED! Redirecting to official document...`);
      setTimeout(() => router.push(`/doctor/prescriptions`), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize prescription.');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/doctor/prescriptions" className="text-slate-500 hover:text-slate-700 text-sm font-medium">
              &larr; Doctor Portal
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-bold text-slate-900">Issue New Prescription</h1>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-semibold border border-teal-200">
              Doctor ID #{doctorId}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create Medical Prescription</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a completed consultation ID and prescribe structured medications with dosage, frequency, and duration.
            </p>
          </div>

          {msg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              {msg}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveDraft} className="space-y-8">
            {/* Consultation Reference */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                Completed Consultation ID <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={consultationId}
                onChange={(e) => setConsultationId(e.target.value)}
                disabled={consultationsLoading || consultations.length === 0}
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100"
              >
                <option value="">{consultationsLoading ? 'Loading completed consultations...' : 'Select a completed consultation'}</option>
                {consultations.map((consultation) => (
                  <option key={consultation.id} value={consultation.id}>
                    Consultation #{consultation.id} · Patient #{consultation.patientId}{consultation.diagnosis ? ` · ${consultation.diagnosis}` : ''}
                  </option>
                ))}
              </select>
              {!consultationsLoading && consultations.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">Complete an assigned consultation before issuing a prescription.</p>
              )}
              <p className="text-xs text-slate-500">
                Must be a COMPLETED consultation where you were the assigned medical practitioner.
              </p>
            </div>

            {/* Dynamic Items Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>💊</span>
                  <span>Prescription Items (Medicines)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold rounded-lg text-xs border border-teal-200 transition-colors"
                >
                  + Add Medicine
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Medicine #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-xs text-rose-600 font-semibold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
                      <input
                        type="text"
                        required
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                        placeholder="e.g. Paracetamol / Amoxicillin"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage *</label>
                        <input
                          type="text"
                          required
                          value={item.dosageValue}
                          onChange={(e) => handleItemChange(idx, 'dosageValue', e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                        <select
                          value={item.dosageUnit}
                          onChange={(e) => handleItemChange(idx, 'dosageUnit', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        >
                          <option value="mg">mg</option>
                          <option value="ml">ml</option>
                          <option value="tablets">tablets</option>
                          <option value="capsules">capsules</option>
                          <option value="drops">drops</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency *</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      >
                        <option value="ONCE_DAILY">Once Daily (OD)</option>
                        <option value="TWICE_DAILY">Twice Daily (BD)</option>
                        <option value="THREE_TIMES_DAILY">Three Times Daily (TDS)</option>
                        <option value="FOUR_TIMES_DAILY">Four Times Daily (QDS)</option>
                        <option value="EVERY_SIX_HOURS">Every 6 Hours</option>
                        <option value="EVERY_EIGHT_HOURS">Every 8 Hours</option>
                        <option value="EVERY_TWELVE_HOURS">Every 12 Hours</option>
                        <option value="AS_NEEDED">As Needed (SOS)</option>
                        <option value="BEFORE_MEALS">Before Meals</option>
                        <option value="AFTER_MEALS">After Meals</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Duration *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.durationValue}
                          onChange={(e) => handleItemChange(idx, 'durationValue', parseInt(e.target.value, 10))}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                        <select
                          value={item.durationUnit}
                          onChange={(e) => handleItemChange(idx, 'durationUnit', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        >
                          <option value="DAYS">DAYS</option>
                          <option value="WEEKS">WEEKS</option>
                          <option value="MONTHS">MONTHS</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Item Instructions</label>
                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                        placeholder="e.g. Take after food with warm water"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General Doctor Instructions */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                General Doctor Advice & Instructions
              </label>
              <textarea
                rows={3}
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Dietary advice, rest, hydration, warning signs..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving Draft...' : 'Save Draft'}
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {finalizing ? 'Finalizing...' : '✓ Finalize & Issue Prescription'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
