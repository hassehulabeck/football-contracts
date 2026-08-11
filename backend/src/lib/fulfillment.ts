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

/** How much of a pattern the team's current run has produced. */
export interface PatternProgress<T> {
  /** Leading pattern letters the run has produced. 0 when there is no run. */
  matched: number;
  /** The matches making up the run, oldest first. `matched` of them. */
  matches: T[];
  /** The whole pattern is accounted for — this contract is payable. */
  complete: boolean;
}

/**
 * How far a team has got through a pattern, for showing progress mid-contract.
 *
 * `findPatternWindow` answers only "did a full run ever happen", which is all a
 * payout needs. This answers "how far along is the team right now", which is
 * what someone holding a coupon wants to see before the third match is played.
 *
 * Completion is delegated to `findPatternWindow` rather than re-decided here, so
 * a page showing a full run can never contradict the job that pays it out.
 *
 * The live run is the longest tail of results that is still a prefix of the
 * pattern. Deriving it from the tail rather than counting forward is what makes
 * a broken run reset correctly: after W-W-L on WWW nothing is left, but the L in
 * L-D-L on LDW is a fresh first letter, not a wasted one.
 *
 * `matches` must be ordered by `playedAt` ascending and restricted to matches
 * played after the contract was created — same input as `findPatternWindow`.
 */
export function patternProgress<T extends ResultBearing>(
  matches: T[],
  pattern: ContractPattern | string,
): PatternProgress<T> {
  const window = findPatternWindow(matches, pattern);
  if (window) return { matched: pattern.length, matches: window, complete: true };

  // Longest tail first: a two-match run must not report as one just because the
  // shorter tail also happens to be a prefix. Capped one below the full length
  // because findPatternWindow already ruled a complete run out.
  const longest = Math.min(pattern.length - 1, matches.length);
  for (let len = longest; len > 0; len--) {
    const tail = matches.slice(matches.length - len);
    if (tail.map((m) => m.result).join('') === pattern.slice(0, len)) {
      return { matched: len, matches: tail, complete: false };
    }
  }

  return { matched: 0, matches: [], complete: false };
}
