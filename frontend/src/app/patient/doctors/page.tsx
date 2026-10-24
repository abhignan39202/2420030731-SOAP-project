"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Search, Stethoscope, Calendar, Clock, UserCheck, CheckCircle, ShieldCheck, X } from "lucide-react";

interface Doctor {
  userId: number;
  fullName: string;
  specialization: string;
  qualification?: string;
  yearsOfExperience?: number;
  status?: string;
  isAvailable?: boolean;
  available?: boolean;
}

interface AvailabilitySlot {
  id: number;
  doctorId: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function DoctorSearchPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("ALL");

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [reason, setReason] = useState("General Health Consultation");
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctor || !appointmentDate) {
      setAvailability([]);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityError("");
    apiFetch<AvailabilitySlot[]>(`/api/appointments/availability/${selectedDoctor.userId}?date=${appointmentDate}`)
      .then((slots) => {
        if (cancelled) return;
        const available = (Array.isArray(slots) ? slots : []).filter((slot) => slot.isAvailable !== false);
        setAvailability(available);
        setAppointmentTime(available[0]?.startTime?.slice(0, 5) || "");
      })
      .catch((error: any) => {
        if (!cancelled) {
          setAvailability([]);
          setAvailabilityError(error.message || "Unable to load available slots.");
        }
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedDoctor, appointmentDate]);

  const fetchDoctors = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch<Doctor[]>("/api/doctors");
      setDoctors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch doctors", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const specialties = ["ALL", ...Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean)))];

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === "ALL" || doc.specialization === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !appointmentDate) {
      alert("Please select a date for your appointment.");
      return;
    }

    setBooking(true);
    try {
      if (!patientId) throw new Error("You must be signed in to book an appointment.");
      const selectedSlot = availability.find((slot) => slot.startTime.slice(0, 5) === appointmentTime);
      if (!selectedSlot) throw new Error("Please select an available slot.");
      await apiFetch("/api/appointments", {
        method: "POST",
        userId: patientId,
        body: JSON.stringify({
          doctorId: selectedDoctor.userId,
          appointmentDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          reason
        })
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedDoctor(null);
      }, 2000);
    } catch (e: any) {
      alert(e.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-sky-600" />
            Find Doctors & Specialists
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Search verified rural health practitioners and schedule virtual telemedicine appointments.
          </p>
        </div>
        <Link
          href="/patient/appointments"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
        >
          My Appointments &rarr;
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search doctor name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {specialties.map((spec) => (
            <option key={spec} value={spec}>
              {spec === "ALL" ? "All Specialties" : spec}
            </option>
          ))}
        </select>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="animate-pulse h-40 bg-slate-100 rounded-2xl" />
          <div className="animate-pulse h-40 bg-slate-100 rounded-2xl" />
        </div>
      ) : loadError ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-sm text-rose-800 space-y-3">
          <p>Doctors could not be loaded. Please try again.</p>
          <button type="button" onClick={() => void fetchDoctors()} className="font-bold underline">Retry</button>
        </div>
      ) : filteredDoctors.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.userId}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-sky-500 hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-lg border border-sky-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <span className="badge-scheduled text-[10px] uppercase font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-sky-600" /> Verified
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {doc.fullName}
                  </h3>
                  <div className="text-xs font-semibold text-sky-600 mt-0.5">
                    {doc.specialization}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>Qualification: <span className="font-medium text-slate-800">{doc.qualification || "—"}</span></div>
                  <div>Experience: <span className="font-medium text-slate-800">{doc.yearsOfExperience ?? "—"} years</span></div>
                  <div>Availability: <span className="font-bold text-slate-900">{(doc.isAvailable ?? doc.available) ? "Available" : "Unavailable"}</span></div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDoctor(doc);
                  setAppointmentDate(new Date().toISOString().split("T")[0]);
                }}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Book Appointment
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No doctors match your query.</p>
          <p className="text-xs text-slate-500">Try clearing filters or search terms.</p>
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h3 className="text-xl font-bold text-slate-900">Appointment Booked!</h3>
                <p className="text-xs text-slate-500">Your doctor slot has been reserved successfully.</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Book Appointment
                  </h3>
                  <p className="text-xs text-slate-500">
                    With {selectedDoctor.fullName} ({selectedDoctor.specialization})
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Date</label>
                    <input
                      type="date"
                      value={appointmentDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred Time Slot</label>
                    {availabilityLoading ? (
                      <p className="text-slate-500 py-2">Loading available slots...</p>
                    ) : availability.length === 0 ? (
                      <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                        {availabilityError || "No slots are available for this date."}
                      </p>
                    ) : (
                      <select
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                      >
                        {availability.map((slot) => (
                          <option key={slot.id} value={slot.startTime.slice(0, 5)}>
                            {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Consultation Reason / Symptoms</label>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookAppointment}
                    disabled={booking || availability.length === 0 || availabilityLoading}
                    className="px-6 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
                  >
                    {booking ? "Confirming..." : "Confirm Booking"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
