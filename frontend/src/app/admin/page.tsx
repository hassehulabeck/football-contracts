'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { LEAGUE_ORDER } from '@/lib/leagues';
import { LeagueBadge } from '@/components/LeagueBadge';
import { Button } from '@/components/ui/Button';
import type { AdminLeagueConfig, League } from '@/types/api';

type Draft = Pick<
  AdminLeagueConfig,
  'enabled' | 'contractsPerWeek' | 'couponRatio' | 'couponMin' | 'couponMax'
>;

const FIELDS: { key: Exclude<keyof Draft, 'enabled'>; label: string; step: string }[] = [
  { key: 'contractsPerWeek', label: 'Contracts / week', step: '1' },
  { key: 'couponRatio', label: 'Coupon ratio', step: '0.01' },
  { key: 'couponMin', label: 'Min coupons', step: '1' },
  { key: 'couponMax', label: 'Max coupons', step: '1' },
];

const toDraft = (c: AdminLeagueConfig): Draft => ({
  enabled: c.enabled,
  contractsPerWeek: c.contractsPerWeek,
  couponRatio: c.couponRatio,
  couponMin: c.couponMin,
  couponMax: c.couponMax,
});

export default function AdminPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();

  const [players, setPlayers] = useState(0);
  const [saved, setSaved] = useState<Partial<Record<League, AdminLeagueConfig>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<League, Draft>>>({});
  const [errors, setErrors] = useState<Partial<Record<League, string>>>({});
  const [saving, setSaving] = useState<League | null>(null);
  const [loadError, setLoadError] = useState('');

  // Hiding the page is a courtesy; /api/admin answers 403 to anyone else.
  useEffect(() => {
    if (!loading && user && !user.isAdmin) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api
      .get('/api/admin/leagues')
      .then((res) => {
        setPlayers(res.data.players);
        const rows: AdminLeagueConfig[] = res.data.leagues;
        setSaved(Object.fromEntries(rows.map((r) => [r.league, r])));
        setDrafts(Object.fromEntries(rows.map((r) => [r.league, toDraft(r)])));
      })
      .catch((err) => setLoadError(err.response?.data?.error ?? 'Could not load league settings'));
  }, [user?.isAdmin]);

  if (loading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  const leagues = LEAGUE_ORDER.filter((l) => saved[l] && drafts[l]);
  const isDirty = (l: League) => JSON.stringify(drafts[l]) !== JSON.stringify(toDraft(saved[l]!));
  const totalPerWeek = leagues.reduce(
    (sum, l) => sum + (saved[l]!.enabled ? saved[l]!.contractsPerWeek : 0),
    0,
  );

  const setField = (league: League, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [league]: { ...d[league]!, ...patch } }));

  const save = async (league: League) => {
    setSaving(league);
    setErrors((e) => ({ ...e, [league]: '' }));
    try {
      const res = await api.patch(`/api/admin/leagues/${league}`, drafts[league]);
      setSaved((s) => ({ ...s, [league]: res.data }));
      setDrafts((d) => ({ ...d, [league]: toDraft(res.data) }));
    } catch (err: any) {
      setErrors((e) => ({ ...e, [league]: err.response?.data?.error ?? 'Could not save' }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-5xl text-brand-500">Admin</h1>
        <Link href="/admin/users" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
          Players →
        </Link>
      </div>
      <p className="text-white/50 mb-8">
        Settings for the weekly batch, every Wednesday at 03:00. Changes apply from the next
        batch; contracts already created keep their coupons.
      </p>

      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-6 text-sm">
        <p>
          <span className="text-white/50">Activated players </span>
          <span className="tabular text-brand-400 font-semibold">{players}</span>
        </p>
        <p>
          <span className="text-white/50">Contracts next Wednesday </span>
          <span className="tabular text-brand-400 font-semibold">{totalPerWeek}</span>
        </p>
      </div>

      {loadError && <p className="text-red-400 mb-6">{loadError}</p>}

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">League</th>
              <th className="px-4 py-3 font-semibold">On</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-4 py-3 font-semibold whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Coupons now</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {leagues.map((league) => {
              const draft = drafts[league]!;
              return (
                <tr key={league} className="border-b border-white/5 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <LeagueBadge league={league} />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`${league} enabled`}
                      checked={draft.enabled}
                      onChange={(e) => setField(league, { enabled: e.target.checked })}
                      className="accent-brand-500 w-4 h-4 mt-2"
                    />
                  </td>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="px-4 py-3">
                      <input
                        type="number"
                        step={f.step}
                        min="0"
                        aria-label={`${league} ${f.label}`}
                        value={draft[f.key]}
                        onChange={(e) => setField(league, { [f.key]: Number(e.target.value) })}
                        className="w-20 bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 tabular text-orange-50 focus:outline-hidden focus:border-brand-500"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 tabular text-brand-400 font-semibold pt-5">
                    {saved[league]!.couponCount}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => save(league)}
                      loading={saving === league}
                      disabled={!isDirty(league) || saving !== null}
                      className="px-4! py-1.5! text-sm"
                    >
                      Save
                    </Button>
                    {errors[league] && (
                      <p className="text-red-400 text-xs mt-2 max-w-48">{errors[league]}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-white/40 text-xs mt-4">
        Coupons per contract = activated players × ratio, rounded, then held between min and
        max. &ldquo;Coupons now&rdquo; is what a contract created at this moment would get.
      </p>
    </div>
  );
}
