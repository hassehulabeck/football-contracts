'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

export default function ActivatePage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No activation token found.'); return; }

    api.get(`/api/auth/activate?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error ?? 'Activation failed. The link may have expired.');
      });
  }, [params]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <p className="text-orange-200">Activating your account…</p>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">Account activated!</h1>
            <p className="text-orange-200 mb-8">You can now log in and start bidding.</p>
            <Link
              href="/auth/login"
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
            >
              Log in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-3xl text-red-500 mb-4">Activation failed</h1>
            <p className="text-orange-200 mb-8">{message}</p>
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
              Try registering again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
