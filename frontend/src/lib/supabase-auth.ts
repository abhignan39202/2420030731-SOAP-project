'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { API_BASE_URL } from '@/lib/api';

export type AppAuthResponse = {
  token?: string;
  username?: string;
  roles?: string[];
  id?: number | string;
};

let client: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to frontend/.env.local, then restart the frontend.');
  }
  client ??= createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export async function sendEmailOtp(email: string, createUser: boolean): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: createUser },
  });
  if (error) throw new Error(error.message);
}

export async function verifyEmailOtp(email: string, code: string): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw new Error(error.message);
  if (!data.session?.access_token) throw new Error('Email verification did not return a valid sign-in session.');
  return data.session.access_token;
}

export async function exchangeSupabaseSession(
  endpoint: 'login' | 'register',
  supabaseAccessToken: string,
  registration?: { username: string; roles: string[]; adminRegistrationCode?: string },
): Promise<AppAuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/supabase/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
      ...(registration ? { body: JSON.stringify(registration) } : {}),
    });
  } catch {
    throw new Error('Unable to reach the authentication service. Please check that the project services are running.');
  }

  const responseText = await response.text();
  let payload: AppAuthResponse & { message?: string; error?: string; detail?: string } = {};
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.message || payload.error || payload.detail || `Authentication failed (${response.status}).`);
  }
  return payload;
}

export function portalForRoles(roles: string[]): string | null {
  const accountRoles = new Set(roles.map((role) => role.replace(/^ROLE_/, '').toUpperCase()));
  if (accountRoles.has('ADMIN')) return '/admin';
  if (accountRoles.has('DOCTOR')) return '/doctor';
  if (accountRoles.has('PHARMACY')) return '/pharmacy';
  if (accountRoles.has('AMBULANCE_OPERATOR')) return '/ambulance';
  if (accountRoles.has('PATIENT')) return '/patient';
  return null;
}
