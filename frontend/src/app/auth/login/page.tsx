'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendState('idle');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
        setError(err.response?.data?.message ?? 'Please verify your email first');
      } else {
        setError(err.response?.data?.error ?? 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendState('sending');
    try {
      await api.post('/api/auth/resend-activation', { email });
      setResendState('sent');
    } catch (err: any) {
      setResendState('idle');
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">Log in</h1>
        <p className="text-white/50 mb-8">Good to have you back.</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {unverified && (
            resendState === 'sent' ? (
              <p className="text-orange-200 text-sm">Sent again — check your inbox.</p>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={resendState === 'sending'}
                className="text-brand-400 hover:text-brand-300 text-sm text-left disabled:opacity-50"
              >
                {resendState === 'sending' ? 'Sending…' : 'Resend activation email'}
              </button>
            )
          )}
          <Button type="submit" loading={loading} className="mt-2">
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-white/50 text-sm">
          No account?{' '}
          <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
