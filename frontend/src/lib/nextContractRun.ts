/**
 * When the next batch of contracts is built.
 *
 * The schedule is fixed in code, not published by the API: `0 3 * * 3` in
 * Europe/Stockholm in `backend/src/jobs/index.ts`. Mirrored here rather than
 * parsed, because one weekly cron does not justify a cron library — but it is a
 * mirror, so if that schedule moves, this has to move with it.
 *
 * Resolved through the zone rather than a fixed UTC hour. 03:00 Swedish time is
 * 01:00 UTC under CEST and 02:00 UTC under CET, and the season spans both, so a
 * hardcoded UTC hour would be an hour wrong for half of it.
 */
const RUN_WEEKDAY = 3; // Wednesday
const RUN_HOUR = 3; // 03:00, Swedish local time
const ZONE = 'Europe/Stockholm';

const ZONE_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** The wall-clock reading a Stockholm clock shows at this instant. */
function wallClockIn(instant: Date) {
  const parts: Record<string, number> = {};
  for (const p of ZONE_PARTS.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  // 'en-GB' with hour12: false renders midnight as 24, which Date.UTC would
  // roll into the next day.
  return { ...parts, hour: parts.hour % 24 } as Record<string, number>;
}

/** How far ahead of UTC Stockholm is at this instant, in milliseconds. */
function zoneOffsetMs(instant: Date): number {
  const w = wallClockIn(instant);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - instant.getTime();
}

/**
 * The instant at which Stockholm clocks read this wall-clock time.
 *
 * Guesses by treating the wall time as UTC, then subtracts the offset in force
 * there. The offset is re-read at the corrected instant because the first guess
 * can land on the wrong side of a DST switch; one correction is enough, since
 * the switch itself is an hour and the guess is never further out than that.
 */
function instantOfWallClock(year: number, month: number, day: number, hour: number): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour);
  const firstPass = asIfUtc - zoneOffsetMs(new Date(asIfUtc));
  return new Date(asIfUtc - zoneOffsetMs(new Date(firstPass)));
}

export function nextContractRun(now: Date = new Date()): Date {
  const today = wallClockIn(now);

  // A cursor over Stockholm calendar dates, held at UTC midnight purely so
  // getUTCDay() and the day-stepping are calendar arithmetic and nothing else.
  const cursor = new Date(Date.UTC(today.year, today.month - 1, today.day));

  // Two weeks of slack for a search that needs at most eight days.
  for (let i = 0; i < 15; i++) {
    if (cursor.getUTCDay() === RUN_WEEKDAY) {
      const run = instantOfWallClock(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth() + 1,
        cursor.getUTCDate(),
        RUN_HOUR,
      );
      // Today's run counts only if it has not already fired.
      if (run > now) return run;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Unreachable: a Wednesday always falls inside any 15-day window.
  throw new Error('No contract run found within two weeks');
}

/**
 * Rendered in the reader's own timezone — a Swedish player sees the 03:00 the
 * rules page promises. Same `sv-SE` convention as the dates in the tables.
 */
export function formatContractRun(run: Date): string {
  return run.toLocaleString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
