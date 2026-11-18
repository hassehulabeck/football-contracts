'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { takePendingInvite } from '@/lib/miniLeagues';
import { useI18n } from '@/lib/i18n-client';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GsiWindow {
  google?: {
    accounts: {
      id: {
        initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
        renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
      };
    };
  };
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if ((window as GsiWindow).google) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject());
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

/**
 * "Continue with Google", for the login and register pages alike: the backend
 * signs in an existing account or creates one. Renders nothing unless
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID was set at build time, so the feature stays
 * dark until it has been configured in Google Cloud and on the backend.
 *
 * Google's script is only loaded on the pages that show this button.
 */
export function GoogleSignIn() {
  const { login } = useAuth();
  const { locale, tr } = useI18n();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const onCredential = async ({ credential }: { credential: string }) => {
      setError('');
      try {
        const res = await api.post('/api/auth/google', { credential, locale });
        login(res.data.token, res.data.user);
        // Same as the password login: an invite in progress comes first. A
        // new account has no username yet, and the gate takes it from there.
        const invite = takePendingInvite();
        router.push(invite ? `/join/${invite}` : '/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.error ?? tr('Google sign-in failed — please try again', 'Inloggningen med Google misslyckades — försök igen'));
      }
    };

    loadScript()
      .then(() => {
        const gsi = (window as GsiWindow).google;
        if (cancelled || !gsi || !box.current) return;
        gsi.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, ux_mode: 'popup' });
        gsi.accounts.id.renderButton(box.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(box.current.offsetWidth || 320, 400),
          locale: locale === 'sv' ? 'sv' : 'en',
        });
      })
      .catch(() => !cancelled && setError(tr('Google sign-in could not load. You can still use your email below.', 'Inloggning med Google kunde inte laddas. Du kan fortfarande använda din e-post nedan.')));

    return () => {
      cancelled = true;
    };
  }, [login, router, locale, tr]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mb-6">
      <div ref={box} className="w-full min-h-[44px] flex justify-center" />
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <div className="flex items-center gap-3 mt-6 text-white/30 text-xs uppercase tracking-widest">
        <span className="flex-1 border-t border-white/10" />
        {tr('or with email', 'eller med e-post')}
        <span className="flex-1 border-t border-white/10" />
      </div>
    </div>
  );
}
