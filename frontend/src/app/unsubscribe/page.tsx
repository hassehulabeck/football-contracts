'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

const KIND_LABELS: Record<string, string> = {
  results: 'auction results mail',
  payouts: 'contract fulfilled mail',
  new: 'new contract mail',
  all: 'all email notifications',
};

// useSearchParams() opts the subtree out of prerendering, so it has to sit
// inside a Suspense boundary or `next build` fails on this route.
export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeContent />
    </Suspense>
  );
}

/**
 * Asks before acting. The link in a mail lands here, and mail scanners open
 * every link they see — if arriving here unsubscribed, players would find
 * their mail switched off without ever having clicked anything.
 */
function UnsubscribeContent() {
  const params = useSearchParams();
  const kind = params.get('k') ?? '';
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'error'>('ask');
  const [error, setError] = useState('');

  const confirm = async () => {
    setState('busy');
    try {
      await api.post(`/api/notifications/unsubscribe?${params.toString()}`);
      setState('done');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setState('error');
    }
  };

  const label = KIND_LABELS[kind] ?? 'these emails';

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm text-center">
        {state === 'done' ? (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">Unsubscribed</h1>
            <p className="text-orange-200 mb-8">You will no longer get {label}.</p>
          </>
        ) : state === 'error' ? (
          <>
            <h1 className="text-3xl text-red-500 mb-4">That did not work</h1>
            <p className="text-orange-200 mb-8">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">Unsubscribe?</h1>
            <p className="text-orange-200 mb-8">Stop sending me {label}.</p>
            <Button onClick={confirm} loading={state === 'busy'}>
              Unsubscribe
            </Button>
          </>
        )}
        <p className="text-sm text-white/40 mt-8">
          You can also choose exactly what to get in your{' '}
          <Link href="/settings/notifications" className="text-brand-400 hover:text-brand-300">
            notification settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
