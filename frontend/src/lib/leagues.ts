import type { League } from '@/types/api';

export interface LeagueStyle {
  /** Full league name, as printed on the site. */
  label: string;
  /** Abbreviated name for narrow columns and badges. */
  short: string;
  /** Text colour for the league name on the dark background. */
  text: string;
  /** Tinted pill: background, border and text together. */
  badge: string;
  /** Coloured left edge on a table row. */
  stripe: string;
  /** Solid dot, used inside badges and the filter buttons. */
  dot: string;
  /** Active state for a filter button. */
  filterActive: string;
}

/**
 * Every class string here is written out in full and never composed from a
 * template literal. Tailwind generates CSS by scanning source text, so an
 * interpolated name like `border-league-${key}` produces no rule at all — it
 * looks fine in dev and the colour silently vanishes from the production build.
 */
export const LEAGUES: Record<League, LeagueStyle> = {
  ALLSVENSKAN: {
    label: 'Allsvenskan',
    short: 'Allsv.',
    text: 'text-league-allsvenskan-accent',
    badge:
      'bg-league-allsvenskan/15 border-league-allsvenskan/40 text-league-allsvenskan-accent',
    stripe: 'border-l-league-allsvenskan',
    dot: 'bg-league-allsvenskan-accent',
    filterActive:
      'bg-league-allsvenskan/20 border-league-allsvenskan text-league-allsvenskan-accent',
  },
  SUPERETTAN: {
    label: 'Superettan',
    short: 'Superett.',
    text: 'text-league-superettan-accent',
    badge:
      'bg-league-superettan/15 border-league-superettan/40 text-league-superettan-accent',
    stripe: 'border-l-league-superettan',
    dot: 'bg-league-superettan-accent',
    filterActive:
      'bg-league-superettan/20 border-league-superettan text-league-superettan-accent',
  },
  DAMALLSVENSKAN: {
    label: 'Damallsvenskan',
    short: 'Damallsv.',
    text: 'text-league-damallsvenskan-accent',
    badge:
      'bg-league-damallsvenskan/15 border-league-damallsvenskan/40 text-league-damallsvenskan-accent',
    stripe: 'border-l-league-damallsvenskan',
    dot: 'bg-league-damallsvenskan-accent',
    filterActive:
      'bg-league-damallsvenskan/20 border-league-damallsvenskan text-league-damallsvenskan-accent',
  },
  ELITETTAN: {
    label: 'Elitettan',
    short: 'Elitett.',
    text: 'text-league-elitettan-accent',
    badge:
      'bg-league-elitettan/15 border-league-elitettan/40 text-league-elitettan-accent',
    stripe: 'border-l-league-elitettan',
    dot: 'bg-league-elitettan-accent',
    filterActive:
      'bg-league-elitettan/20 border-league-elitettan text-league-elitettan-accent',
  },
};

/**
 * League crests, from api-football's public media CDN.
 *
 * Keyed by the same league IDs the backend syncs with (`LEAGUE_IDS` in
 * `backend/src/lib/footballApi.ts`) — hardcoded here rather than fetched,
 * because four static URLs are not worth an endpoint or a schema column.
 */
export const LEAGUE_LOGO: Record<League, string> = {
  ALLSVENSKAN: 'https://media.api-sports.io/football/leagues/113.png',
  SUPERETTAN: 'https://media.api-sports.io/football/leagues/114.png',
  DAMALLSVENSKAN: 'https://media.api-sports.io/football/leagues/549.png',
  ELITETTAN: 'https://media.api-sports.io/football/leagues/736.png',
};

/** Display order — men's top flight first, then the tiers below it. */
export const LEAGUE_ORDER: League[] = [
  'ALLSVENSKAN',
  'SUPERETTAN',
  'DAMALLSVENSKAN',
  'ELITETTAN',
];

/**
 * Leagues arrive from the API as strings, so a value outside the enum is
 * possible. Fall back to a neutral grey rather than crashing a whole table.
 */
const UNKNOWN: LeagueStyle = {
  label: 'Unknown league',
  short: '—',
  text: 'text-white/40',
  badge: 'bg-white/5 border-white/10 text-white/40',
  stripe: 'border-l-white/20',
  dot: 'bg-white/30',
  filterActive: 'bg-white/10 border-white/30 text-white/60',
};

export function leagueStyle(league: string): LeagueStyle {
  return LEAGUES[league as League] ?? UNKNOWN;
}
