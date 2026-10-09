'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
 * signed in cannot be used to delete someone's account.
 */
function DeleteAccount() {
  const { logout } = useAuth();
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
      await api.delete('/api/users/me', { data: { password } });
      logout();
      // A full load rather than router.push: this page's auth guard sees the
      // user vanish and would win the race, landing them on the login form.
      window.location.assign('/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Could not delete your account');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
        Delete my account…
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex flex-col gap-4">
      <p className="text-sm text-white/70">
        This erases your account, bids, credit history and settings for good. Coupons you hold
        stay in the game without an owner and will not pay out to anyone. It cannot be undone.
      </p>
      <Input
        label="Your password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="h-4 w-4 accent-red-500"
        />
        I understand this cannot be undone
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" loading={busy} disabled={!understood || !password} className="bg-red-600! hover:bg-red-700!">
          Delete account
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Settings</h1>
      <p className="text-white/50 mb-8">Signed in as {user.email}</p>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Row href="/settings/username" title="Username" detail={user.username ?? 'Not set'} />
        <Row
          href="/settings/notifications"
          title="Email notifications"
          detail="Auction results, payouts, new contracts for your teams"
        />
      </div>

      <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mt-12 mb-3">Danger zone</h2>
      <DeleteAccount />
    </div>
  );
}
