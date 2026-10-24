"use client";

import NotificationInbox from '@/components/NotificationInbox';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  FileText,
  Pill,
  ShoppingBag,
  Ambulance,
  User,
  LogOut,
  Menu,
  X,
  HeartPulse,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/patient", icon: LayoutDashboard },
  { label: "Find Doctors", href: "/patient/doctors", icon: UserCheck },
  { label: "Appointments", href: "/patient/appointments", icon: Calendar },
  { label: "Consultations", href: "/patient/consultations", icon: FileText },
  { label: "Health Timeline", href: "/patient/timeline", icon: Activity },
  { label: "Prescriptions", href: "/patient/prescriptions", icon: FileText },
  { label: "Daily Medicines", href: "/patient/medicines", icon: Pill },
  { label: "Pharmacy Orders", href: "/patient/orders", icon: ShoppingBag },
  { label: "Emergency (108)", href: "/patient/emergency", icon: Ambulance, isDanger: true },
  { label: "My Profile", href: "/patient/profile", icon: User },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isPatient, isDoctor, isPharmacy, isAmbulanceOperator, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!isPatient) {
      const portal = isAdmin ? '/admin' : isDoctor ? '/doctor' : isPharmacy ? '/pharmacy'
        : isAmbulanceOperator ? '/ambulance' : '/login';
      router.replace(portal);
    }
  }, [isAuthenticated, isPatient, isAdmin, isDoctor, isPharmacy, isAmbulanceOperator, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isAuthenticated || !isPatient) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <Link href="/patient" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-none">
                    Rural Health
                  </span>
                  <span className="text-xs font-semibold text-sky-600 tracking-wide uppercase">
                    Patient Companion
                  </span>
                </div>
              </Link>
            </div>

            {/* Header Right */}
            <div className="flex items-center gap-4">
              <Link
                href="/patient/emergency"
                className="hidden sm:flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition"
              >
                <Ambulance className="w-4 h-4 animate-bounce" />
                Emergency (108)
              </Link>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-sm border border-sky-200">
                  {user?.username ? user.username.charAt(0).toUpperCase() : "P"}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {user?.username || "Patient"}
                  </div>
                  <div className="text-xs text-slate-500">ID: #{user?.id || "—"}</div>
                </div>
              </div>

              <NotificationInbox />
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 shrink-0">
          <nav className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Patient Navigation
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    item.isDanger
                      ? "text-rose-600 hover:bg-rose-50 font-semibold"
                      : isActive
                      ? "bg-sky-600 text-white font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : item.isDanger ? "text-rose-600" : "text-slate-500"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-bold text-slate-900">Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-slate-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm ${
                          item.isDanger
                            ? "text-rose-600 bg-rose-50 font-semibold"
                            : isActive
                            ? "bg-sky-600 text-white font-semibold"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>
    </div>
  );
}
