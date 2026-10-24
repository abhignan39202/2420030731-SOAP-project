'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, username: string, roles: string[], id: number) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isPharmacy: boolean;
  isPatient: boolean;
  isAmbulanceOperator: boolean;
}

function isExpiredJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const claims = JSON.parse(window.atob(padded)) as { exp?: unknown };
    return typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
  isDoctor: false,
  isPharmacy: false,
  isPatient: false,
  isAmbulanceOperator: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        if (isExpiredJwt(storedToken)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (newToken: string, username: string, roles: string[], id: number) => {
    const userData: User = { id, username, roles };
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN') || false;
  const isDoctor = user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || false;
  const isPharmacy = user?.roles?.includes('PHARMACY') || user?.roles?.includes('ROLE_PHARMACY') || false;
  const isAmbulanceOperator = user?.roles?.includes('AMBULANCE_OPERATOR') || user?.roles?.includes('ROLE_AMBULANCE_OPERATOR') || false;
  const isPatient = user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT') || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isAdmin,
        isDoctor,
        isPharmacy,
        isPatient,
        isAmbulanceOperator,
      }}
    >
      {mounted ? children : <div className="min-h-screen bg-slate-50"></div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
