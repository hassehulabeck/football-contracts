'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n-client';

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
  const { tr } = useI18n();
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
      setError(tr('The passwords don’t match', 'Lösenorden stämmer inte överens'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-red-500 mb-4">{tr('Missing reset link', 'Återställningslänk saknas')}</h1>
          <p className="text-orange-200 mb-8">{tr('Open the link from your email, or request a new one.', 'Öppna länken från mejlet, eller begär en ny.')}</p>
          <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300">
            {tr('Request a new link', 'Begär en ny länk')}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">{tr('Password changed!', 'Lösenordet är ändrat!')}</h1>
          <p className="text-orange-200 mb-8">{tr('You can now log in with your new password.', 'Nu kan du logga in med ditt nya lösenord.')}</p>
          <Link
            href="/auth/login"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
          >
            {tr('Log in', 'Logga in')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">{tr('New password', 'Nytt lösenord')}</h1>
        <p className="text-white/50 mb-8">{tr('At least 8 characters.', 'Minst 8 tecken.')}</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            id="new-password"
            label={tr('New password', 'Nytt lösenord')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoFocus
          />
          <Input
            id="repeat-password"
            label={tr('Repeat new password', 'Upprepa nytt lösenord')}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {error && (
            <p className="text-red-400 text-sm">
              {error}{' '}
              {/* The API's text, possibly translated — so match both. */}
              {(error.includes('expired') || error.includes('gått ut')) && (
                <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300">
                  {tr('Request a new link', 'Begär en ny länk')}
                </Link>
              )}
            </p>
          )}
          <Button type="submit" loading={loading} className="mt-2">
            {tr('Save password', 'Spara lösenord')}
          </Button>
        </form>
      </div>
    </div>
  );
}
