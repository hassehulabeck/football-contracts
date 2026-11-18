'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignIn } from '@/components/GoogleSignIn';

export default function RegisterPage() {
  const { locale, tr } = useI18n();
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
      await api.post('/api/auth/register', { email, password, locale });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
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
      setResendError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl text-brand-500 mb-4">{tr('Check your email', 'Kolla din e-post')}</h1>
          <p className="text-orange-200">
            {tr('We sent an activation link to', 'Vi har skickat en aktiveringslänk till')} <strong>{email}</strong>.{' '}
            {tr('Click it to activate your account and start playing.', 'Klicka på den för att aktivera kontot och börja spela.')}
          </p>

          {resendState === 'sent' ? (
            <p className="text-orange-200 mt-6">{tr('Sent again — check your inbox.', 'Skickat igen — kolla din inkorg.')}</p>
          ) : (
            <Button variant="ghost" className="mt-6" loading={resendState === 'sending'} onClick={resend}>
              {tr('Didn’t get it? Resend', 'Fick du inget? Skicka igen')}
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
        <h1 className="text-4xl text-brand-500 mb-2">{tr('Create account', 'Skapa konto')}</h1>
        <p className="text-white/50 mb-8">{tr('You start with 1\u00a0000 credits.', 'Du börjar med 1\u00a0000 krediter.')}</p>

        <GoogleSignIn />

        <GoogleSignIn />

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
          <Input
            id="password"
            label={tr('Password', 'Lösenord')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            error={password.length > 0 && password.length < 8 ? tr('At least 8 characters', 'Minst 8 tecken') : undefined}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            {tr('Create account', 'Skapa konto')}
          </Button>
        </form>

        <p className="mt-4 text-white/30 text-xs">
          {tr('By creating an account you agree to the', 'Genom att skapa ett konto godkänner du')}{' '}
          <Link href="/rules" className="text-brand-400 hover:text-brand-300">
            {tr('rules', 'reglerna')}
          </Link>
          . {tr('We store your email and what you do in the game — see', 'Vi sparar din e-post och vad du gör i spelet — se')}{' '}
          <Link href="/privacy" className="text-brand-400 hover:text-brand-300">
            {tr('how we handle your data', 'hur vi hanterar dina uppgifter')}
          </Link>
          .
        </p>

        <p className="mt-6 text-center text-white/50 text-sm">
          {tr('Already have an account?', 'Har du redan ett konto?')}{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
            {tr('Log in', 'Logga in')}
          </Link>
        </p>
      </div>
    </div>
  );
}
