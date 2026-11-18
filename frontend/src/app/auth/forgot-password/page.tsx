'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n-client';

export default function ForgotPasswordPage() {
  const { tr } = useI18n();
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
      setError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">{tr('Check your email', 'Kolla din e-post')}</h1>
          <p className="text-orange-200">
            {tr('If', 'Om')} <strong>{email}</strong>{' '}
            {tr(
              'has an account, we’ve sent it a link to choose a new password. The link expires in an hour.',
              'har ett konto har vi skickat en länk för att välja ett nytt lösenord. Länken slutar gälla om en timme.',
            )}
          </p>
          <p className="mt-8">
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
              {tr('Back to log in', 'Tillbaka till inloggningen')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">{tr('Forgot password', 'Glömt lösenordet')}</h1>
        <p className="text-white/50 mb-8">{tr('We’ll email you a link to choose a new one.', 'Vi mejlar dig en länk så att du kan välja ett nytt.')}</p>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input
            id="email"
            label={tr('Email', 'E-post')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            {tr('Send reset link', 'Skicka återställningslänk')}
          </Button>
        </form>

        <p className="mt-6 text-center text-white/50 text-sm">
          {tr('Remembered it?', 'Kom du ihåg det?')}{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
            {tr('Log in', 'Logga in')}
          </Link>
        </p>
      </div>
    </div>
  );
}
