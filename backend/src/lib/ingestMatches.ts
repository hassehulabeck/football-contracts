/**
 * Ingests finished league fixtures into the Match table.
 *
 * One request per league covers every tracked team in it, because both clubs in
 * a Swedish league match are teams we follow. Four requests replace the sixty
 * the per-team version used to make, so this can run often enough to keep payout
 * latency low instead of being rationed against the daily API quota.
 *
 * A fixture yields one Match row per side that we track — the same fixture id
 * appears twice, once from each team's perspective. `Match` is unique on
 * (externalId, teamId) for exactly this reason.
 */
import { PrismaClient, League } from '@prisma/client';
import { fetchLeagueFixtures, LEAGUE_IDS, ApiFixture } from './footballApi';

const LEAGUE_ENUM_TO_ID: Record<League, number> = {
  ALLSVENSKAN: LEAGUE_IDS.ALLSVENSKAN,
  SUPERETTAN: LEAGUE_IDS.SUPERETTAN,
  DAMALLSVENSKAN: LEAGUE_IDS.DAMALLSVENSKAN,
  ELITETTAN: LEAGUE_IDS.ELITETTAN,
};

export type IngestOptions = {
  season?: number;
  /** Inclusive date window, YYYY-MM-DD. Omit both for the whole season. */
  from?: string;
  to?: string;
  dryRun?: boolean;
  /** Defaults to console.log; the cron job prefixes its own tag. */
  log?: (msg: string) => void;
};

export type IngestResult = {
  fixtures: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Fixtures whose clubs are in a tracked league but have no Team row. */
  skippedUnknownTeams: number;
};

export function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** W/D/L from `teamIsHome`'s perspective, derived from the score line. */
export function resultFor(homeScore: number, awayScore: number, teamIsHome: boolean): string {
  if (homeScore === awayScore) return 'D';
  const homeWon = homeScore > awayScore;
  return homeWon === teamIsHome ? 'W' : 'L';
}

export async function ingestMatches(
  prisma: PrismaClient,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const season = opts.season ?? new Date().getUTCFullYear();
  const log = opts.log ?? console.log;
  const dryRun = opts.dryRun ?? false;

  const teams = await prisma.team.findMany({ select: { id: true, externalId: true, name: true } });
  const teamByExternalId = new Map(teams.map((t) => [t.externalId, t]));

  const result: IngestResult = {
    fixtures: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedUnknownTeams: 0,
  };

  for (const [league, leagueId] of Object.entries(LEAGUE_ENUM_TO_ID) as [League, number][]) {
    let fixtures: ApiFixture[];
    try {
      fixtures = await fetchLeagueFixtures(leagueId, season, opts.from, opts.to);
    } catch (err) {
      // One league failing must not abort the others, and must not be mistaken
      // for "no matches played" — contracts on the other three still resolve.
      log(`  [${league}] FETCH FAILED — ${(err as Error).message}`);
      continue;
    }

    log(`  [${league}] league=${leagueId} → ${fixtures.length} finished fixtures`);
    result.fixtures += fixtures.length;

    for (const f of fixtures) {
      const { home, away } = f.teams;
      const homeScore = f.goals.home;
      const awayScore = f.goals.away;

      // A fixture marked FT without a score line is malformed; skip rather than
      // write a 0-0 draw that could complete a DDD pattern.
      if (homeScore === null || awayScore === null) {
        log(`    [SKIP] fixture ${f.fixture.id} is FT but has no score`);
        continue;
      }

      const playedAt = new Date(f.fixture.date);

      for (const [side, apiTeam] of [['home', home], ['away', away]] as const) {
        const team = teamByExternalId.get(apiTeam.id);
        if (!team) {
          result.skippedUnknownTeams++;
          log(`    [SKIP] ${apiTeam.name} (${apiTeam.id}) has no Team row — run sync:teams`);
          continue;
        }

        const isHome = side === 'home';
        const res = resultFor(homeScore, awayScore, isHome);

        const existing = await prisma.match.findUnique({
          where: { externalId_teamId: { externalId: f.fixture.id, teamId: team.id } },
        });

        if (existing) {
          const changed =
            existing.result !== res ||
            existing.homeScore !== homeScore ||
            existing.awayScore !== awayScore ||
            existing.isHome !== isHome ||
            existing.playedAt.getTime() !== playedAt.getTime();

          if (!changed) {
            result.unchanged++;
            continue;
          }

          result.updated++;
          log(
            `    [UPDATE] ${team.name} fixture=${f.fixture.id} ${homeScore}-${awayScore} → ${res}` +
              (existing.result !== res ? ` (was ${existing.result})` : ''),
          );
          if (!dryRun) {
            await prisma.match.update({
              where: { id: existing.id },
              data: { result: res, homeScore, awayScore, isHome, playedAt },
            });
          }
        } else {
          result.created++;
          log(`    [CREATE] ${team.name} fixture=${f.fixture.id} ${homeScore}-${awayScore} → ${res}`);
          if (!dryRun) {
            await prisma.match.create({
              data: {
                externalId: f.fixture.id,
                teamId: team.id,
                result: res,
                homeScore,
                awayScore,
                isHome,
                playedAt,
              },
            });
          }
        }
      }
    }
  }

  return result;
}
