'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import { Building2, Mail, Phone, MapPin, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';

interface PharmacyProfile {
  id: number;
  name: string;
  licenseNumber: string;
  address: string;
  phone: string;
  email: string;
  status: string;
}

export default function PharmacyProfilePage() {
  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Editable fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch active pharmacies or pharmacy detail
      const found = await apiFetch<PharmacyProfile>('/api/pharmacy/pharmacies/me');
      if (found) {
        setProfile(found);
        setPhone(found.phone || '');
        setAddress(found.address || '');
      } else {
        throw new Error('Profile not found');
      }
    } catch (err: any) {
      setProfile(null);
      setError(err.message || 'Unable to load pharmacy profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [pharmacyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');

    if (!phone.trim() || !address.trim()) {
      setError('Phone number and address are required.');
      setSaving(false);
      return;
    }

    try {
      if (!pharmacyId || !profile) throw new Error('Pharmacy profile is unavailable.');
      const updated = await apiFetch<PharmacyProfile>(`/api/pharmacy/pharmacies/${pharmacyId}`, {
        method: 'PUT',
        userId: user?.id,
        body: JSON.stringify({
          name: profile.name,
          licenseNumber: profile.licenseNumber,
          address: address.trim(),
          phone: phone.trim(),
          email: profile.email,
        }),
      });
      setProfile(updated);
      setMsg('Pharmacy operating profile updated successfully!');
    } catch (err: any) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pharmacy Operating Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verified licensed pharmacy identity and contact information for prescription orders.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Verified Licensed Establishment
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex justify-between items-center">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {msg}
          </span>
          <button onClick={() => setMsg('')} className="hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading profile data...</div>
      ) : !profile ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="text-4xl">🏥</div>
          <h3 className="text-lg font-bold text-slate-900">Profile Unavailable</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-900 font-extrabold text-2xl flex items-center justify-center shadow-xs">
                <Building2 className="w-7 h-7 text-slate-900" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{profile.name}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>License: <strong className="text-slate-800 font-mono">{profile.licenseNumber}</strong></span>
                  <span>•</span>
                  <span>ID: <strong className="text-slate-800">#{profile.id}</strong></span>
                </div>
              </div>
            </div>

            {/* Read-Only Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Registered Email</span>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {profile.email}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Operating License Status</span>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ACTIVE & COMPLIANT
                </div>
              </div>
            </div>

            {/* Editable Form */}
            <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Contact & Address Settings</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700">Contact Phone Number</label>
                <div className="mt-1 relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Physical Pharmacy Address</label>
                <div className="mt-1 relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
