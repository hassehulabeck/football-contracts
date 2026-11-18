'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n-client';

type Status = 'loading' | 'success' | 'error';

// useSearchParams() opts the subtree out of prerendering, so it has to sit
// inside a Suspense boundary or `next build` fails on this route.
export default function ActivatePage() {
  const { tr } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
          <p className="text-orange-200">{tr('Activating your account…', 'Aktiverar ditt konto…')}</p>
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}

function ActivateContent() {
  const params = useSearchParams();
  const { tr } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage(tr('No activation token found.', 'Ingen aktiveringskod hittades.')); return; }

    api.get(`/api/auth/activate?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error ?? tr('Activation failed. The link may have expired.', 'Aktiveringen misslyckades. Länken kan ha gått ut.'));
      });
  }, [params]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <p className="text-orange-200">{tr('Activating your account…', 'Aktiverar ditt konto…')}</p>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">{tr('Account activated!', 'Kontot är aktiverat!')}</h1>
            <p className="text-orange-200 mb-8">{tr('You can now log in and start bidding.', 'Nu kan du logga in och börja bjuda.')}</p>
            <Link
              href="/auth/login"
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
            >
              {tr('Log in', 'Logga in')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-3xl text-red-500 mb-4">{tr('Activation failed', 'Aktiveringen misslyckades')}</h1>
            <p className="text-orange-200 mb-8">{message}</p>
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
              {tr('Try registering again', 'Försök registrera dig igen')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
