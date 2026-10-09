/**
 * Verifies the ledger invariant: every player's CreditTransaction rows sum to
 * their credits. Read-only. Exits non-zero and lists the players that drift.
 *
 *   npm run check:ledger
 *
 * In production, over SSH:
 *   railway ssh --service football-coupons-backend "cd /app && npm run -s check:ledger:prod"
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [users, sums] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true, credits: true } }),
    prisma.creditTransaction.groupBy({ by: ['userId'], _sum: { amount: true } }),
  ]);
  const ledger = new Map(sums.map((s) => [s.userId, s._sum.amount ?? 0]));

  const drift = users.filter((u) => (ledger.get(u.id) ?? 0) !== u.credits);
  for (const u of drift) {
    console.log(`DRIFT ${u.username ?? u.id}: credits ${u.credits}, ledger ${ledger.get(u.id) ?? 0}`);
  }
  console.log(`${users.length} players checked, ${drift.length} drifting`);
  if (drift.length > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`ERROR: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
