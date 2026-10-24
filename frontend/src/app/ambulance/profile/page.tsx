'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AmbulanceInfo, OperatorInfo, STATUS_LABELS } from '@/types/ambulance';
import { User, Truck, Phone, RefreshCw, Save, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

function ambStatusColor(status: string) {
  switch (status) {
    case 'AVAILABLE':          return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'ASSIGNED':           return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'EN_ROUTE':           return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'ON_SCENE':           return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    case 'PATIENT_TRANSPORTING': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'UNAVAILABLE':        return 'bg-slate-600/30 text-slate-400 border-slate-600/40';
    default:                   return 'bg-slate-700/30 text-slate-400 border-slate-600/40';
  }
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OperatorProfilePage() {
  const { user } = useAuth();

  const [operator, setOperator]   = useState<OperatorInfo | null>(null);
  const [ambulance, setAmbulance] = useState<AmbulanceInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Edit form
  const [editing, setEditing]     = useState(false);
  const [phone, setPhone]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('Operator session is unavailable.');
      const operatorRes = await apiFetch<OperatorInfo>(`/api/ambulance/operators/${user.id}`, { userId: user.id });
      setOperator(operatorRes);
      setPhone(operatorRes.phone || '');
      // Vehicle details are only available when an emergency is assigned.
      const activeRes = await apiFetch<any>('/api/ambulance/operator/active', { userId: user.id });
      if (activeRes?.assignedOperator) {
        setOperator(activeRes.assignedOperator);
        setPhone(activeRes.assignedOperator.phone || '');
      }
      if (activeRes?.assignedAmbulance) {
        setAmbulance(activeRes.assignedAmbulance);
      }
    } catch (e: any) {
      // 204 = no active emergency — operator still exists, we just have no vehicle data
      if (!e.message?.includes('204') && !e.message?.includes('No Content')) {
        setError(e.message || 'Unable to load operator profile.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    if (!phone.trim()) {
      setSaveMsg('Phone number is required.');
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      if (!user?.id || !operator) throw new Error('Operator profile is unavailable.');
      const updated = await apiFetch<OperatorInfo>(`/api/ambulance/operators/${user.id}`, {
        method: 'PUT',
        userId: user.id,
        body: JSON.stringify({ userId: user.id, name: operator.name, phone: phone.trim() }),
      });
      setOperator(updated);
      setSaveMsg('Contact information saved successfully.');
      setEditing(false);
    } catch (e: any) {
      setSaveMsg(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-red-400" />
          Operator Profile
        </h1>
        <p className="text-slate-400 text-sm mt-1">View your operator details and assigned ambulance.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-red-300 font-medium">Profile could not be fully loaded.</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button onClick={fetchProfile} className="text-xs text-red-400 hover:text-red-300 underline">Retry</button>
        </div>
      )}

      {/* Operator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-700 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">
              {operator?.name || user?.username || 'Ambulance Operator'}
            </div>
            <div className="text-slate-400 text-sm">
              Operator ID: #{user?.id || '—'}
            </div>
            {operator && (
              <span className={`mt-1 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                operator.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                operator.status === 'ASSIGNED'  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                'bg-slate-600/30 text-slate-400 border-slate-600/40'
              }`}>
                {operator.status}
              </span>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-sm">
          <div>
            <div className="text-slate-500 text-xs">Username</div>
            <div className="text-white font-semibold">{user?.username || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Role</div>
            <div className="text-white font-semibold">Ambulance Operator</div>
          </div>
        </div>

        {/* Editable contact info */}
        <div className="border-t border-slate-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Contact Information</h2>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSaveMsg(null); }}
                className="text-xs text-red-400 hover:text-red-300 font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="phone-input" className="block text-xs text-slate-400 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Phone Number
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00001"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                />
              </div>
              {saveMsg && (
                <p className={`text-xs flex items-center gap-1.5 ${
                  saveMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {saveMsg.includes('success') ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {saveMsg}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditing(false); setSaveMsg(null); setPhone(operator?.phone || ''); }}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500" />
                {operator?.phone || '—'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Ambulance */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2">
          <Truck className="w-4 h-4 text-red-400" />
          Assigned Ambulance
        </h2>

        {ambulance ? (
          <div className="grid sm:grid-cols-3 gap-5 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Registration</div>
              <div className="text-white font-bold text-base">{ambulance.registrationNumber}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Vehicle Type</div>
              <div className="text-white font-semibold">{ambulance.vehicleType?.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Current Status</div>
              <span className={`inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full border ${ambStatusColor(ambulance.status)}`}>
                {ambulance.status?.replace(/_/g, ' ')}
              </span>
            </div>
            {ambulance.latitude != null && (
              <div className="sm:col-span-2">
            <div className="text-slate-500 text-xs">Last reported position</div>
                <div className="text-slate-300 font-mono text-sm mt-0.5">
                  {ambulance.latitude.toFixed(4)}, {ambulance.longitude?.toFixed(4)}
                </div>
                {ambulance.lastLocationUpdate && (
                  <div className="text-slate-600 text-xs mt-0.5">
                    Updated {formatTime(ambulance.lastLocationUpdate)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            No ambulance data available. Ambulance information appears when you have an active emergency assignment.
          </p>
        )}
      </div>

    </div>
  );
}
