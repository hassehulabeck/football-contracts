/**
 * Which season a league is in, and when that season is over.
 *
 * The Swedish leagues play inside one calendar year (roughly April–November),
 * so their api-football season number is the year itself. The Championship
 * plays August–May and api-football numbers it by the year it starts: the
 * 2026 season runs 2026-08 → 2027-05. A single `getUTCFullYear()` for every
 * league was wrong for it twice over — from January it asked for the wrong
 * season, and the shared Nov 30 cutoff failed its contracts mid-season.
 *
 * Kept pure so the cron, the ingest scripts and the contract page all agree on
 * one answer. The frontend rules page repeats the two end dates in prose;
 * change them together.
 */
import { League } from '@prisma/client';

interface SeasonShape {
  /** 0-based UTC month a new season number starts from. 0 = calendar year. */
  rolloverMonth: number;
  /** Last day contracts can still be fulfilled, as month (0-based) and day. */
  endMonth: number;
  endDay: number;
  /** The end falls in the year after the season number, not the same one. */
  endsNextYear: boolean;
}

// Nov 30 clears every Swedish final round (Allsvenskan's 2026 finale is 11-29).
const CALENDAR_YEAR: SeasonShape = { rolloverMonth: 0, endMonth: 10, endDay: 30, endsNextYear: false };

// May 31 rather than the last regular round (2027-05-01) so the play-offs,
// which api-football files under the same league id, still count. July is the
// rollover: after the play-off final, before the August opener.
const AUGUST_TO_MAY: SeasonShape = { rolloverMonth: 6, endMonth: 4, endDay: 31, endsNextYear: true };

const SHAPES: Record<League, SeasonShape> = {
  ALLSVENSKAN: CALENDAR_YEAR,
  SUPERETTAN: CALENDAR_YEAR,
  DAMALLSVENSKAN: CALENDAR_YEAR,
  ELITETTAN: CALENDAR_YEAR,
  CHAMPIONSHIP: AUGUST_TO_MAY,
};

/** The api-football `season` parameter for `league` at instant `at`. */
export function seasonFor(league: League, at: Date): number {
  const year = at.getUTCFullYear();
  return at.getUTCMonth() >= SHAPES[league].rolloverMonth ? year : year - 1;
}

/** The last instant of `season` in `league`. */
export function seasonEnd(league: League, season: number): Date {
  const s = SHAPES[league];
  const year = s.endsNextYear ? season + 1 : season;
  return new Date(Date.UTC(year, s.endMonth, s.endDay, 23, 59, 59));
}

/**
 * When a contract created at `createdAt` stops being able to come true.
 *
 * Measured from the contract's own season rather than from today's, so a
 * Championship contract made in October still runs to the May after it.
 */
export function seasonEndFor(league: League, createdAt: Date): Date {
  return seasonEnd(league, seasonFor(league, createdAt));
}
