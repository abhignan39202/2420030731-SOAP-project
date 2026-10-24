'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const roles = user?.roles?.map((role) => role.replace(/^ROLE_/, '').toUpperCase()) ?? [];
  const dashboardHref = roles.includes('ADMIN') ? '/admin'
    : roles.includes('DOCTOR') ? '/doctor'
    : roles.includes('PHARMACY') ? '/pharmacy'
    : roles.includes('AMBULANCE_OPERATOR') ? '/ambulance'
    : roles.includes('PATIENT') ? '/patient' : '/login';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              +
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Rural Health Companion</span>
              <span className="block text-xs text-teal-600 font-medium">Telemedicine & Virtual Care</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600 font-medium">
                  Welcome, <strong className="text-slate-900">{user?.username}</strong>
                </span>
                <Link
                  href={dashboardHref}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Phase 8 — Telemedicine & Virtual Consultations
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Quality Healthcare Access for Every Rural Community
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Connect directly with verified medical practitioners, manage appointments, submit pre-consultation symptoms, and receive expert clinical notes and follow-up guidance.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/patient/consultations"
              className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-base transition-all shadow-md hover:shadow-lg"
            >
              Patient Portal — Consultations
            </Link>
            <Link
              href="/doctor/consultations"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-base transition-all shadow-md hover:shadow-lg"
            >
              Doctor Portal — Workspace
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-xl font-bold">
              📅
            </div>
            <h3 className="text-base font-bold text-slate-900">Appointments</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Book time slots with verified doctors protected against double-booking.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
              🩺
            </div>
            <h3 className="text-base font-bold text-slate-900">Virtual Room</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Submit symptoms & join virtual care consultation workflows.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold">
              📋
            </div>
            <h3 className="text-base font-bold text-slate-900">Diagnosis & Notes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Receive clinical diagnosis and structured follow-up instructions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold">
              💊
            </div>
            <h3 className="text-base font-bold text-slate-900">Prescriptions & Reminders</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Structured Rx records, daily dose tracking, and adherence stats.
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs font-semibold text-teal-600">
              <Link href="/patient/prescriptions" className="hover:underline">Prescriptions &rarr;</Link>
              <span>•</span>
              <Link href="/patient/medicines" className="hover:underline">Reminders &rarr;</Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl font-bold">
              🏪
            </div>
            <h3 className="text-base font-bold text-slate-900">Pharmacy Orders</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Order prescribed medicines from licensed partner rural pharmacies.
            </p>
            <div className="flex items-center space-x-3 pt-1 text-xs font-semibold text-amber-700">
              <Link href="/patient/orders" className="hover:underline">Patient Orders &rarr;</Link>
              <span>•</span>
              <Link href="/pharmacy/orders" className="hover:underline">Pharmacy &rarr;</Link>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-red-500/30 shadow-md space-y-3">
            <div className="w-12 h-12 bg-red-900/40 text-red-400 rounded-xl flex items-center justify-center text-xl font-bold">
              🚨
            </div>
            <h3 className="text-base font-bold text-red-400">Emergency Ambulance</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Instant emergency ambulance request, nearest unit dispatch, and live status.
            </p>
            <div className="flex items-center space-x-3 pt-1 text-xs font-semibold text-red-400">
              <Link href="/patient/emergency" className="hover:underline">Request Ambulance &rarr;</Link>
              <span>•</span>
              <Link href="/ambulance/dashboard" className="hover:underline">Operator &rarr;</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Rural Health Companion &copy; 2026 — Telemedicine consultation workflow enabled. Real-time video is an optional future integration.
      </footer>
    </div>
  );
}
