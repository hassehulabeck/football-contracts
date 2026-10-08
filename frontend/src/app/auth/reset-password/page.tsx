'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// useSearchParams() opts the subtree out of prerendering, so it has to sit
// inside a Suspense boundary or `next build` fails on this route.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The passwords don’t match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-red-500 mb-4">Missing reset link</h1>
          <p className="text-orange-200 mb-8">Open the link from your email, or request a new one.</p>
          <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">Password changed!</h1>
          <p className="text-orange-200 mb-8">You can now log in with your new password.</p>
          <Link
            href="/auth/login"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">New password</h1>
        <p className="text-white/50 mb-8">At least 8 characters.</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
          <Input
            label="Repeat new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {error && (
            <p className="text-red-400 text-sm">
              {error}{' '}
              {error.includes('expired') && (
                <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300">
                  Request a new link
                </Link>
              )}
            </p>
          )}
          <Button type="submit" loading={loading} className="mt-2">
            Save password
          </Button>
        </form>
      </div>
    </div>
  );
}
