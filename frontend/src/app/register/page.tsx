'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { exchangeSupabaseSession, portalForRoles, sendEmailOtp, verifyEmailOtp } from '@/lib/supabase-auth';

type RegistrationRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<RegistrationRole>('PATIENT');
  const [adminRegistrationCode, setAdminRegistrationCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendEmailOtp(email, true);
      setOtpSent(true);
      setMessage(`A verification code was sent to ${email.trim()}.`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to send the verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const supabaseToken = await verifyEmailOtp(email, code);
      const registration = {
        username: username.trim(),
        roles: [role],
        ...(role === 'ADMIN' ? { adminRegistrationCode } : {}),
      };
      const session = await exchangeSupabaseSession('register', supabaseToken, registration);
      const roles = session.roles ?? [];
      const userId = Number(session.id);
      const destination = portalForRoles(roles);
      if (!session.token || !Number.isFinite(userId)) {
        throw new Error('The authentication service returned an invalid session.');
      }
      if (!destination) throw new Error('This account does not have an available portal.');

      login(session.token, session.username || username.trim(), roles, userId);
      router.push(destination);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const useDifferentEmail = () => {
    setOtpSent(false);
    setCode('');
    setMessage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="mx-auto w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">+</div>
          <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900">Create an Account</h2>
          <p className="mt-2 text-center text-sm text-slate-600">Join the Rural Health Companion network</p>
        </div>

        {message && <div role="status" className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-lg">{message}</div>}
        {error && <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>}

        <form className="mt-8 space-y-6" onSubmit={otpSent ? handleVerifyAndRegister : (event) => { event.preventDefault(); void handleSendCode(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">Username</label>
              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                readOnly={otpSent}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose username"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 read-only:opacity-70"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                readOnly={otpSent}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 read-only:opacity-70"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">Account Type</label>
              <select
                id="role"
                value={role}
                disabled={otpSent}
                onChange={(event) => setRole(event.target.value as RegistrationRole)}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-70"
              >
                <option value="PATIENT">Patient Account</option>
                <option value="DOCTOR">Doctor Account</option>
                <option value="ADMIN">Admin Account</option>
              </select>
            </div>

            {role === 'ADMIN' && (
              <div>
                <label htmlFor="adminRegistrationCode" className="block text-sm font-medium text-slate-700">Admin Setup Code</label>
                <input
                  id="adminRegistrationCode"
                  type="password"
                  required
                  autoComplete="off"
                  readOnly={otpSent}
                  value={adminRegistrationCode}
                  onChange={(event) => setAdminRegistrationCode(event.target.value)}
                  placeholder="Enter the server setup code"
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500 read-only:opacity-70"
                />
                <p className="mt-1 text-xs text-slate-500">Ask the site owner for this code.</p>
              </div>
            )}

            {otpSent && (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700">Email verification code</label>
                <input
                  id="otp"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter the 6-digit code"
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                />
                <button type="button" onClick={useDifferentEmail} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">Change registration details</button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (otpSent ? 'Verifying code...' : 'Sending code...') : (otpSent ? 'Verify & Create Account' : 'Send Verification Code')}
          </button>
          {otpSent && (
            <button type="button" disabled={loading} onClick={() => void handleSendCode()} className="w-full text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50">
              Resend code
            </button>
          )}
        </form>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
