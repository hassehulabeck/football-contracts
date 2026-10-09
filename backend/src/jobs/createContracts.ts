import { PrismaClient, ContractPattern, League } from '@prisma/client';
import {
  DEFAULT_LEAGUE_CONFIG,
  couponCountFor,
  isInSeason,
  pickTeams,
  type LeagueBatchConfig,
} from '../lib/contractBatch';
import { seasonEndFor } from '../lib/season';

const prisma = new PrismaClient();
// Every ordered combination of three results (27) can be drawn. The classic
// patterns are weighted up; anything not listed here has weight 1.
// With these weights: WWW/LLL ≈ 10.8% each, WDL/LDW ≈ 8.1%, the rest ≈ 2.7%.
const PATTERN_WEIGHTS: Partial<Record<ContractPattern, number>> = {
  WWW: 4,
  LLL: 4,
  WDL: 3,
  LDW: 3,
};
const PATTERNS = Object.values(ContractPattern);
const TOTAL_WEIGHT = PATTERNS.reduce((sum, p) => sum + (PATTERN_WEIGHTS[p] ?? 1), 0);

/** Weighted draw over all patterns. `random` is injectable for testing. */
export function pickPattern(random: () => number = Math.random): ContractPattern {
  let roll = random() * TOTAL_WEIGHT;
  for (const pattern of PATTERNS) {
    roll -= PATTERN_WEIGHTS[pattern] ?? 1;
    if (roll < 0) return pattern;
  }
  return PATTERNS[PATTERNS.length - 1];
}
const AUCTION_HOURS = 48;

export type CreateContractsOptions = {
  /** Contracts per enabled league, overriding LeagueConfig. For seeding test batches. */
  perLeague?: number;
  /** Auction duration in hours. Shorten it to watch a full cycle on demand. */
  auctionHours?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
};

export type LeagueBatchResult = { league: League; created: number; couponCount: number };

/** Upcoming scheduled kickoffs per team id, from the daily-refreshed Fixture table. */
async function upcomingKickoffs(now: Date): Promise<Map<string, Date[]>> {
  const fixtures = await prisma.fixture.findMany({
    where: { status: 'SCHEDULED', kickoffAt: { gt: now } },
    select: { teamId: true, kickoffAt: true },
  });
  const byTeam = new Map<string, Date[]>();
  for (const f of fixtures) {
    const list = byTeam.get(f.teamId);
    if (list) list.push(f.kickoffAt);
    else byTeam.set(f.teamId, [f.kickoffAt]);
  }
  return byTeam;
}

/** The admin-edited rows, or the defaults if the table was never seeded. */
export async function loadLeagueConfig(db: PrismaClient = prisma): Promise<LeagueBatchConfig[]> {
  const rows = await db.leagueConfig.findMany({ orderBy: { league: 'asc' } });
  return rows.length > 0 ? rows : DEFAULT_LEAGUE_CONFIG;
}

export async function createWeeklyContracts(opts: CreateContractsOptions = {}) {
  const auctionHours = opts.auctionHours ?? AUCTION_HOURS;
  const dryRun = opts.dryRun ?? false;
  const log = opts.log ?? ((msg: string) => console.log(`[createContracts] ${msg}`));

  log('Starting contract generation');

  const teams = await prisma.team.findMany();
  if (teams.length === 0) {
    log('No teams in database — skipping');
    return { created: 0, leagues: [] as LeagueBatchResult[], auctionEnd: null as Date | null, contractIds: [] as string[] };
  }

  const config = await loadLeagueConfig();
  const players = await prisma.user.count({ where: { emailVerified: true } });
  const now = new Date();
  const auctionEnd = new Date(now.getTime() + auctionHours * 60 * 60 * 1000);
  const kickoffs = await upcomingKickoffs(now);
  if (kickoffs.size === 0) {
    // Every league out of season looks the same as a fixture table that was
    // never filled. Say so, rather than letting a week pass silently empty.
    log('No upcoming fixtures for any team — is refreshFixtures running?');
  }

  const leagues: LeagueBatchResult[] = [];
  const contractIds: string[] = [];
  let created = 0;
  for (const cfg of config) {
    if (!cfg.enabled) {
      log(`[${cfg.league}] disabled — skipping`);
      continue;
    }

    // Off-season, or too late in the season for three more matches: no
    // contract a player could win. Judged per team, so a league winding down
    // keeps offering the clubs that still have games and stops on its own.
    const seasonEnd = seasonEndFor(cfg.league, now);
    const eligible = teams.filter(
      (t) => t.league === cfg.league && isInSeason(kickoffs.get(t.id) ?? [], now, seasonEnd),
    );
    if (eligible.length === 0) {
      log(`[${cfg.league}] out of season — no team has a match within reach, skipping`);
      continue;
    }

    const couponCount = couponCountFor(players, cfg);
    const picks = pickTeams(eligible, opts.perLeague ?? cfg.contractsPerWeek);

    for (const team of picks) {
      const pattern = pickPattern();

      if (dryRun) {
        log(`[DRY] would create ${team.name} (${pattern}), ${couponCount} coupons`);
        continue;
      }

      const contract = await prisma.contract.create({
        data: {
          teamId: team.id,
          pattern,
          status: 'ACTIVE',
          couponCount,
          coupons: { create: Array.from({ length: couponCount }, () => ({})) },
          auction: { create: { endsAt: auctionEnd } },
        },
      });
      contractIds.push(contract.id);
      log(`Created contract ${contract.id} for ${team.name} (${pattern})`);
    }

    leagues.push({ league: cfg.league, created: picks.length, couponCount });
    created += picks.length;
  }

  log(
    `Done — ${created} contracts for ${players} activated players ` +
      `(${leagues.map((l) => `${l.league} ${l.created}×${l.couponCount}`).join(', ')}), ` +
      `auction ends ${auctionEnd.toISOString()}`,
  );

  return { created, leagues, auctionEnd, contractIds };
}
