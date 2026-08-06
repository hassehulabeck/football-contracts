/**
 * Ingests recent league results, then resolves any contract they complete.
 *
 * This is the payout half of the game loop. It was unscheduled at the end of
 * Phase 8 because the per-team ingest cost ~1440 API requests/day; the
 * league-driven ingest costs 4 per run, so it is back on a cron.
 */
import { PrismaClient } from '@prisma/client';
import { ingestMatches, toDateParam } from '../lib/ingestMatches';

const prisma = new PrismaClient();
const COUPON_PAYOUT = 100;

// How far back each run re-reads. Covers a full weekend plus a missed run, and
// picks up scores the API corrected after first publishing them. Widening this
// costs nothing extra in requests — only the rows re-compared.
const LOOKBACK_DAYS = 4;

/** Contracts can only be declared failed once the season is over: Nov 30, UTC. */
function seasonIsOver(now: Date): boolean {
  return now > new Date(Date.UTC(now.getUTCFullYear(), 10, 30, 23, 59, 59));
}

export async function checkContractFulfillment() {
  console.log('[checkFulfillment] Running');

  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    const ingest = await ingestMatches(prisma, {
      season: now.getUTCFullYear(),
      from: toDateParam(from),
      to: toDateParam(now),
      log: (msg) => console.log(`[checkFulfillment]${msg}`),
    });
    console.log(
      `[checkFulfillment] Ingest: ${ingest.fixtures} fixtures, ` +
        `${ingest.created} created, ${ingest.updated} updated, ${ingest.unchanged} unchanged`,
    );
  } catch (err) {
    // Evaluation still runs — matches already in the database may complete a
    // contract even when today's fetch failed.
    console.error('[checkFulfillment] Ingest failed:', err);
  }

  const contracts = await prisma.contract.findMany({
    where: { status: 'CLOSED' },
    include: { team: true },
  });

  const over = seasonIsOver(now);
  let fulfilledCount = 0;
  let failedCount = 0;

  for (const contract of contracts) {
    // Fulfilment is decided by the date a match was played, not by league round:
    // a rescheduled round-19 fixture can be played before round 7.
    const matches = await prisma.match.findMany({
      where: { teamId: contract.teamId, playedAt: { gte: contract.createdAt } },
      orderBy: { playedAt: 'asc' },
      select: { result: true },
    });

    let fulfilled = false;
    for (let i = 0; i + 3 <= matches.length; i++) {
      const window = matches[i].result + matches[i + 1].result + matches[i + 2].result;
      if (window === contract.pattern) {
        await fulfillContract(contract.id);
        fulfilled = true;
        fulfilledCount++;
        break;
      }
    }

    if (!fulfilled && over) {
      await prisma.contract.update({ where: { id: contract.id }, data: { status: 'FAILED' } });
      failedCount++;
      console.log(
        `[checkFulfillment] Contract ${contract.id} failed — season ended without pattern ${contract.pattern}`,
      );
    }
  }

  console.log(
    `[checkFulfillment] Evaluated ${contracts.length} open contracts — ` +
      `${fulfilledCount} fulfilled, ${failedCount} failed`,
  );
}

async function fulfillContract(contractId: string) {
  const coupons = await prisma.coupon.findMany({
    where: { contractId, ownerId: { not: null }, paidOut: false },
  });

  await prisma.$transaction([
    ...coupons.map((c) =>
      prisma.user.update({ where: { id: c.ownerId! }, data: { credits: { increment: COUPON_PAYOUT } } }),
    ),
    ...coupons.map((c) => prisma.coupon.update({ where: { id: c.id }, data: { paidOut: true } })),
    prisma.contract.update({ where: { id: contractId }, data: { status: 'FULFILLED' } }),
  ]);

  console.log(`[checkFulfillment] Contract ${contractId} fulfilled — paid out ${coupons.length} coupons`);
}
