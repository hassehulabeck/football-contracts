'use client';

import { LEAGUES, LEAGUE_ORDER } from '@/lib/leagues';
import type { League, Team } from '@/types/api';

export type LeagueFilter = League | 'ALL';

interface ContractFiltersProps {
  league: LeagueFilter;
  onLeagueChange: (league: LeagueFilter) => void;
  teamId: string | 'ALL';
  onTeamChange: (teamId: string | 'ALL') => void;
  /** Teams that actually have contracts, already scoped to the chosen league. */
  teams: Team[];
}

export function ContractFilters({
  league,
  onLeagueChange,
  teamId,
  onTeamChange,
  teams,
}: ContractFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
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
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  active ? style.dot : 'bg-white/25'
                }`}
                aria-hidden="true"
              />
              {style.label}
            </button>
          );
        })}
      </div>

      <label className="sm:ml-auto flex items-center gap-2 text-xs text-white/40">
        <span className="uppercase tracking-widest">Team</span>
        <select
          value={teamId}
          onChange={(e) => onTeamChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-orange-100 focus:outline-none focus:border-brand-500 max-w-[14rem]"
        >
          <option value="ALL">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
