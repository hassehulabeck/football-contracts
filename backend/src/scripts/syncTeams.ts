/**
 * Reconciles the Team table with the real squads on api-football.com.
 * Run once per season, or after promotion/relegation: npm run sync:teams
 *
 * Flags:
 *   --dry-run        report what would change without writing
 *   --season=2026    override the season (defaults to the current year)
 *
 * The API is the source of truth. Reconciliation runs in four passes:
 *
 *   1. Match by externalId    — the team is already correctly linked; refresh
 *                               its name and league (handles promotion/relegation).
 *   2. Rescue by name         — the row exists but carries a wrong or placeholder
 *                               externalId. Re-point the existing row rather than
 *                               inserting a new one, so its matches and contracts
 *                               survive.
 *   3. Insert                 — API teams with no corresponding row.
 *   4. Prune                  — rows for teams no longer in any of the four
 *                               leagues. Dropped only when no contracts depend on
 *                               them; otherwise kept and reported.
 *
 * Pass 2 is deliberately constrained to same-gender leagues. Normalising away club
 * suffixes collapses "Örebro SK Women" and "Orebro SK" onto the same string, so an
 * unconstrained match would happily assign a women's API id to a men's row.
 */
import 'dotenv/config';
import { PrismaClient, League } from '@prisma/client';
import { fetchTeams, LEAGUE_IDS } from '../lib/footballApi';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const SEASON = Number(
  process.argv.find((a) => a.startsWith('--season='))?.split('=')[1] ?? new Date().getFullYear(),
);

const LEAGUE_ENUM_TO_ID: Record<League, number> = {
  ALLSVENSKAN: LEAGUE_IDS.ALLSVENSKAN,
  SUPERETTAN: LEAGUE_IDS.SUPERETTAN,
  DAMALLSVENSKAN: LEAGUE_IDS.DAMALLSVENSKAN,
  ELITETTAN: LEAGUE_IDS.ELITETTAN,
  CHAMPIONSHIP: LEAGUE_IDS.CHAMPIONSHIP,
};

// Prevents cross-gender name collisions during the rescue pass.
const LEAGUE_GENDER: Record<League, 'M' | 'W'> = {
  ALLSVENSKAN: 'M',
  SUPERETTAN: 'M',
  DAMALLSVENSKAN: 'W',
  ELITETTAN: 'W',
  CHAMPIONSHIP: 'M',
};

type ApiTeam = { externalId: number; name: string; league: League };

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
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 2));
  const shared = [...wordsA].filter((w) => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? shared / total : 0;
}

async function loadApiTeams(): Promise<ApiTeam[]> {
  const all: ApiTeam[] = [];

  for (const [league, leagueId] of Object.entries(LEAGUE_ENUM_TO_ID) as [League, number][]) {
    const teams = await fetchTeams(leagueId, SEASON);

    if (teams.length === 0) {
      throw new Error(
        `[${league}] league=${leagueId} season=${SEASON} returned 0 teams. ` +
          `Verify LEAGUE_IDS in src/lib/footballApi.ts, and that the plan covers this season. ` +
          `Aborting before any writes — a partial team list would prune live teams.`,
      );
    }

    console.log(`  [${league}] league=${leagueId} → ${teams.length} teams`);
    all.push(...teams.map((t) => ({ externalId: t.team.id, name: t.team.name, league })));
  }

  return all;
}

async function main(): Promise<void> {
  console.log(`\n=== Football Contracts — syncTeams (season ${SEASON})${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  console.log('Fetching squads from api-football.com...');
  const apiTeams = await loadApiTeams();
  console.log(`  total: ${apiTeams.length} teams across ${Object.keys(LEAGUE_ENUM_TO_ID).length} leagues\n`);

  const dbTeams = await prisma.team.findMany();
  const claimedApi = new Set<number>();
  const claimedDb = new Set<string>();

  let relinked = 0;
  let moved = 0;
  let renamed = 0;
  let inserted = 0;
  let pruned = 0;
  let kept = 0;

  // ── Pass 1: already linked by externalId ──────────────────────────────────
  console.log('Pass 1 — matching on externalId');
  const dbByExternalId = new Map(dbTeams.map((t) => [t.externalId, t]));

  for (const api of apiTeams) {
    const db = dbByExternalId.get(api.externalId);
    if (!db) continue;

    claimedApi.add(api.externalId);
    claimedDb.add(db.id);

    const leagueChanged = db.league !== api.league;
    const nameChanged = db.name !== api.name;
    if (!leagueChanged && !nameChanged) continue;

    const notes = [
      leagueChanged ? `${db.league} → ${api.league}` : null,
      nameChanged ? `"${db.name}" → "${api.name}"` : null,
    ].filter(Boolean).join(', ');
    console.log(`  [UPDATE]  ${db.name} (${db.externalId}) — ${notes}`);

    if (leagueChanged) moved++;
    if (nameChanged) renamed++;
    if (!DRY_RUN) {
      await prisma.team.update({
        where: { id: db.id },
        data: { name: api.name, league: api.league },
      });
    }
  }
  console.log(`  ${claimedApi.size} linked, ${moved} changed league, ${renamed} renamed\n`);

  // ── Pass 2: rescue rows carrying a wrong or placeholder externalId ────────
  // Re-point the existing row so its matches and contracts are preserved.
  console.log('Pass 2 — rescuing rows with wrong externalId (name match, same gender)');
  const MATCH_THRESHOLD = 0.4;
  type Pair = { db: (typeof dbTeams)[number]; api: ApiTeam; score: number };
  const pairs: Pair[] = [];

  for (const db of dbTeams) {
    if (claimedDb.has(db.id)) continue;
    for (const api of apiTeams) {
      if (claimedApi.has(api.externalId)) continue;
      if (LEAGUE_GENDER[db.league] !== LEAGUE_GENDER[api.league]) continue;
      const score = similarity(db.name, api.name);
      if (score >= MATCH_THRESHOLD) pairs.push({ db, api, score });
    }
  }

  // Greedy one-to-one assignment, best scores first — externalId is unique, so
  // two rows must never claim the same API id.
  pairs.sort((a, b) => b.score - a.score);
  for (const { db, api, score } of pairs) {
    if (claimedDb.has(db.id) || claimedApi.has(api.externalId)) continue;
    claimedDb.add(db.id);
    claimedApi.add(api.externalId);
    relinked++;

    const label = score >= 0.8 ? '[RELINK]' : '[FUZZY] ';
    const leagueNote = db.league !== api.league ? `, ${db.league} → ${api.league}` : '';
    console.log(
      `  ${label} "${db.name}" → "${api.name}" (${db.externalId} → ${api.externalId}, score=${score.toFixed(2)}${leagueNote})`,
    );

    if (!DRY_RUN) {
      await prisma.team.update({
        where: { id: db.id },
        data: { externalId: api.externalId, name: api.name, league: api.league },
      });
    }
  }
  console.log(`  ${relinked} rescued\n`);

  // ── Pass 3: insert teams that have no row at all ──────────────────────────
  console.log('Pass 3 — inserting missing teams');
  for (const api of apiTeams) {
    if (claimedApi.has(api.externalId)) continue;
    inserted++;
    console.log(`  [INSERT] ${api.name} (${api.externalId}) → ${api.league}`);
    if (!DRY_RUN) {
      await prisma.team.create({
        data: { externalId: api.externalId, name: api.name, league: api.league },
      });
    }
  }
  console.log(`  ${inserted} inserted\n`);

  // ── Pass 4: prune rows for teams no longer in any tracked league ──────────
  // Left in place, these get picked by createContracts and produce contracts that
  // can never be fulfilled, since no fixtures will ever be ingested for them.
  console.log('Pass 4 — pruning teams no longer in the tracked leagues');
  for (const db of dbTeams) {
    if (claimedDb.has(db.id)) continue;

    const contractCount = await prisma.contract.count({ where: { teamId: db.id } });
    if (contractCount > 0) {
      kept++;
      console.log(
        `  [KEEP]   "${db.name}" (${db.externalId}, ${db.league}) — has ${contractCount} contract(s), not deleted. Review manually.`,
      );
      continue;
    }

    const matchCount = await prisma.match.count({ where: { teamId: db.id } });
    pruned++;
    console.log(
      `  [PRUNE]  "${db.name}" (${db.externalId}, ${db.league})${matchCount ? ` — also removing ${matchCount} match(es)` : ''}`,
    );

    if (!DRY_RUN) {
      await prisma.$transaction([
        prisma.match.deleteMany({ where: { teamId: db.id } }),
        prisma.team.delete({ where: { id: db.id } }),
      ]);
    }
  }
  console.log(`  ${pruned} pruned, ${kept} kept for review\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const finalCount = DRY_RUN ? apiTeams.length + kept : await prisma.team.count();
  console.log('=== Summary ===');
  console.log(`  linked        ${claimedApi.size - relinked}`);
  console.log(`  rescued       ${relinked}`);
  console.log(`  inserted      ${inserted}`);
  console.log(`  league moves  ${moved}`);
  console.log(`  pruned        ${pruned}`);
  console.log(`  kept          ${kept}`);
  console.log(`  teams in DB   ${finalCount}${DRY_RUN ? ' (projected)' : ''}`);
  if (DRY_RUN) console.log('\nDry run — no changes were written.');
}

main()
  .catch((err) => {
    console.error(`\nERROR: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
