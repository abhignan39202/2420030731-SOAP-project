"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { User, Mail, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface DoctorProfile {
  userId?: number;
  fullName?: string;
  specialization?: string;
  qualification?: string;
  yearsOfExperience?: number;
  consultationDetails?: string;
  status?: string;
  isAvailable?: boolean;
}

interface DoctorSchedule {
  id: number;
  dayOfWeek?: string;
  specificDate?: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  available?: boolean;
}

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [scheduleDay, setScheduleDay] = useState("MONDAY");
  const [scheduleStart, setScheduleStart] = useState("09:00");
  const [scheduleEnd, setScheduleEnd] = useState("17:00");
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [doctorId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    if (!doctorId) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<DoctorProfile>(`/api/doctors/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setProfile(data);
      setProfileExists(true);
      setSpecialty(data.specialization || "");
      setQualification(data.qualification || "");
      setExperienceYears(data.yearsOfExperience == null ? "" : String(data.yearsOfExperience));
      setAvailabilityNotes(data.consultationDetails || "");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfile(null);
        setProfileExists(false);
      } else {
        setProfileExists(null);
        setError("Unable to load your doctor profile. Please try again.");
      }
    }

    try {
      const scheduleData = await apiFetch<DoctorSchedule[]>(`/api/appointments/availability/${doctorId}`, {
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  };

  const handleAddSchedule = async () => {
    if (!doctorId) return;
    setScheduleSaving(true);
    setError("");
    try {
      const schedule = await apiFetch<DoctorSchedule>("/api/appointments/availability", {
        method: "POST",
        userId: doctorId,
        userRoles: "DOCTOR",
        body: JSON.stringify({
          doctorId,
          dayOfWeek: scheduleDay,
          startTime: `${scheduleStart}:00`,
          endTime: `${scheduleEnd}:00`,
        }),
      });
      setSchedules((current) => [...current, schedule]);
    } catch (e: any) {
      setError(e.message || "Failed to add availability.");
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!doctorId) return;
    try {
      await apiFetch(`/api/appointments/availability/${id}`, {
        method: "DELETE",
        userId: doctorId,
        userRoles: "DOCTOR",
      });
      setSchedules((current) => current.filter((schedule) => schedule.id !== id));
    } catch (e: any) {
      setError(e.message || "Failed to remove availability.");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!doctorId) throw new Error("You must be signed in to save your profile.");
      if (profileExists === null) throw new Error("Load your profile before saving it.");
      const creating = !profileExists;
      const savedProfile = await apiFetch<DoctorProfile>(`/api/doctors/${doctorId}/profile`, {
        method: creating ? "POST" : "PUT",
        userId: doctorId,
        userRoles: "DOCTOR",
        body: JSON.stringify({
          fullName: user?.username || "",
          specialization: specialty,
          qualification,
          yearsOfExperience: experienceYears === "" ? null : Number(experienceYears),
          consultationDetails: availabilityNotes,
        }),
      });
      setProfile(savedProfile);
      setProfileExists(true);
      setSuccessMessage(creating ? "Profile created. Awaiting verification." : "Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-teal-600" />
          Doctor Profile
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your professional information, specialty, and availability visible to patients.
        </p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-2xl flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {successMessage}
        </div>
      )}

      {!loading && profileExists === false && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-sm p-4 rounded-2xl">
          Complete your doctor profile to finish setting up your account.
        </div>
      )}

      {profile?.status === "PENDING_VERIFICATION" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-2xl">
          Your profile is awaiting verification. Patients can find you after it is approved.
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {error}
          {profileExists === null && <button type="button" onClick={fetchProfile} className="ml-auto underline">Retry</button>}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse h-64 bg-slate-100 rounded-3xl" />
      ) : (
        <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">

          {/* Identity */}
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <User className="w-4 h-4 text-teal-600" /> Professional Identity
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-xs pt-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Username</label>
                <input
                  type="text"
                  value={user?.username || ""}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-700 font-semibold cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1">Username is managed by the Auth Service.</p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Qualification</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. MBBS, MD, MS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Medical Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  <option value="">Select Specialty</option>
                  <option value="General Physician">General Physician</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Gynecology">Gynecology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="ENT">ENT</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Rural Health">Rural Health</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <Mail className="w-4 h-4 text-teal-600" /> Availability Details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Availability Notes</label>
                <input
                  type="text"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                  placeholder="e.g. Mon-Fri 9am-5pm, Telemedicine only"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                />
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-800">Bookable weekly slots</p>
              <div className="grid sm:grid-cols-4 gap-2">
                <select value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold">
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
                <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold" />
                <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold" />
                <button type="button" onClick={handleAddSchedule} disabled={scheduleSaving || profileExists !== true} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-3 py-2 disabled:opacity-50">
                  {scheduleSaving ? "Adding..." : "Add Slot"}
                </button>
              </div>
              {profileExists === false && <p className="text-xs text-slate-500">Save your profile before adding bookable slots.</p>}
              {schedules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {schedules.map((schedule) => (
                    <span key={schedule.id} className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl px-3 py-1.5">
                      {schedule.specificDate || schedule.dayOfWeek}: {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
                      <button type="button" onClick={() => handleDeleteSchedule(schedule.id)} className="text-teal-600 hover:text-rose-600" aria-label={`Remove ${schedule.id}`}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving || profileExists === null}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : profileExists ? "Save Doctor Profile" : "Create Doctor Profile"}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
