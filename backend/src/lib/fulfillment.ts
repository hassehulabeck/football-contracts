/**
 * Deciding whether a run of results completes a contract pattern.
 *
 * This lives on its own because two callers need the *same* answer: the cron
 * job that pays coupons out, and the contract detail endpoint that shows which
 * three matches did it. If those drifted apart the page would credit a
 * different set of matches than the job actually paid on.
 */
import { ContractPattern } from '@prisma/client';

/** The fields the window search needs — any Match row satisfies this. */
export interface ResultBearing {
  result: string; // "W", "D" or "L"
}

/**
 * First run of three consecutive results matching `pattern`, or null.
 *
 * `matches` must already be ordered by `playedAt` ascending and restricted to
 * matches played after the contract was created. Ordering is by date played
 * rather than league round on purpose: Swedish fixtures are moved often enough
 * that a postponed round-19 match can be played while the league is on round 7,
 * and it counts where it was actually played.
 */
export function findPatternWindow<T extends ResultBearing>(
  matches: T[],
  pattern: ContractPattern | string,
): T[] | null {
  for (let i = 0; i + 3 <= matches.length; i++) {
    const window = matches[i].result + matches[i + 1].result + matches[i + 2].result;
    if (window === pattern) return [matches[i], matches[i + 1], matches[i + 2]];
  }
  return null;
}
