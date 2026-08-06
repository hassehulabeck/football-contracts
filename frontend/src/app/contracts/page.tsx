'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { leagueStyle } from '@/lib/leagues';
import { LeagueBadge } from '@/components/LeagueBadge';
import { ContractFilters, type LeagueFilter } from '@/components/ContractFilters';
import type { Contract, Team } from '@/types/api';

const PATTERN_LABEL: Record<string, string> = {
  WWW: 'Three wins',
  DDD: 'Three draws',
  LLL: 'Three losses',
  WDL: 'Win → Draw → Loss',
  LDW: 'Loss → Draw → Win',
};

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Closing…';
  const totalHours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (totalHours >= 24) return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
  return `${totalHours}h ${mins}m`;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const [league, setLeague] = useState<LeagueFilter>('ALL');
  const [teamId, setTeamId] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    api.get<Contract[]>('/api/contracts')
      .then((r) => setContracts(r.data))
      .finally(() => setLoading(false));
  }, []);

  // Only teams that actually have contracts are worth offering, and only those
  // in the chosen league — otherwise the dropdown lists teams that can only
  // ever produce an empty table.
  const teams = useMemo<Team[]>(() => {
    const byId = new Map<string, Team>();
    for (const c of contracts) {
      if (league !== 'ALL' && c.team.league !== league) continue;
      byId.set(c.team.id, c.team);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [contracts, league]);

  function changeLeague(next: LeagueFilter) {
    setLeague(next);
    // The selected team probably is not in the new league, which would leave
    // the page empty with no obvious cause. Drop back to all teams.
    setTeamId('ALL');
  }

  const filtered = contracts.filter((c) => {
    if (league !== 'ALL' && c.team.league !== league) return false;
    if (teamId !== 'ALL' && c.team.id !== teamId) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading contracts…</p>
      </div>
    );
  }

  const active = filtered.filter((c) => c.status === 'ACTIVE');
  const closed = filtered.filter((c) => c.status !== 'ACTIVE');
  const isFiltered = league !== 'ALL' || teamId !== 'ALL';

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Contracts</h1>
      <p className="text-white/50 mb-8">
        Bid on team performance contracts. New contracts every Wednesday at 03:00.{' '}
        <Link href="/rules" className="text-brand-400 hover:text-brand-300 transition-colors">
          Read the rules →
        </Link>
      </p>

      {contracts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30">No contracts right now — check back on Wednesday.</p>
        </div>
      ) : (
        <>
          <ContractFilters
            league={league}
            onLeagueChange={changeLeague}
            teamId={teamId}
            onTeamChange={setTeamId}
            teams={teams}
          />

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/30 mb-4">No contracts match this filter.</p>
              <button
                onClick={() => changeLeague('ALL')}
                className="text-brand-400 hover:text-brand-300 text-sm font-bold uppercase tracking-wide transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}

          {active.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-3">
                Open auctions <span className="text-white/30 ml-1">{active.length}</span>
              </h2>
              <ContractTable contracts={active} />
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white/30 uppercase tracking-widest mb-3">
                Closed <span className="text-white/20 ml-1">{closed.length}</span>
              </h2>
              <ContractTable contracts={closed} />
            </section>
          )}

          {isFiltered && filtered.length > 0 && (
            <p className="text-white/25 text-xs mt-6">
              Showing {filtered.length} of {contracts.length} contracts.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ContractTable({ contracts }: { contracts: Contract[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">League</th>
            <th className="px-4 py-3 font-medium">Pattern</th>
            <th className="px-4 py-3 font-medium tabular">Coupons</th>
            <th className="px-4 py-3 font-medium">Auction ends</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              {/* The stripe carries the league on narrow screens, where the
                  League column below is hidden. */}
              <td
                className={`px-4 py-3 font-semibold text-orange-100 border-l-2 ${leagueStyle(c.team.league).stripe}`}
              >
                {c.team.name}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <LeagueBadge league={c.team.league} />
              </td>
              <td className="px-4 py-3">
                <span className="font-mono font-bold text-brand-400">{c.pattern}</span>
                <span className="text-white/30 ml-2 hidden md:inline text-xs">
                  {PATTERN_LABEL[c.pattern]}
                </span>
              </td>
              <td className="px-4 py-3 tabular text-white/60">{c.couponCount}</td>
              <td className="px-4 py-3 tabular">
                {c.auction ? (
                  c.auction.closed ? (
                    <span className="text-white/30">Closed</span>
                  ) : (
                    <span className="text-brand-400 font-semibold">
                      {timeRemaining(c.auction.endsAt)}
                    </span>
                  )
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/contracts/${c.id}`}
                  className="text-brand-400 hover:text-brand-300 font-bold text-xs uppercase tracking-wide transition-colors"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
