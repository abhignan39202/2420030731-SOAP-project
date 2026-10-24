'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from './api';
import { useAuth } from './auth';

export interface PharmacyProfile {
  id: number; name: string; licenseNumber: string; address: string;
  phone: string; email: string; status: string;
}
const PharmacyContext = createContext<PharmacyProfile | null>(null);
export function PharmacyProvider({ children }: { children: ReactNode }) {
  const { user, isPharmacy } = useAuth();
  const [pharmacy, setPharmacy] = useState<PharmacyProfile | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isPharmacy) return;
    const controller = new AbortController();
    apiFetch<PharmacyProfile>('/api/pharmacy/pharmacies/me', { signal: controller.signal })
      .then(data => { setPharmacy(data); setError(''); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load your pharmacy.'); });
    return () => controller.abort();
  }, [user?.id, isPharmacy, attempt]);
  if (!isPharmacy) return <p role="alert">Sign in with a pharmacy account to use this portal.</p>;
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
    <p>{error}</p><button className="mt-3 underline" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Try again</button>
  </div>;
  if (!pharmacy) return <p role="status">Loading your pharmacy...</p>;
  return <PharmacyContext.Provider value={pharmacy}>{children}</PharmacyContext.Provider>;
}
export function usePharmacy() {
  const pharmacy = useContext(PharmacyContext);
  if (!pharmacy) throw new Error('Pharmacy context is required');
  return pharmacy;
}
