'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const portals: Record<string, string> = {
  patient: 'PATIENT', doctor: 'DOCTOR', pharmacy: 'PHARMACY',
  ambulance: 'AMBULANCE_OPERATOR', admin: 'ADMIN',
};
export default function PortalGuard({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const requiredRole = portals[path.split('/')[1]];
  const allowed = !requiredRole || user?.roles.some(role => role.replace(/^ROLE_/, '') === requiredRole);
  useEffect(() => {
    if (requiredRole && !isAuthenticated) router.replace('/login');
  }, [requiredRole, isAuthenticated, router]);
  if (requiredRole && !isAuthenticated) return <p role="status" className="p-8">Opening sign in...</p>;
  if (!allowed) return <div role="alert" className="m-8 rounded-xl border p-6">
    <h1 className="font-bold">Access restricted</h1><p>This portal requires a {requiredRole.toLowerCase().replaceAll('_', ' ')} account.</p>
    <a href="/login" className="mt-3 inline-block text-teal-700 underline">Sign in with another account</a>
  </div>;
  return children;
}
