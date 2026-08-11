/**
 * When the next batch of contracts is built.
 *
 * The schedule is fixed in code, not published by the API: `0 2 * * 3` UTC in
 * `backend/src/jobs/index.ts` — Wednesday 03:00 Swedish time. Computed here
 * rather than parsed, because one weekly cron does not justify a cron library;
 * if that schedule ever moves, this has to move with it.
 */
const RUN_WEEKDAY = 3; // Wednesday, UTC
const RUN_HOUR_UTC = 2;

export function nextContractRun(now: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_HOUR_UTC, 0, 0, 0),
  );

  // Steps a day at a time, keeping the 02:00 UTC time, so it lands on the first
  // Wednesday run still ahead of `now` — today's run counts only if it has not
  // already fired.
  while (next.getUTCDay() !== RUN_WEEKDAY || next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
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
