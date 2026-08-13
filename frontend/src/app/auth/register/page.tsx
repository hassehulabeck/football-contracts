'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/register', { email, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendError('');
    setResendState('sending');
    try {
      await api.post('/api/auth/resend-activation', { email });
      setResendState('sent');
    } catch (err: any) {
      setResendState('idle');
      setResendError(err.response?.data?.error ?? 'Something went wrong');
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">Check your email</h1>
          <p className="text-orange-200">
            We sent an activation link to <strong>{email}</strong>. Click it to activate your account and start playing.
          </p>

          {resendState === 'sent' ? (
            <p className="text-orange-200 mt-6">Sent again — check your inbox.</p>
          ) : (
            <Button variant="ghost" className="mt-6" loading={resendState === 'sending'} onClick={resend}>
              Didn&apos;t get it? Resend
            </Button>
          )}
          {resendError && <p className="text-red-400 text-sm mt-3">{resendError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">Create account</h1>
        <p className="text-white/50 mb-8">You start with 1 000 credits.</p>

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
            minLength={8}
            error={password.length > 0 && password.length < 8 ? 'At least 8 characters' : undefined}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-white/50 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
