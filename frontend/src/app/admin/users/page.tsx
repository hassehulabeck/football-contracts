'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import type { AdminUser } from '@/types/api';

function formatDay(dt: string) {
  return new Date(dt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function signed(n: number) {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString()}`;
}

/** Inline form for one player's credit adjustment. */
function Adjust({ user, onDone }: { user: AdminUser; onDone: (credits: number) => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.post<{ credits: number }>(`/api/admin/users/${user.id}/adjust`, {
        amount: Number(amount),
        note,
      });
      onDone(r.data.credits);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Could not adjust');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 px-4 py-3 bg-white/5">
      <label className="flex flex-col gap-1 text-xs text-white/40">
        Credits (+/−)
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          step={1}
          className="w-28 bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-orange-50 tabular"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-white/40 flex-1 min-w-48">
        Reason (the player sees this in their history)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-orange-50"
        />
      </label>
      <Button type="submit" loading={busy} className="py-1.5! text-sm">
        Apply
      </Button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}

export default function AdminUsersPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [adjusting, setAdjusting] = useState<string | null>(null);

  // Hiding the page is a courtesy; /api/admin answers 403 to anyone else.
  useEffect(() => {
    if (!loading && user && !user.isAdmin) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api
      .get<AdminUser[]>('/api/admin/users')
      .then((r) => setUsers(r.data))
      .catch((err) => setLoadError(err.response?.data?.error ?? 'Could not load players'));
  }, [user?.isAdmin]);

  if (loading || !user?.isAdmin || (!users && !loadError)) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">{loadError || 'Loading…'}</p>
      </div>
    );
  }
  if (!users) return <p className="text-red-400 text-center py-20">{loadError}</p>;

  const activated = users.filter((u) => u.emailVerified).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/admin" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
        ← Admin
      </Link>
      <h1 className="text-4xl sm:text-5xl text-brand-500 mt-2 mb-2">Players</h1>
      <p className="text-white/50 mb-8">
        {users.length} accounts, {activated} activated. Adjustments are written to the player&apos;s
        credit history and never count as profit.
      </p>

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-left">
              <th className="px-2 sm:px-4 py-3 font-medium">Player</th>
              <th className="px-2 sm:px-4 py-3 font-medium">Joined</th>
              <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">Credits</th>
              <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">Profit</th>
              <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">Bids</th>
              <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">Coupons</th>
              <th className="px-2 sm:px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr className="border-b border-white/5">
                  <td className="px-2 sm:px-4 py-3">
                    <span className="block font-semibold text-orange-100">
                      {u.username ?? <span className="text-white/30">no username</span>}
                      {u.isAdmin && <span className="ml-2 text-xs text-brand-400 uppercase">admin</span>}
                    </span>
                    <span className="block text-xs text-white/40">
                      {u.email}
                      {!u.emailVerified && <span className="ml-2 text-orange-300">not activated</span>}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3 tabular text-white/50 whitespace-nowrap">{formatDay(u.createdAt)}</td>
                  <td className="px-2 sm:px-4 py-3 tabular text-right font-semibold text-brand-400">
                    {u.credits.toLocaleString()}
                  </td>
                  <td
                    className={`px-2 sm:px-4 py-3 tabular text-right ${
                      u.profit > 0 ? 'text-green-400' : u.profit < 0 ? 'text-orange-300' : 'text-white/40'
                    }`}
                  >
                    {signed(u.profit)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 tabular text-right text-white/60">{u.bids}</td>
                  <td className="px-2 sm:px-4 py-3 tabular text-right text-white/60">{u.coupons}</td>
                  <td className="px-2 sm:px-4 py-3 text-right">
                    <button
                      onClick={() => setAdjusting(adjusting === u.id ? null : u.id)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-semibold uppercase tracking-wide"
                    >
                      {adjusting === u.id ? 'Close' : 'Adjust'}
                    </button>
                  </td>
                </tr>
                {adjusting === u.id && (
                  <tr className="border-b border-white/5">
                    <td colSpan={7} className="p-0">
                      <Adjust
                        user={u}
                        onDone={(credits) => {
                          setUsers(users.map((x) => (x.id === u.id ? { ...x, credits } : x)));
                          setAdjusting(null);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
