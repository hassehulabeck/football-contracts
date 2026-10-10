'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LEAGUE_ORDER } from '@/lib/leagues';
import { LeagueBadge } from '@/components/LeagueBadge';
import type { LeagueBatchConfig } from '@/types/api';

// The rules page states the batch settings from the live config rather than
// as copy, so an admin change can never leave the rules saying something else.
// One request shared by every component on the page.
let pending: Promise<LeagueBatchConfig[]> | null = null;

/** The live config; null while loading, 'error' if the request failed. */
function useLeagueConfig(): LeagueBatchConfig[] | null | 'error' {
  const [config, setConfig] = useState<LeagueBatchConfig[] | null | 'error'>(null);
  useEffect(() => {
    pending ??= api.get('/api/leagues/config').then((res) => res.data.leagues);
    pending.then(setConfig).catch(() => {
      pending = null;
      setConfig('error');
    });
  }, []);
  return config;
}

const ordered = (config: LeagueBatchConfig[]) =>
  LEAGUE_ORDER.map((l) => config.find((c) => c.league === l)).filter(
    (c): c is LeagueBatchConfig => c != null && c.enabled,
  );

/** Contracts per week and coupons per contract, one row per active league. */
export function BatchSettingsTable() {
  const config = useLeagueConfig();
  if (config === 'error') {
    return <p className="text-white/40 text-sm mt-4">The current numbers could not be loaded.</p>;
  }
  if (!config) return <p className="text-white/40 text-sm mt-4">Loading current settings…</p>;

  const leagues = ordered(config);
  const total = leagues.reduce((sum, c) => sum + c.contractsPerWeek, 0);

  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/40 text-xs uppercase tracking-wide">
            <th className="px-2 sm:px-4 py-2 font-semibold">League</th>
            <th className="px-2 sm:px-4 py-2 font-semibold text-right">Contracts / week</th>
            <th className="px-2 sm:px-4 py-2 font-semibold text-right">Coupons each</th>
          </tr>
        </thead>
        <tbody>
          {leagues.map((c) => (
            <tr key={c.league} className="border-b border-white/5">
              <td className="px-2 sm:px-4 py-2.5">
                <LeagueBadge league={c.league} />
              </td>
              <td className="px-2 sm:px-4 py-2.5 text-right tabular text-orange-100">{c.contractsPerWeek}</td>
              <td className="px-2 sm:px-4 py-2.5 text-right tabular text-orange-100">{c.couponCount}</td>
            </tr>
          ))}
          <tr>
            <td className="px-2 sm:px-4 py-2.5 text-white/50">Total</td>
            <td className="px-2 sm:px-4 py-2.5 text-right tabular font-semibold text-brand-400">{total}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** How the coupon count scales, in words — collapsed when every league shares one rule. */
export function CouponRuleText() {
  const config = useLeagueConfig();
  if (!config || config === 'error') return null;

  const leagues = ordered(config);
  if (leagues.length === 0) return null;
  const [first] = leagues;
  const shared = leagues.every(
    (c) =>
      c.couponRatio === first.couponRatio &&
      c.couponMin === first.couponMin &&
      c.couponMax === first.couponMax,
  );

  if (!shared) {
    return (
      <p>
        The number scales with the player base, and each league has its own setting — the
        table under <strong className="text-orange-100">How contracts appear</strong> shows
        what a contract gets today.
      </p>
    );
  }
  return (
    <p>
      The number scales with the competition:{' '}
      <strong className="text-orange-100">
        {Math.round(first.couponRatio * 100)}% of activated players
      </strong>
      , never fewer than <strong className="text-orange-100">{first.couponMin}</strong> and
      never more than <strong className="text-orange-100">{first.couponMax}</strong>. Today
      that is <strong className="text-orange-100">{first.couponCount} coupons per contract</strong>.
      The count is fixed when a contract is created, so a contract keeps its supply even as
      the player base grows.
    </p>
  );
}
