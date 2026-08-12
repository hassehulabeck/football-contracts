import { PrismaClient } from '@prisma/client';
import { settleAuctions, Award, SettleableAuction } from '../lib/settlement';

const prisma = new PrismaClient();

export async function closeExpiredAuctions() {
  const expired = await prisma.auction.findMany({
    where: { closed: false, endsAt: { lte: new Date() } },
    // Ordered so a run is reproducible. This no longer decides who gets paid —
    // settleAuctions() does that from bid timestamps — but an arbitrary order
    // still makes the log, and any half-finished run, hard to reason about.
    orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
    include: {
      bids: true,
      contract: { select: { id: true, couponCount: true } },
    },
  });
  if (expired.length === 0) return;

  // Who can afford what has to be worked out across every closing auction at
  // once, because one balance backs all of a player's bids — see settlement.ts.
  const userIds = [...new Set(expired.flatMap((a) => a.bids.map((b) => b.userId)))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, credits: true },
  });

  const plan: SettleableAuction[] = expired.map((a) => ({
    id: a.id,
    couponCount: a.contract.couponCount,
    bids: a.bids,
  }));
  const { awards, skips } = settleAuctions(plan, new Map(users.map((u) => [u.id, u.credits])));

  for (const skip of skips) {
    console.log(
      `[closeAuctions]   Skipping bid ${skip.bid.amount} from user ${skip.bid.userId} — ` +
        `only ${skip.creditsLeft} credits left`,
    );
  }

  const awardsByAuction = new Map<string, Award[]>();
  for (const award of awards) {
    const list = awardsByAuction.get(award.auctionId);
    if (list) list.push(award);
    else awardsByAuction.set(award.auctionId, [award]);
  }

  for (const auction of expired) {
    console.log(`[closeAuctions] Closing auction ${auction.id}`);

    await prisma.$transaction(async (tx) => {
      let assigned = 0;

      for (const award of awardsByAuction.get(auction.id) ?? []) {
        const coupon = await tx.coupon.findFirst({
          where: { contractId: auction.contract.id, ownerId: null },
        });
        if (!coupon) break;

        // Guarded rather than a bare decrement: the plan was computed from
        // balances read before this loop started, and no balance may ever be
        // driven negative on the strength of a stale read.
        const paid = await tx.user.updateMany({
          where: { id: award.bid.userId, credits: { gte: award.bid.amount } },
          data: { credits: { decrement: award.bid.amount } },
        });
        if (paid.count === 0) {
          console.log(
            `[closeAuctions]   Plan diverged: user ${award.bid.userId} can no longer ` +
              `cover ${award.bid.amount}, coupon left unassigned`,
          );
          continue;
        }

        await tx.coupon.update({ where: { id: coupon.id }, data: { ownerId: award.bid.userId } });
        assigned++;
      }

      await tx.auction.update({ where: { id: auction.id }, data: { closed: true } });
      await tx.contract.update({ where: { id: auction.contract.id }, data: { status: 'CLOSED' } });

      const unaffordable = skips.filter((s) => s.auctionId === auction.id).length;
      console.log(
        `[closeAuctions]   ${assigned}/${auction.contract.couponCount} coupons assigned ` +
          `from ${auction.bids.length} bids` +
          (unaffordable ? `, ${unaffordable} unaffordable` : ''),
      );
    });
  }

  console.log(`[closeAuctions] Closed ${expired.length} auction(s)`);
}
