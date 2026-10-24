'use client';

import { ChangeEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

type ScanPhase = 'select' | 'review' | 'saved';

interface ScanDraft {
  id: number;
  status: 'DRAFT' | 'CANCELLED';
}

export default function ScanPrescriptionPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ScanPhase>('select');
  const [selectedName, setSelectedName] = useState('');
  const [reviewedText, setReviewedText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ScanDraft | null>(null);

  const scanFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a JPEG or PNG image.');
      event.target.value = '';
      return;
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError('Choose an image smaller than 8 MB.');
      event.target.value = '';
      return;
    }
    if (!user?.id) {
      setError('Please sign in as a patient to scan a prescription.');
      return;
    }

    setSelectedName(file.name);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch<{ extractedText: string }>('/api/prescriptions/scan/ocr', {
        method: 'POST',
        body: formData,
        userId: user.id,
      });
      if (!result.extractedText?.trim()) {
        throw new Error('No readable text was found. Try a clearer image with good lighting.');
      }
      setReviewedText(result.extractedText);
      setPhase('review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan this image. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmDraft = async () => {
    if (!user?.id || !reviewedText.trim()) return;
    setBusy(true);
    setError('');
    try {
      const saved = await apiFetch<ScanDraft>('/api/prescriptions/scan/drafts', {
        method: 'POST',
        body: JSON.stringify({ reviewedText }),
        userId: user.id,
      });
      setDraft(saved);
      setPhase('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your draft. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancelReview = () => {
    setError('');
    setReviewedText('');
    setSelectedName('');
    setPhase('select');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <Link href="/patient/prescriptions" className="text-sm text-teal-700 hover:underline">← My prescriptions</Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Scan Prescription</h1>
          </div>
          <span aria-hidden="true" className="text-4xl">📷</span>
        </header>

        {phase === 'select' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <p className="text-sm text-slate-600">Take a clear photo or choose an image of your prescription. Images are sent securely to the configured OCR provider for text extraction and are not stored by this service.</p>
            <label htmlFor="prescription-image" className="block text-sm font-semibold text-slate-800">Camera or image file</label>
            <input
              ref={inputRef}
              id="prescription-image"
              aria-label="Choose prescription image"
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              onChange={scanFile}
              disabled={busy}
              className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
            />
            <p className="text-xs text-slate-500">JPEG or PNG · maximum 8 MB</p>
            {busy && <p role="status" className="text-sm text-teal-700">Reading prescription image…</p>}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          </section>
        )}

        {phase === 'review' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review extracted text · {selectedName}</p>
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Please verify extracted prescription information before continuing.</p>
            </div>
            <label htmlFor="reviewed-prescription" className="block text-sm font-semibold text-slate-800">Prescription information (editable)</label>
            <textarea
              id="reviewed-prescription"
              aria-label="Review and edit extracted prescription information"
              value={reviewedText}
              onChange={(event) => setReviewedText(event.target.value)}
              rows={12}
              maxLength={20000}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <p className="text-xs text-slate-500">OCR can make mistakes. Review all medicine names, strengths, and instructions carefully. This step does not create a finalized medication order.</p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={confirmDraft} disabled={busy || !reviewedText.trim()} className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                {busy ? 'Saving…' : 'Confirm and save draft'}
              </button>
              <button type="button" onClick={cancelReview} disabled={busy} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel scan
              </button>
            </div>
          </section>
        )}

        {phase === 'saved' && draft && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4">
            <p role="status" className="text-lg font-bold text-emerald-800">Prescription draft saved</p>
            <p className="text-sm text-slate-700">Draft #{draft.id} is saved for your review. It is not a finalized prescription or medication order. A doctor or pharmacy must validate it before any medicine can be dispensed.</p>
            <p className="text-xs text-slate-500">Your uploaded image was not stored.</p>
            <Link href="/patient/prescriptions" className="inline-flex rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Return to prescriptions</Link>
          </section>
        )}
      </div>
    </main>
  );
}
