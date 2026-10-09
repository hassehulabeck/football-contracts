/**
 * Calendar months as a Swedish player reads them: October starts at midnight
 * on 1 October in Stockholm, not in UTC. Used by the monthly leaderboard.
 */
const ZONE = 'Europe/Stockholm';

const PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** How far ahead of UTC Stockholm is at this instant, in milliseconds. */
function zoneOffsetMs(instant: Date): number {
  const p: Record<string, number> = {};
  for (const part of PARTS.formatToParts(instant)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The first instant of a Stockholm month. Reading the offset at UTC midnight
 * of the 1st is safe because Sweden never changes clocks on the 1st — the
 * switches fall on the last Sunday of March and October.
 */
function monthStart(year: number, month: number): Date {
  const utcMidnight = new Date(Date.UTC(year, month - 1, 1));
  return new Date(utcMidnight.getTime() - zoneOffsetMs(utcMidnight));
}

/** "2026-10" → [start, end) of that month in Stockholm, as UTC instants. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number);
  return { start: monthStart(year, m), end: monthStart(m === 12 ? year + 1 : year, m === 12 ? 1 : m + 1) };
}

/** The current month in Stockholm, as "YYYY-MM". */
export function currentMonth(now = new Date()): string {
  const local = new Date(now.getTime() + zoneOffsetMs(now));
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}
