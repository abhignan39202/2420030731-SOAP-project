"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface DoctorProfile {
  userId: number;
  fullName: string;
  specialization: string;
  qualification?: string;
  yearsOfExperience?: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<DoctorProfile[]>("/api/doctors/pending");
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending doctors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void fetchPending();
  }, [isAdmin, fetchPending]);

  const approveDoctor = async (doctor: DoctorProfile) => {
    setApprovingId(doctor.userId);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/api/doctors/${doctor.userId}/verify?status=APPROVED`, {
        method: "PATCH",
      });
      setDoctors((current) => current.filter((item) => item.userId !== doctor.userId));
      setMessage(`${doctor.fullName} was approved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve this doctor.");
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Admin access required</h1>
          <p className="text-sm text-slate-600">Sign in with an admin account to review doctor profiles.</p>
          <Link href="/login" className="inline-block rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-teal-700">Rural Health Companion</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Doctor approvals</h1>
            <p className="text-sm text-slate-600">Signed in as {user?.username}</p>
          </div>
          <button
            type="button"
            onClick={() => { logout(); router.push("/login"); }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Log out
          </button>
        </header>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Pending profiles</h2>
            <button type="button" onClick={() => void fetchPending()} disabled={loading} className="text-sm font-semibold text-teal-700 disabled:opacity-50">Refresh</button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p className="text-sm text-slate-500">No doctor profiles are waiting for approval.</p>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor) => (
                <div key={doctor.userId} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{doctor.fullName}</h3>
                    <p className="text-sm text-slate-600">{doctor.specialization}{doctor.qualification ? ` · ${doctor.qualification}` : ""}</p>
                    <p className="text-xs text-slate-500">Doctor ID {doctor.userId}{doctor.yearsOfExperience != null ? ` · ${doctor.yearsOfExperience} years of experience` : ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void approveDoctor(doctor)}
                    disabled={approvingId !== null}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {approvingId === doctor.userId ? "Approving..." : "Approve doctor"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
