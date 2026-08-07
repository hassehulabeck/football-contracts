'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { leagueStyle } from '@/lib/leagues';
import { formatTeamName } from '@/lib/formatTeamName';
import { LeagueBadge } from '@/components/LeagueBadge';
import { ContractFilters, type LeagueFilter } from '@/components/ContractFilters';
import type {
  Contract,
  ContractListResponse,
  ContractStatus,
  StatusFilter,
  Team,
} from '@/types/api';

const PAGE_SIZE = 50;

const PATTERN_LABEL: Record<string, string> = {
  WWW: 'Three wins',
  DDD: 'Three draws',
  LLL: 'Three losses',
  WDL: 'Win → Draw → Loss',
  LDW: 'Loss → Draw → Win',
};

const STATUS_STYLE: Record<ContractStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'text-white/30' },
  ACTIVE: { label: 'Auction open', className: 'text-brand-400' },
  CLOSED: { label: 'Awaiting result', className: 'text-white/40' },
  FULFILLED: { label: 'Fulfilled', className: 'text-green-400' },
  FAILED: { label: 'Failed', className: 'text-red-400' },
};

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Closing…';
  const totalHours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (totalHours >= 24) return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
  return `${totalHours}h ${mins}m`;
}

function formatDay(dt: string) {
  return new Date(dt).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<StatusFilter>('open');
  const [league, setLeague] = useState<LeagueFilter>('ALL');
  const [teamId, setTeamId] = useState<string | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const [teams, setTeams] = useState<Team[]>([]);

  // Teams come from /api/teams rather than from the loaded contracts: with the
  // list paginated, deriving them from one page would make the dropdown shift
  // as you page through.
  useEffect(() => {
    api
      .get<Team[]>('/api/teams', { params: league === 'ALL' ? {} : { league } })
      .then((r) => setTeams(r.data))
      .catch(() => setTeams([]));
  }, [league]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<ContractListResponse>('/api/contracts', {
        params: {
          status,
          page,
          pageSize: PAGE_SIZE,
          ...(league === 'ALL' ? {} : { league }),
          ...(teamId === 'ALL' ? {} : { teamId }),
        },
      })
      .then((r) => {
        setContracts(r.data.contracts);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }, [status, league, teamId, page]);

  useEffect(load, [load]);

  // Any filter change invalidates the current page number — page 4 of the old
  // result set is usually past the end of the new one.
  function changeStatus(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  function changeLeague(next: LeagueFilter) {
    setLeague(next);
    // The selected team is probably not in the new league, which would leave
    // the page empty with no obvious cause.
    setTeamId('ALL');
    setPage(1);
  }

  function changeTeam(next: string | 'ALL') {
    setTeamId(next);
    setPage(1);
  }

  function clearFilters() {
    setStatus('open');
    setLeague('ALL');
    setTeamId('ALL');
    setPage(1);
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Contracts</h1>
      <p className="text-white/50 mb-8">
        Bid on team performance contracts. New contracts every Wednesday at 03:00.{' '}
        <Link href="/rules" className="text-brand-400 hover:text-brand-300 transition-colors">
          Read the rules →
        </Link>
      </p>

      <ContractFilters
        status={status}
        onStatusChange={changeStatus}
        league={league}
        onLeagueChange={changeLeague}
        teamId={teamId}
        onTeamChange={changeTeam}
        teams={teams}
      />

      {loading ? (
        <p className="text-white/50 py-16 text-center">Loading contracts…</p>
      ) : contracts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 mb-4">No contracts match this filter.</p>
          <button
            onClick={clearFilters}
            className="text-brand-400 hover:text-brand-300 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ContractTable contracts={contracts} />

          <div className="flex items-center justify-between mt-6">
            <p className="text-white/25 text-xs tabular">
              Showing {firstShown}–{lastShown} of {total}
            </p>
            {lastPage > 1 && (
              <div className="flex items-center gap-2">
                <PageButton onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  ← Prev
                </PageButton>
                <span className="text-white/30 text-xs tabular px-1">
                  {page} / {lastPage}
                </span>
                <PageButton onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage}>
                  Next →
                </PageButton>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white/80 hover:border-white/25 disabled:opacity-30 disabled:hover:text-white/50 disabled:hover:border-white/10 transition-colors"
    >
      {children}
    </button>
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
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium tabular hidden md:table-cell">Coupons</th>
            <th className="px-4 py-3 font-medium tabular hidden md:table-cell">Bids</th>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const statusStyle = STATUS_STYLE[c.status];
            return (
              <tr
                key={c.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                {/* The stripe carries the league on narrow screens, where the
                    League column below is hidden. */}
                <td
                  className={`px-4 py-3 font-semibold text-orange-100 border-l-2 ${leagueStyle(c.team.league).stripe}`}
                >
                  {formatTeamName(c.team.name)}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <LeagueBadge league={c.team.league} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-brand-400">{c.pattern}</span>
                  <span className="text-white/30 ml-2 hidden lg:inline text-xs">
                    {PATTERN_LABEL[c.pattern]}
                  </span>
                </td>
                <td className={`px-4 py-3 font-semibold ${statusStyle.className}`}>
                  {statusStyle.label}
                </td>
                <td className="px-4 py-3 tabular text-white/60 hidden md:table-cell">
                  {c.couponCount}
                </td>
                {/* Demand, read against the coupon supply in the column before it. */}
                <td className="px-4 py-3 tabular text-white/60 hidden md:table-cell">
                  {c.auction?.bidCount ?? '—'}
                </td>
                <td className="px-4 py-3 tabular text-white/40">
                  {c.status === 'ACTIVE' && c.auction && !c.auction.closed ? (
                    <span className="text-brand-400 font-semibold">
                      {timeRemaining(c.auction.endsAt)}
                    </span>
                  ) : c.resolvedAt ? (
                    formatDay(c.resolvedAt)
                  ) : (
                    formatDay(c.createdAt)
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
