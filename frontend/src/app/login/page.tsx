'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { exchangeSupabaseSession, portalForRoles, sendEmailOtp, verifyEmailOtp } from '@/lib/supabase-auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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
      setMessage(`A one-time code was sent to ${email.trim()}.`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a sign-in code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const supabaseToken = await verifyEmailOtp(email, code);
      const session = await exchangeSupabaseSession('login', supabaseToken);
      const roles = session.roles ?? [];
      const userId = Number(session.id);
      const destination = portalForRoles(roles);
      if (!session.token || !Number.isFinite(userId)) {
        throw new Error('The authentication service returned an invalid session.');
      }
      if (!destination) throw new Error('This account does not have an available portal.');

      login(session.token, session.username || email.trim(), roles, userId);
      router.push(destination);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
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
          <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900">Sign in to Rural Health Companion</h2>
          <p className="mt-2 text-center text-sm text-slate-600">Access your virtual health &amp; pharmacy portal</p>
        </div>

        {message && <div role="status" className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-sm rounded-lg">{message}</div>}
        {error && <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>}

        <form className="mt-8 space-y-6" onSubmit={otpSent ? handleVerifyCode : (event) => { event.preventDefault(); void handleSendCode(); }}>
          <div className="space-y-4">
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
                <button type="button" onClick={useDifferentEmail} className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800">Use a different email</button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (otpSent ? 'Verifying code...' : 'Sending code...') : (otpSent ? 'Verify & Sign In' : 'Send Sign-In Code')}
          </button>
          {otpSent && (
            <button type="button" disabled={loading} onClick={() => void handleSendCode()} className="w-full text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50">
              Resend code
            </button>
          )}
        </form>

        <div className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-700">Register here</Link>
        </div>
      </div>
    </div>
  );
}
