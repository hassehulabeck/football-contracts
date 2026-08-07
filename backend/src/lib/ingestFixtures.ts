/**
 * Ingests not-yet-played league fixtures into the Fixture table.
 *
 * The mirror of ingestMatches: same per-league fetch (four requests cover every
 * tracked team), same one-row-per-tracked-side write, same
 * (externalId, teamId) key. What differs is that there is no result to record
 * and no score to guard against — these fixtures have not kicked off.
 *
 * Runs weekly rather than every few hours. A schedule moves on the scale of
 * days, and api-football offers no push notification for a reschedule, so
 * there is nothing to react to between polls.
 */
import { PrismaClient, League, FixtureStatus } from '@prisma/client';
import { fetchUpcomingLeagueFixtures, LEAGUE_IDS, ApiFixture } from './footballApi';

const LEAGUE_ENUM_TO_ID: Record<League, number> = {
  ALLSVENSKAN: LEAGUE_IDS.ALLSVENSKAN,
  SUPERETTAN: LEAGUE_IDS.SUPERETTAN,
  DAMALLSVENSKAN: LEAGUE_IDS.DAMALLSVENSKAN,
  ELITETTAN: LEAGUE_IDS.ELITETTAN,
};

/** api-football short codes, mapped onto the three states the UI distinguishes. */
const STATUS_BY_SHORT_CODE: Record<string, FixtureStatus> = {
  NS: 'SCHEDULED',
  TBD: 'SCHEDULED',
  PST: 'POSTPONED',
  CANC: 'CANCELLED',
};

export type IngestFixturesOptions = {
  season?: number;
  /** Inclusive date window, YYYY-MM-DD. Omit both for the rest of the season. */
  from?: string;
  to?: string;
  dryRun?: boolean;
  /** Defaults to console.log; the cron job prefixes its own tag. */
  log?: (msg: string) => void;
};

export type IngestFixturesResult = {
  fixtures: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Fixtures whose clubs are in a tracked league but have no Team row. */
  skippedUnknownTeams: number;
};

export async function ingestFixtures(
  prisma: PrismaClient,
  opts: IngestFixturesOptions = {},
): Promise<IngestFixturesResult> {
  const season = opts.season ?? new Date().getUTCFullYear();
  const log = opts.log ?? console.log;
  const dryRun = opts.dryRun ?? false;

  const teams = await prisma.team.findMany({ select: { id: true, externalId: true, name: true } });
  const teamByExternalId = new Map(teams.map((t) => [t.externalId, t]));

  const result: IngestFixturesResult = {
    fixtures: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skippedUnknownTeams: 0,
  };

  for (const [league, leagueId] of Object.entries(LEAGUE_ENUM_TO_ID) as [League, number][]) {
    let fixtures: ApiFixture[];
    try {
      fixtures = await fetchUpcomingLeagueFixtures(leagueId, season, opts.from, opts.to);
    } catch (err) {
      // One league failing must not abort the others — the other three still
      // have schedules worth refreshing.
      log(`  [${league}] FETCH FAILED — ${(err as Error).message}`);
      continue;
    }

    log(`  [${league}] league=${leagueId} → ${fixtures.length} upcoming fixtures`);
    result.fixtures += fixtures.length;

    for (const f of fixtures) {
      const kickoffAt = new Date(f.fixture.date);
      const shortCode = f.fixture.status?.short;
      // An unrecognised code means the API returned something outside the set
      // we asked for. Treating it as scheduled keeps the fixture visible.
      const status = STATUS_BY_SHORT_CODE[shortCode] ?? 'SCHEDULED';

      for (const [side, apiTeam] of [['home', f.teams.home], ['away', f.teams.away]] as const) {
        const team = teamByExternalId.get(apiTeam.id);
        if (!team) {
          result.skippedUnknownTeams++;
          log(`    [SKIP] ${apiTeam.name} (${apiTeam.id}) has no Team row — run sync:teams`);
          continue;
        }

        const isHome = side === 'home';

        const existing = await prisma.fixture.findUnique({
          where: { externalId_teamId: { externalId: f.fixture.id, teamId: team.id } },
        });

        if (existing) {
          const changed =
            existing.isHome !== isHome ||
            existing.status !== status ||
            existing.kickoffAt.getTime() !== kickoffAt.getTime();

          if (!changed) {
            result.unchanged++;
            continue;
          }

          result.updated++;
          log(
            `    [UPDATE] ${team.name} fixture=${f.fixture.id} ${kickoffAt.toISOString()} ${status}` +
              (existing.status !== status ? ` (was ${existing.status})` : ''),
          );
          if (!dryRun) {
            await prisma.fixture.update({
              where: { id: existing.id },
              data: { isHome, kickoffAt, status },
            });
          }
        } else {
          result.created++;
          log(`    [CREATE] ${team.name} fixture=${f.fixture.id} ${kickoffAt.toISOString()} ${status}`);
          if (!dryRun) {
            await prisma.fixture.create({
              data: { externalId: f.fixture.id, teamId: team.id, isHome, kickoffAt, status },
            });
          }
        }
      }
    }
  }

  return result;
}
