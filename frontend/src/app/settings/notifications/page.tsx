'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { LEAGUE_ORDER, leagueStyle } from '@/lib/leagues';
import { formatTeamName } from '@/lib/formatTeamName';
import { Button } from '@/components/ui/Button';
import type { League, NotificationPrefs, Team } from '@/types/api';

function Toggle({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex items-start gap-4 px-5 py-4 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-brand-500"
      />
      <span>
        <span className="block text-orange-100 font-semibold">{title}</span>
        <span className="block text-sm text-white/40">{detail}</span>
      </span>
    </label>
  );
}

function toggleIn<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function NotificationSettingsPage() {
  const { user, loading } = useRequireAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<NotificationPrefs>('/api/notifications/me').then((r) => setPrefs(r.data));
    api.get<Team[]>('/api/teams').then((r) => setTeams(r.data));
  }, [user]);

  const teamsByLeague = useMemo(() => {
    const map = new Map<League, Team[]>();
    for (const t of teams) map.set(t.league, [...(map.get(t.league) ?? []), t]);
    return map;
  }, [teams]);

  if (loading || !user || !prefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  const update = (patch: Partial<NotificationPrefs>) => {
    setPrefs({ ...prefs, ...patch });
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put<NotificationPrefs>('/api/notifications/me', prefs);
      setPrefs(r.data);
      setStatus({ ok: true, text: 'Saved.' });
    } catch (err: any) {
      setStatus({ ok: false, text: err.response?.data?.error ?? 'Could not save your settings' });
    } finally {
      setSaving(false);
    }
  };

  const favouriteCount = prefs.favouriteLeagues.length + prefs.favouriteTeamIds.length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/settings" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
        ← Settings
      </Link>
      <h1 className="text-5xl text-brand-500 mt-2 mb-2">Email notifications</h1>
      <p className="text-white/50 mb-8">Sent to {user.email}. Every mail has a link to switch it off.</p>

      <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
        <Toggle
          checked={prefs.notifyAuctionResults}
          onChange={(v) => update({ notifyAuctionResults: v })}
          title="Auction results"
          detail="When your auctions settle: which coupons you won, what they cost, and which bids lost."
        />
        <Toggle
          checked={prefs.notifyPayouts}
          onChange={(v) => update({ notifyPayouts: v })}
          title="Contract fulfilled"
          detail="When a contract you hold a coupon for comes in and pays out."
        />
        <Toggle
          checked={prefs.notifyNewContracts}
          onChange={(v) => update({ notifyNewContracts: v })}
          title="New contracts"
          detail="Every Wednesday, when the week's contracts open for bidding."
        />
      </div>

      {prefs.notifyNewContracts && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-1">Your favourites</h2>
          <p className="text-sm text-white/40 mb-4">
            {favouriteCount === 0
              ? 'Pick none and you hear about every new contract. Pick some and you only hear about those.'
              : 'You only hear about contracts for these leagues and teams. A week with none of them sends nothing.'}
          </p>

          {LEAGUE_ORDER.map((league) => {
            const style = leagueStyle(league);
            const leagueOn = prefs.favouriteLeagues.includes(league);
            const leagueTeams = teamsByLeague.get(league) ?? [];
            return (
              <div key={league} className="mb-5">
                <label className="inline-flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={leagueOn}
                    onChange={() => update({ favouriteLeagues: toggleIn(prefs.favouriteLeagues, league) })}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className={`font-semibold ${style.text}`}>{style.label}</span>
                  <span className="text-xs text-white/30">— the whole league</span>
                </label>
                {/* A whole league already covers its teams, so the picker hides. */}
                {!leagueOn && leagueTeams.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {leagueTeams.map((t) => {
                      const on = prefs.favouriteTeamIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => update({ favouriteTeamIds: toggleIn(prefs.favouriteTeamIds, t.id) })}
                          aria-pressed={on}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            on ? style.filterActive : 'border-white/10 text-white/50 hover:text-orange-200'
                          }`}
                        >
                          {on ? '★ ' : ''}
                          {formatTeamName(t.name)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={save} loading={saving}>
          Save
        </Button>
        {status && <p className={`text-sm ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.text}</p>}
      </div>
    </div>
  );
}
