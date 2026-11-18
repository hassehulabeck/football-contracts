'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n-client';
import type { Tr } from '@/lib/i18n';

function kindLabel(kind: string, tr: Tr): string {
  const labels: Record<string, string> = {
    results: tr('auction results mail', 'mejl om auktionsresultat'),
    payouts: tr('contract fulfilled mail', 'mejl om uppfyllda kontrakt'),
    new: tr('new contract mail', 'mejl om nya kontrakt'),
    all: tr('all email notifications', 'några e-postnotiser alls'),
  };
  return labels[kind] ?? tr('these emails', 'de här mejlen');
}

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
  const { tr } = useI18n();
  const kind = params.get('k') ?? '';
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'error'>('ask');
  const [error, setError] = useState('');

  const confirm = async () => {
    setState('busy');
    try {
      await api.post(`/api/notifications/unsubscribe?${params.toString()}`);
      setState('done');
    } catch (err: any) {
      setError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
      setState('error');
    }
  };

  const label = kindLabel(kind, tr);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm text-center">
        {state === 'done' ? (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">{tr('Unsubscribed', 'Avregistrerad')}</h1>
            <p className="text-orange-200 mb-8">{tr(`You will no longer get ${label}.`, `Du får inte längre ${label}.`)}</p>
          </>
        ) : state === 'error' ? (
          <>
            <h1 className="text-3xl text-red-500 mb-4">{tr('That did not work', 'Det gick inte')}</h1>
            <p className="text-orange-200 mb-8">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl text-brand-500 mb-4">{tr('Unsubscribe?', 'Avregistrera?')}</h1>
            <p className="text-orange-200 mb-8">{tr(`Stop sending me ${label}.`, `Sluta skicka ${label} till mig.`)}</p>
            <Button onClick={confirm} loading={state === 'busy'}>
              {tr('Unsubscribe', 'Avregistrera')}
            </Button>
          </>
        )}
        <p className="text-sm text-white/40 mt-8">
          {tr('You can also choose exactly what to get in your', 'Du kan också välja exakt vad du vill få i dina')}{' '}
          <Link href="/settings/notifications" className="text-brand-400 hover:text-brand-300">
            {tr('notification settings', 'notisinställningar')}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
