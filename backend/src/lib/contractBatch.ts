/**
 * The arithmetic of a weekly batch, kept free of Prisma so it can be checked
 * without a database: how many coupons a contract gets, and which teams a
 * league's contracts go to.
 */
import type { League } from '@prisma/client';

export interface CouponRule {
  couponRatio: number;
  couponMin: number;
  couponMax: number;
}

export interface LeagueBatchConfig extends CouponRule {
  league: League;
  enabled: boolean;
  contractsPerWeek: number;
}

/**
 * Used when the LeagueConfig table is empty, so a missing seed degrades to the
 * old behaviour instead of a silent week with no contracts. Keep in step with
 * the seed in the 20261008140000_admin_and_league_config migration.
 */
export const DEFAULT_LEAGUE_CONFIG: LeagueBatchConfig[] = [
  { league: 'ALLSVENSKAN', contractsPerWeek: 7 },
  { league: 'SUPERETTAN', contractsPerWeek: 7 },
  { league: 'DAMALLSVENSKAN', contractsPerWeek: 6 },
  { league: 'ELITETTAN', contractsPerWeek: 5 },
  { league: 'CHAMPIONSHIP', contractsPerWeek: 10 },
].map((c) => ({ ...c, league: c.league as League, enabled: true, couponRatio: 0.1, couponMin: 5, couponMax: 100 }));

/**
 * Coupons per contract: a share of the activated players, clamped. Replaces a
 * flat 5 that jumped to 10% at 51 players — this grows smoothly from the floor.
 */
export function couponCountFor(players: number, rule: CouponRule): number {
  const raw = Math.round(players * rule.couponRatio);
  return Math.min(rule.couponMax, Math.max(rule.couponMin, raw));
}

/**
 * `count` teams drawn without replacement, so a batch does not hand one club two
 * contracts while others get none. Only when a league has fewer teams than
 * contracts does a team come round again, and then every team has had one first.
 */
export function pickTeams<T>(teams: T[], count: number, random: () => number = Math.random): T[] {
  const picked: T[] = [];
  let pool: T[] = [];
  while (picked.length < count && teams.length > 0) {
    if (pool.length === 0) pool = [...teams];
    const i = Math.floor(random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
