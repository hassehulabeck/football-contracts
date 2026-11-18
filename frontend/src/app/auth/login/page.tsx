'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { takePendingInvite } from '@/lib/miniLeagues';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { useI18n } from '@/lib/i18n-client';

export default function LoginPage() {
  const { login } = useAuth();
  const { tr } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResendState('idle');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      // Came here from an invite link: finish joining before anything else.
      const invite = takePendingInvite();
      router.push(invite ? `/join/${invite}` : '/dashboard');
    } catch (err: any) {
      if (err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true);
        setError(err.response?.data?.message ?? tr('Please verify your email first', 'Bekräfta din e-post först'));
      } else {
        setError(err.response?.data?.error ?? tr('Invalid email or password', 'Fel e-post eller lösenord'));
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendState('sending');
    try {
      await api.post('/api/auth/resend-activation', { email });
      setResendState('sent');
    } catch (err: any) {
      setResendState('idle');
      setError(err.response?.data?.error ?? tr('Something went wrong', 'Något gick fel'));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">{tr('Log in', 'Logga in')}</h1>
        <p className="text-white/50 mb-8">{tr('Good to have you back.', 'Kul att se dig igen.')}</p>

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
          />
          <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300 text-sm -mt-3 self-end">
            {tr('Forgot password?', 'Glömt lösenordet?')}
          </Link>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {unverified && (
            resendState === 'sent' ? (
              <p className="text-orange-200 text-sm">{tr('Sent again — check your inbox.', 'Skickat igen — kolla din inkorg.')}</p>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={resendState === 'sending'}
                className="text-brand-400 hover:text-brand-300 text-sm text-left disabled:opacity-50"
              >
                {resendState === 'sending' ? tr('Sending…', 'Skickar…') : tr('Resend activation email', 'Skicka aktiveringsmejlet igen')}
              </button>
            )
          )}
          <Button type="submit" loading={loading} className="mt-2">
            {tr('Log in', 'Logga in')}
          </Button>
        </form>

        <p className="mt-6 text-center text-white/50 text-sm">
          {tr('No account?', 'Inget konto?')}{' '}
          <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
            {tr('Register', 'Skapa ett')}
          </Link>
        </p>
      </div>
    </div>
  );
}
