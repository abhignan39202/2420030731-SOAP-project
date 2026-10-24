"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError, apiFetch } from "@/lib/api";
import { User, Phone, Mail, MapPin, Heart, Activity, Save, CheckCircle2 } from "lucide-react";

interface PatientProfile {
  id?: number;
  userId?: number;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
}

export default function PatientProfilePage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [patientId]);

  const fetchProfile = async () => {
    try {
      if (!patientId) return;
      const data = await apiFetch<PatientProfile>(`/api/users/${patientId}/profile`, { userId: patientId });
      setProfileExists(true);
      if (data) {
        if (data.fullName) setFullName(data.fullName);
        else if (user?.username) setFullName(user.username);

        if (data.phoneNumber) setPhone(data.phoneNumber);
        if (data.address) setAddress(data.address);
        if (data.bloodGroup) setBloodGroup(data.bloodGroup);
        if (data.allergies) setAllergies(data.allergies);
        if (data.medicalHistory) setMedicalHistory(data.medicalHistory);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfileExists(false);
        if (user?.username) setFullName(user.username);
        return;
      }
      if (e instanceof ApiError && e.status === 401) return;
      console.error("Profile fetch error", e);
      if (user?.username) setFullName(user.username);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!patientId) throw new Error("You must be signed in to update your profile.");
      await apiFetch(`/api/users/${patientId}/profile`, {
        method: profileExists ? "PUT" : "POST",
        userId: patientId,
        body: JSON.stringify({
          fullName,
          phoneNumber: phone,
          address,
          bloodGroup,
          allergies,
          medicalHistory
        })
      });

      setProfileExists(true);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) return;
      alert(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-sky-600" />
          My Health Profile & Vitals
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your personal details, emergency contact info, and medical history.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-2xl flex items-center gap-2 font-bold animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Profile updated successfully!
        </div>
      )}

      {loading ? (
        <div className="animate-pulse h-64 bg-slate-100 rounded-3xl" />
      ) : (
        <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <User className="w-4 h-4 text-sky-600" /> Personal Information
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Village Main Road, District..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Vitals & Medical History */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <Heart className="w-4 h-4 text-rose-600" /> Health History & Allergies
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Dust, Peanuts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Conditions / History</label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save Health Profile"}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
