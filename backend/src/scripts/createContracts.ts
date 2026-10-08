/**
 * Generates a batch of contracts on demand: npm run create:contracts
 *
 * Normally the cron fires this every Wednesday at 03:00 Swedish time. This runs the same
 * job by hand — for seeding a batch to play against, or for shortening the
 * auction so a full bid -> close -> payout cycle can be watched in one sitting.
 *
 * Flags:
 *   --per-league=2   contracts per enabled league (default: each league's
 *                    contractsPerWeek from LeagueConfig)
 *   --hours=48       auction duration in hours (default 48)
 *   --dry-run        report what would be created without writing
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createWeeklyContracts } from '../jobs/createContracts';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const numArg = (name: string) => {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number, got "${raw}"`);
  return n;
};

async function main(): Promise<void> {
  const perLeague = numArg('per-league');
  const auctionHours = numArg('hours');

  console.log(`\n=== Football Contracts — createContracts${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const res = await createWeeklyContracts({
    perLeague,
    auctionHours,
    dryRun: DRY_RUN,
    log: (msg) => console.log(`  ${msg}`),
  });

  const open = await prisma.contract.count({ where: { status: 'ACTIVE' } });
  console.log('\n=== Summary ===');
  console.log(`  created            ${res.created}`);
  for (const l of res.leagues) {
    console.log(`  ${l.league.padEnd(18)} ${l.created} × ${l.couponCount} coupons`);
  }
  console.log(`  auction ends       ${res.auctionEnd?.toISOString() ?? '—'}`);
  console.log(`  ACTIVE contracts   ${open}${DRY_RUN ? ' (unchanged)' : ''}`);
  if (DRY_RUN) console.log('\nDry run — no changes were written.');
}

main()
  .catch((err) => {
    console.error(`\nERROR: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
