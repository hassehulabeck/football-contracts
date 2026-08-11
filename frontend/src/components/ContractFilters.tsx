'use client';

import { LEAGUES, LEAGUE_LOGO, LEAGUE_ORDER, leagueStyle } from '@/lib/leagues';
import { formatTeamName } from '@/lib/formatTeamName';
import type { League, StatusFilter, Team } from '@/types/api';

export type LeagueFilter = League | 'ALL';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Auction open' },
  { value: 'awaiting', label: 'Awaiting result' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'failed', label: 'Failed' },
  { value: 'all', label: 'All contracts' },
];

interface ContractFiltersProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  league: LeagueFilter;
  onLeagueChange: (league: LeagueFilter) => void;
  teamId: string | 'ALL';
  onTeamChange: (teamId: string | 'ALL') => void;
  /** From /api/teams, already scoped to the chosen league. */
  teams: Team[];
}

/** Teams bucketed by league, in the site's league order. Empty buckets dropped. */
function teamsByLeague(teams: Team[]): [League, Team[]][] {
  return LEAGUE_ORDER.map(
    (league) => [league, teams.filter((t) => t.league === league)] as [League, Team[]],
  ).filter(([, leagueTeams]) => leagueTeams.length > 0);
}

export function ContractFilters({
  status,
  onStatusChange,
  league,
  onLeagueChange,
  teamId,
  onTeamChange,
  teams,
}: ContractFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onLeagueChange('ALL')}
          className={`border rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            league === 'ALL'
              ? 'bg-brand-500/20 border-brand-500 text-brand-300'
              : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'
          }`}
        >
          All leagues
        </button>

        {LEAGUE_ORDER.map((key) => {
          const style = LEAGUES[key];
          const active = league === key;
          return (
            <button
              key={key}
              onClick={() => onLeagueChange(key)}
              className={`inline-flex items-center gap-1.5 border rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? style.filterActive
                  : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'
              }`}
            >
              {/* The crest replaces the coloured dot, as in LeagueBadge. It
                  cannot carry the active state the way a tinted dot did, so an
                  unselected league dims its logo instead — the pill's own
                  border and text colour still say which one is on. */}
              <img
                src={LEAGUE_LOGO[key]}
                alt=""
                aria-hidden="true"
                className={`w-3.5 h-3.5 object-contain shrink-0 transition-opacity ${
                  active ? 'opacity-100' : 'opacity-50'
                }`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {style.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-xs text-white/40">
          <span className="uppercase tracking-widest">Status</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-orange-100 focus:outline-none focus:border-brand-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-white/40">
          <span className="uppercase tracking-widest">Team</span>
          <select
            value={teamId}
            onChange={(e) => onTeamChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-orange-100 focus:outline-none focus:border-brand-500 max-w-[14rem]"
          >
            <option value="ALL">All teams</option>
            {/* Grouped by league, not a flat list. Dropping the " W" suffix
                leaves a women's club sharing its men's club's name — Sandviken
                is in both Superettan and Elitettan — and an <option> cannot
                carry the badge that tells them apart everywhere else. The group
                heading does that job. */}
            {teamsByLeague(teams).map(([league, leagueTeams]) => (
              <optgroup key={league} label={leagueStyle(league).label}>
                {leagueTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {formatTeamName(team.name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
