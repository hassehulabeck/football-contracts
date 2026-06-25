/**
 * Fetches real team IDs from api-football.com and updates externalId in the database.
 * Run once per season (or after roster changes): npm run sync:teams
 *
 * Strategy: for each league, fetch all teams from the API and fuzzy-match them to
 * our seeded teams by name. If no confident match exists, the row is skipped and
 * logged so it can be fixed manually.
 */
import 'dotenv/config';
import { PrismaClient, League } from '@prisma/client';
import { fetchTeams, LEAGUE_IDS } from '../lib/footballApi';

const prisma = new PrismaClient();
const SEASON = new Date().getFullYear();

const LEAGUE_ENUM_TO_ID: Record<League, number> = {
  ALLSVENSKAN: LEAGUE_IDS.ALLSVENSKAN,
  DAMALLSVENSKAN: LEAGUE_IDS.DAMALLSVENSKAN,
  SUPERETTAN: LEAGUE_IDS.SUPERETTAN,
  ELITETTAN: LEAGUE_IDS.ELITETTAN,
};

// Normalize a club name for comparison.
// Strips accents, lowercases, removes common Swedish club suffixes, and collapses whitespace.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(if|bk|ff|fk|ik|gik|dff|dif|aif|sk|fc|ab|women|w)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 2));
  const shared = [...wordsA].filter((w) => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? shared / total : 0;
}

async function syncLeague(league: League, leagueId: number): Promise<void> {
  console.log(`\n[${league}] Fetching from api-football.com — league=${leagueId}, season=${SEASON}`);

  let apiTeams: Array<{ team: { id: number; name: string } }>;
  try {
    apiTeams = await fetchTeams(leagueId, SEASON);
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
    return;
  }

  if (apiTeams.length === 0) {
    console.warn(
      `  WARNING: 0 teams returned. League ID ${leagueId} may be incorrect — check api-football.com docs.`,
    );
    return;
  }

  console.log(`  API returned ${apiTeams.length} teams`);
  const dbTeams = await prisma.team.findMany({ where: { league } });

  // Build all candidate pairs above the threshold, then do greedy one-to-one assignment
  // (sort by score desc, claim each DB team and API team at most once). This prevents
  // two DB teams from being assigned the same API ID and hitting the unique constraint.
  const MATCH_THRESHOLD = 0.4;
  type Pair = { dbId: string; dbName: string; dbExternalId: number; apiId: number; apiName: string; score: number };
  const pairs: Pair[] = [];

  for (const dbTeam of dbTeams) {
    for (const { team: apiTeam } of apiTeams) {
      const score = similarity(dbTeam.name, apiTeam.name);
      if (score >= MATCH_THRESHOLD) {
        pairs.push({ dbId: dbTeam.id, dbName: dbTeam.name, dbExternalId: dbTeam.externalId, apiId: apiTeam.id, apiName: apiTeam.name, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedDbIds = new Set<string>();
  const usedApiIds = new Set<number>();
  const assignments: Pair[] = [];

  for (const pair of pairs) {
    if (usedDbIds.has(pair.dbId) || usedApiIds.has(pair.apiId)) continue;
    usedDbIds.add(pair.dbId);
    usedApiIds.add(pair.apiId);
    assignments.push(pair);
  }

  // Report any DB teams with no assignment
  for (const dbTeam of dbTeams) {
    if (!usedDbIds.has(dbTeam.id)) {
      console.warn(`  [NO MATCH]  "${dbTeam.name}" — no confident API match found, skipped`);
    }
  }

  // Apply updates
  for (const p of assignments) {
    const label = p.score >= 0.8 ? '[MATCH]' : '[FUZZY]';
    const idChanged = p.dbExternalId !== p.apiId;
    const changeNote = idChanged ? ` (${p.dbExternalId} → ${p.apiId})` : ' (no change)';
    console.log(`  ${label}  "${p.dbName}" → "${p.apiName}" (id=${p.apiId}, score=${p.score.toFixed(2)})${changeNote}`);
    if (idChanged) {
      await prisma.team.update({ where: { id: p.dbId }, data: { externalId: p.apiId } });
    }
  }
}

async function main(): Promise<void> {
  console.log(`\n=== Football Contracts — syncTeams (season ${SEASON}) ===`);
  console.log(
    'Note: if a league returns 0 teams, verify LEAGUE_IDS in src/lib/footballApi.ts against api-football.com.\n',
  );

  for (const [league, leagueId] of Object.entries(LEAGUE_ENUM_TO_ID) as [League, number][]) {
    await syncLeague(league, leagueId);
  }

  console.log('\n=== Sync complete ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
