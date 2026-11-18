'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { leagueStyle } from '@/lib/leagues';
import { formatTeamName } from '@/lib/formatTeamName';
import { formatContractRun, nextContractRun } from '@/lib/nextContractRun';
import { LeagueBadge } from '@/components/LeagueBadge';
import { TeamLogo } from '@/components/TeamLogo';
import { StatTile } from '@/components/ui/StatTile';
import { ContractFilters, type LeagueFilter } from '@/components/ContractFilters';
import type {
  Contract,
  ContractListResponse,
  ContractStatus,
  ContractSummary,
  StatusFilter,
  Team,
} from '@/types/api';
import { patternLabel } from '@/lib/patterns';
import { useI18n } from '@/lib/i18n-client';
import { dateLocale, type Locale, type Tr } from '@/lib/i18n';

const PAGE_SIZE = 50;

function statusStyle(status: ContractStatus, tr: Tr): { label: string; className: string } {
  const styles: Record<ContractStatus, { label: string; className: string }> = {
    PENDING: { label: tr('Pending', 'Väntande'), className: 'text-white/30' },
    ACTIVE: { label: tr('Auction open', 'Auktion öppen'), className: 'text-brand-400' },
    CLOSED: { label: tr('Awaiting result', 'Väntar på resultat'), className: 'text-white/40' },
    FULFILLED: { label: tr('Fulfilled', 'Uppfyllt'), className: 'text-green-400' },
    FAILED: { label: tr('Failed', 'Misslyckat'), className: 'text-red-400' },
  };
  return styles[status];
}

function timeRemaining(endsAt: string, tr: Tr): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return tr('Closing…', 'Stänger…');
  const totalHours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const [d, h] = [tr('d', 'd'), tr('h', 't')];
  if (totalHours >= 24) return `${Math.floor(totalHours / 24)}${d} ${totalHours % 24}${h}`;
  return `${totalHours}${h} ${mins}m`;
}

function formatDay(dt: string, locale: Locale) {
  return new Date(dt).toLocaleDateString(dateLocale(locale), { month: 'short', day: 'numeric' });
}

export default function ContractsPage() {
  const { locale, tr } = useI18n();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<StatusFilter>('open');
  const [league, setLeague] = useState<LeagueFilter>('ALL');
  const [teamId, setTeamId] = useState<string | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const [teams, setTeams] = useState<Team[]>([]);
  const [summary, setSummary] = useState<ContractSummary | null>(null);

  // Deliberately independent of `load()`: these counts describe every contract
  // on the site, so they must not move when a filter narrows the table below.
  // Left null if the request fails — an old backend mid-deploy has no such
  // endpoint, and the tiles are context, not the page.
  useEffect(() => {
    api
      .get<ContractSummary>('/api/contracts/summary')
      .then((r) => setSummary(r.data))
      .catch(() => setSummary(null));
  }, []);

  // Nothing is open, so the default "Auction open" filter would open on an empty
  // table. Switching to "All contracts" shows the season instead. Guarded on
  // `status === 'open'`, which is only still true if the player has not chosen
  // a filter themselves — this must not overrule an explicit choice.
  useEffect(() => {
    if (summary?.open === 0 && status === 'open') setStatus('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">{tr('Contracts', 'Kontrakt')}</h1>
      <p className="text-white/50 mb-8">
        {tr(
          'Bid on team performance contracts. New contracts every Wednesday at 03:00.',
          'Bjud på kontrakt om lagens resultat. Nya kontrakt varje onsdag kl. 03:00.',
        )}{' '}
        <Link href="/rules" className="text-brand-400 hover:text-brand-300 transition-colors">
          {tr('Read the rules →', 'Läs reglerna →')}
        </Link>
      </p>

      {summary && (
        <div className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatTile label={tr('Auction open', 'Auktion öppen')} value={String(summary.open)} muted={summary.open === 0} />
            <StatTile
              label={tr('Awaiting result', 'Väntar på resultat')}
              value={String(summary.awaiting)}
              muted={summary.awaiting === 0}
            />
            <StatTile
              label={tr('Fulfilled', 'Uppfyllda')}
              value={String(summary.fulfilled)}
              muted={summary.fulfilled === 0}
            />
            <StatTile label={tr('Failed', 'Misslyckade')} value={String(summary.failed)} muted={summary.failed === 0} />
          </div>

          {/* Only when nothing is open. The point is to answer "so when can I
              bid again?" rather than leaving the player on an empty table. */}
          {summary.open === 0 && (
            <p className="mt-4 bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-3 text-sm text-orange-100">
              {tr('No auctions open right now — the next contracts are built', 'Inga auktioner är öppna just nu — nästa kontrakt skapas')}{' '}
              <span className="font-bold text-brand-300">
                {formatContractRun(nextContractRun(), locale)}
              </span>
              .
            </p>
          )}
        </div>
      )}

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
        <p className="text-white/50 py-16 text-center">{tr('Loading contracts…', 'Laddar kontrakt…')}</p>
      ) : contracts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30 mb-4">{tr('No contracts match this filter.', 'Inga kontrakt matchar filtret.')}</p>
          <button
            onClick={clearFilters}
            className="text-brand-400 hover:text-brand-300 text-sm font-bold uppercase tracking-wide transition-colors"
          >
            {tr('Clear filters', 'Rensa filter')}
          </button>
        </div>
      ) : (
        <>
          <ContractTable contracts={contracts} />

          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <p className="text-white/25 text-xs tabular">
              {tr('Showing', 'Visar')} {firstShown}–{lastShown} {tr('of', 'av')} {total}
            </p>
            {lastPage > 1 && (
              <div className="flex items-center gap-2">
                <PageButton onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  {tr('← Prev', '← Föregående')}
                </PageButton>
                <span className="text-white/30 text-xs tabular px-1">
                  {page} / {lastPage}
                </span>
                <PageButton onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage}>
                  {tr('Next →', 'Nästa →')}
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
  const { locale, tr } = useI18n();
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="px-2 sm:px-4 py-3 font-medium">{tr('Team', 'Lag')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium hidden sm:table-cell">{tr('League', 'Liga')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium">{tr('Pattern', 'Mönster')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium hidden sm:table-cell">{tr('Status', 'Status')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium tabular hidden lg:table-cell">{tr('Coupons', 'Kuponger')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium tabular hidden lg:table-cell">{tr('Bids', 'Bud')}</th>
            <th className="px-2 sm:px-4 py-3 font-medium">{tr('When', 'När')}</th>
            <th className="px-2 sm:px-4 py-3 hidden sm:table-cell" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => {
            const style = statusStyle(c.status, tr);
            return (
              <tr
                key={c.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                {/* The stripe carries the league on narrow screens, where the
                    League column below is hidden. */}
                <td
                  className={`px-2 sm:px-4 py-3 font-semibold text-orange-100 border-l-2 ${leagueStyle(c.team.league).stripe}`}
                >
                  {/* The name is the link, so the row still leads somewhere on a
                      phone, where the "View" column is hidden. */}
                  <Link
                    href={`/contracts/${c.id}`}
                    className="inline-flex items-center gap-2 hover:text-brand-400 transition-colors"
                  >
                    <TeamLogo externalId={c.team.externalId} />
                    {formatTeamName(c.team.name)}
                  </Link>
                </td>
                <td className="px-2 sm:px-4 py-3 hidden sm:table-cell">
                  <LeagueBadge league={c.team.league} />
                </td>
                <td className="px-2 sm:px-4 py-3">
                  <span className="font-mono font-bold text-brand-400">{c.pattern}</span>
                  <span className="text-white/30 ml-2 hidden lg:inline text-xs">
                    {patternLabel(c.pattern, locale)}
                  </span>
                </td>
                <td className={`px-2 sm:px-4 py-3 font-semibold hidden sm:table-cell ${style.className}`}>
                  {style.label}
                </td>
                <td className="px-2 sm:px-4 py-3 tabular text-white/60 hidden lg:table-cell">
                  {c.couponCount}
                </td>
                {/* Demand, read against the coupon supply in the column before it. */}
                <td className="px-2 sm:px-4 py-3 tabular text-white/60 hidden lg:table-cell">
                  {c.auction?.bidCount ?? '—'}
                </td>
                <td className="px-2 sm:px-4 py-3 tabular text-white/40 whitespace-nowrap">
                  {c.status === 'ACTIVE' && c.auction && !c.auction.closed ? (
                    <span className="text-brand-400 font-semibold">
                      {timeRemaining(c.auction.endsAt, tr)}
                    </span>
                  ) : c.resolvedAt ? (
                    formatDay(c.resolvedAt, locale)
                  ) : (
                    formatDay(c.createdAt, locale)
                  )}
                </td>
                <td className="px-2 sm:px-4 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                  <Link
                    href={`/contracts/${c.id}`}
                    className="text-brand-400 hover:text-brand-300 font-bold text-xs uppercase tracking-wide transition-colors"
                  >
                    {tr('View →', 'Visa →')}
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
