'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n-client';

function Row({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
    >
      <span>
        <span className="block text-orange-100 font-semibold">{title}</span>
        <span className="block text-sm text-white/40">{detail}</span>
      </span>
      <span className="text-brand-400">→</span>
    </Link>
  );
}

/**
 * Asks for the password again: the server requires it, so a browser left
 * signed in cannot be used to delete someone's account. An account made with
 * Google sign-in has no password the player knows, so it types DELETE.
 */
function DeleteAccount() {
  const { user, logout } = useAuth();
  const needsPassword = user?.hasPassword ?? true;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.delete('/api/users/me', { data: needsPassword ? { password } : { confirm: password } });
      logout();
      // A full load rather than router.push: this page's auth guard sees the
      // user vanish and would win the race, landing them on the login form.
      window.location.assign('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? tr('Could not delete your account', 'Kontot kunde inte raderas'));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
        {tr('Delete my account…', 'Radera mitt konto…')}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex flex-col gap-4">
      <p className="text-sm text-white/70">
        {tr(
          'This erases your account, bids, credit history and settings for good. Coupons you hold stay in the game without an owner and will not pay out to anyone. It cannot be undone.',
          'Det här raderar ditt konto, dina bud, din kredithistorik och dina inställningar för gott. Kuponger du äger blir kvar i spelet utan ägare och betalar inte ut till någon. Det går inte att ångra.',
        )}
      </p>
      {needsPassword ? (
        <Input
          label="Your password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      ) : (
        <Input
          label="Type DELETE to confirm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="off"
          autoCapitalize="characters"
        />
      )}
      <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="h-4 w-4 accent-red-500"
        />
        {tr('I understand this cannot be undone', 'Jag förstår att det inte går att ångra')}
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" loading={busy} disabled={!understood || (needsPassword ? !password : password !== 'DELETE')} className="bg-red-600! hover:bg-red-700!">
          Delete account
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {tr('Cancel', 'Avbryt')}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();
  const { tr } = useI18n();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">{tr('Loading…', 'Laddar…')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">{tr('Settings', 'Inställningar')}</h1>
      <p className="text-white/50 mb-8">{tr('Signed in as', 'Inloggad som')} {user.email}</p>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Row href="/settings/username" title={tr('Username', 'Användarnamn')} detail={user.username ?? tr('Not set', 'Inte valt')} />
        <Row
          href="/settings/notifications"
          title={tr('Email notifications', 'E-postnotiser')}
          detail={tr('Auction results, payouts, new contracts for your teams', 'Auktionsresultat, utbetalningar, nya kontrakt för dina lag')}
        />
      </div>

      <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mt-12 mb-3">{tr('Danger zone', 'Farozon')}</h2>
      <DeleteAccount />
    </div>
  );
}
