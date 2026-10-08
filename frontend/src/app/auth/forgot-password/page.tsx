'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">Check your email</h1>
          <p className="text-orange-200">
            If <strong>{email}</strong> has an account, we&apos;ve sent it a link to choose a new password.
            The link expires in an hour.
          </p>
          <p className="mt-8">
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">Forgot password</h1>
        <p className="text-white/50 mb-8">We&apos;ll email you a link to choose a new one.</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-white/50 text-sm">
          Remembered it?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
