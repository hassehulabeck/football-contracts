/**
 * Backfills the Match table from api-football.com: npm run ingest:matches
 *
 * The cron job (checkFulfillment) keeps a rolling few days up to date. This is
 * for the cases it cannot cover: seeding a fresh database, recovering after the
 * service was down longer than the lookback window, or re-reading a season after
 * a data repair.
 *
 * Flags:
 *   --full           whole season (default; ignores --days)
 *   --days=7         only the last N days
 *   --season=2026    override the season (defaults to the current year)
 *   --dry-run        report what would change without writing
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ingestMatches, toDateParam } from '../lib/ingestMatches';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const SEASON = Number(
  process.argv.find((a) => a.startsWith('--season='))?.split('=')[1] ?? new Date().getUTCFullYear(),
);
const DAYS_ARG = process.argv.find((a) => a.startsWith('--days='))?.split('=')[1];
const DAYS = DAYS_ARG ? Number(DAYS_ARG) : null;

async function main(): Promise<void> {
  if (DAYS !== null && (!Number.isFinite(DAYS) || DAYS <= 0)) {
    throw new Error(`--days must be a positive number, got "${DAYS_ARG}"`);
  }

  const teamCount = await prisma.team.count();
  if (teamCount === 0) {
    throw new Error('No teams in the database. Run `npm run sync:teams` first.');
  }

  let from: string | undefined;
  let to: string | undefined;
  if (DAYS !== null) {
    const now = new Date();
    from = toDateParam(new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000));
    to = toDateParam(now);
  }

  const window = DAYS !== null ? `${from} → ${to}` : 'full season';
  console.log(
    `\n=== Football Contracts — ingestMatches (season ${SEASON}, ${window})${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`,
  );
  console.log(`Tracking ${teamCount} teams. Fetching finished fixtures...`);

  const res = await ingestMatches(prisma, { season: SEASON, from, to, dryRun: DRY_RUN });

  console.log('\n=== Summary ===');
  console.log(`  fixtures seen  ${res.fixtures}`);
  console.log(`  created        ${res.created}`);
  console.log(`  updated        ${res.updated}`);
  console.log(`  unchanged      ${res.unchanged}`);
  console.log(`  unknown teams  ${res.skippedUnknownTeams}`);

  if (res.skippedUnknownTeams > 0) {
    console.log('\n  Some clubs in these leagues have no Team row — run `npm run sync:teams`.');
  }

  const total = DRY_RUN ? null : await prisma.match.count();
  if (total !== null) console.log(`  matches in DB  ${total}`);
  if (DRY_RUN) console.log('\nDry run — no changes were written.');
}

main()
  .catch((err) => {
    console.error(`\nERROR: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
