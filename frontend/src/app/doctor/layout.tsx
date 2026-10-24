"use client";

import NotificationInbox from '@/components/NotificationInbox';
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Stethoscope,
  User,
  LogOut,
  Menu,
  X,
  HeartPulse,
  ClipboardList,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/doctor", icon: LayoutDashboard, exact: true },
  { label: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { label: "My Patients", href: "/doctor/patients", icon: Users },
  { label: "Consultations", href: "/doctor/consultations", icon: Stethoscope },
  { label: "Prescriptions", href: "/doctor/prescriptions", icon: ClipboardList },
  { label: "My Profile", href: "/doctor/profile", icon: User },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo + Mobile Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                  <HeartPulse className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-white font-bold text-sm leading-tight">Rural Health</div>
                  <div className="text-teal-400 text-[10px] font-semibold uppercase tracking-wider">Doctor Portal</div>
                </div>
              </div>
            </div>

            {/* Right: Doctor Info + Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700">
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {user?.username?.charAt(0) || "D"}
                </div>
                <div className="text-right">
                  <div className="text-white text-xs font-bold leading-tight">Dr. {user?.username || "Doctor"}</div>
                  <div className="text-slate-400 text-[10px]">Practitioner</div>
                </div>
              </div>
              <NotificationInbox />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 top-16 bg-slate-900/95 backdrop-blur-sm">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                    active
                      ? "bg-teal-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0">
          <nav className="bg-white border border-slate-200 rounded-2xl shadow-xs p-3 space-y-1 sticky top-24">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-teal-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition font-semibold text-xs w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
