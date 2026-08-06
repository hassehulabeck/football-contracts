/**
 * Generates a batch of contracts on demand: npm run create:contracts
 *
 * Normally the cron fires this every Wednesday at 02:00 UTC. This runs the same
 * job by hand — for seeding a batch to play against, or for shortening the
 * auction so a full bid -> close -> payout cycle can be watched in one sitting.
 *
 * Flags:
 *   --count=25       how many contracts (default 25, the weekly batch size)
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
  const count = numArg('count');
  const auctionHours = numArg('hours');

  console.log(`\n=== Football Contracts — createContracts${DRY_RUN ? ' [DRY RUN]' : ''} ===\n`);

  const res = await createWeeklyContracts({
    count,
    auctionHours,
    dryRun: DRY_RUN,
    log: (msg) => console.log(`  ${msg}`),
  });

  const open = await prisma.contract.count({ where: { status: 'ACTIVE' } });
  console.log('\n=== Summary ===');
  console.log(`  created            ${res.created}`);
  console.log(`  coupons each       ${res.couponCount}`);
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
