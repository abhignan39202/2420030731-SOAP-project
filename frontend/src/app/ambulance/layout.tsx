'use client';

import NotificationInbox from '@/components/NotificationInbox';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  User,
  LogOut,
  Menu,
  X,
  Siren,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/ambulance', icon: LayoutDashboard, exact: true },
  { label: 'Active Emergency', href: '/ambulance/emergency', icon: AlertTriangle },
  { label: 'History', href: '/ambulance/history', icon: History },
  { label: 'Operator Profile', href: '/ambulance/profile', icon: User },
];

export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAmbulanceOperator, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // Role guard — non-ambulance-operator users are blocked
  if (isAuthenticated && !isAmbulanceOperator) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-red-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Restricted</h1>
          <p className="text-slate-400 text-sm">
            This portal is only available to authorised Ambulance Operators. Your current role does not
            have access to Emergency Operations.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo + Mobile Hamburger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/ambulance" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-sm">
                  <Siren className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-extrabold text-sm leading-tight">Rural Health</div>
                  <div className="text-red-400 text-[10px] font-semibold uppercase tracking-wider">
                    Emergency Operations
                  </div>
                </div>
              </Link>
            </div>

            {/* Header Right: Operator Badge + Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700">
                <div className="w-7 h-7 rounded-full bg-red-700 flex items-center justify-center text-white font-bold text-xs">
                  <Siren className="w-3.5 h-3.5" />
                </div>
                <div className="text-right">
                  <div className="text-white text-xs font-bold leading-tight">
                    {user?.username || 'Operator'}
                  </div>
                  <div className="text-red-400 text-[10px]">Ambulance Operator #{user?.id || "—"}</div>
                </div>
              </div>

              <NotificationInbox />
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 top-16 bg-slate-900/97 backdrop-blur-sm">
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
                      ? 'bg-red-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition text-sm font-semibold w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Layout Content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0">
          <nav className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xs p-3 space-y-1 sticky top-24">
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Emergency Operations
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                    active
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-red-200' : 'text-slate-500'}`} />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-rose-950 hover:text-rose-400 transition font-semibold text-xs w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

      </div>
    </div>
  );
}
