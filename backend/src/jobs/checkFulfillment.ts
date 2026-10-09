/**
 * Ingests recent league results, then resolves any contract they complete.
 *
 * This is the payout half of the game loop. It was unscheduled at the end of
 * Phase 8 because the per-team ingest cost ~1440 API requests/day; the
 * league-driven ingest costs 4 per run, so it is back on a cron.
 */
import { PrismaClient } from '@prisma/client';
import { ingestMatches, toDateParam } from '../lib/ingestMatches';
import { findPatternWindow } from '../lib/fulfillment';
import { seasonEndFor } from '../lib/season';

import { COUPON_PAYOUT } from '../lib/ledger';
import { sendPayouts, type Payout } from '../lib/notifications';

const prisma = new PrismaClient();

// How far back each run re-reads. Covers a full weekend plus a missed run, and
// picks up scores the API corrected after first publishing them. Widening this
// costs nothing extra in requests — only the rows re-compared.
const LOOKBACK_DAYS = 4;

export async function checkContractFulfillment() {
  console.log('[checkFulfillment] Running');

  const now = new Date();
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    const ingest = await ingestMatches(prisma, {
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

  let fulfilledCount = 0;
  let failedCount = 0;
  const payouts = new Map<string, Payout[]>();

  for (const contract of contracts) {
    // Fulfilment is decided by the date a match was played, not by league round:
    // a rescheduled round-19 fixture can be played before round 7.
    const matches = await prisma.match.findMany({
      where: { teamId: contract.teamId, playedAt: { gte: contract.createdAt } },
      orderBy: { playedAt: 'asc' },
      select: { result: true },
    });

    // Shared with the contract detail endpoint, so the matches shown there are
    // the same ones this job paid out on.
    const window = findPatternWindow(matches, contract.pattern);

    if (window) {
      const owners = await fulfillContract(contract.id);
      const payout: Payout = { contractId: contract.id, team: contract.team.name, pattern: contract.pattern };
      for (const owner of owners) payouts.set(owner, [...(payouts.get(owner) ?? []), payout]);
      fulfilledCount++;
    } else if (now > seasonEndFor(contract.team.league, contract.createdAt)) {
      // Only once the contract's own league season is over: Nov 30 for the
      // Swedish leagues, May 31 for the Championship. See lib/season.ts.
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'FAILED', resolvedAt: new Date() },
      });
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

  try {
    await sendPayouts(prisma, payouts);
  } catch (err) {
    console.error('[checkFulfillment] Payout mail failed:', err);
  }
}

/** Pays every coupon holder and returns their user ids, one per coupon. */
async function fulfillContract(contractId: string): Promise<string[]> {
  const coupons = await prisma.coupon.findMany({
    where: { contractId, ownerId: { not: null }, paidOut: false },
  });

  await prisma.$transaction([
    ...coupons.map((c) =>
      prisma.user.update({ where: { id: c.ownerId! }, data: { credits: { increment: COUPON_PAYOUT } } }),
    ),
    ...coupons.map((c) => prisma.coupon.update({ where: { id: c.id }, data: { paidOut: true } })),
    ...coupons.map((c) =>
      prisma.creditTransaction.create({
        data: { userId: c.ownerId!, amount: COUPON_PAYOUT, type: 'COUPON_PAYOUT', contractId },
      }),
    ),
    prisma.contract.update({
      where: { id: contractId },
      data: { status: 'FULFILLED', resolvedAt: new Date() },
    }),
  ]);

  console.log(`[checkFulfillment] Contract ${contractId} fulfilled — paid out ${coupons.length} coupons`);
  return coupons.map((c) => c.ownerId!);
}
