import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function closeExpiredAuctions() {
  const expired = await prisma.auction.findMany({
    where: { closed: false, endsAt: { lte: new Date() } },
    include: {
      // Highest bid wins; equal bids are settled by who bid first.
      bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }] },
      contract: { select: { id: true, couponCount: true } },
    },
  });

  for (const auction of expired) {
    console.log(`[closeAuctions] Closing auction ${auction.id}`);

    await prisma.$transaction(async (tx) => {
      let assigned = 0;
      let skipped = 0;

      // Credits are only debited here, at close, but the bid endpoint can only
      // check affordability one bid at a time — so 1000 credits can back a 1000
      // credit bid on ten separate auctions. Whoever cannot pay when their bid
      // is settled forfeits the coupon to the next bidder down, rather than
      // being driven into a negative balance.
      for (const bid of auction.bids) {
        if (assigned >= auction.contract.couponCount) break;

        const user = await tx.user.findUnique({
          where: { id: bid.userId },
          select: { credits: true },
        });
        if (!user || user.credits < bid.amount) {
          skipped++;
          console.log(
            `[closeAuctions]   Skipping bid ${bid.amount} from user ${bid.userId} — ` +
              `only ${user?.credits ?? 0} credits left`,
          );
          continue;
        }

        const coupon = await tx.coupon.findFirst({
          where: { contractId: auction.contract.id, ownerId: null },
        });
        if (!coupon) break;

        await tx.coupon.update({ where: { id: coupon.id }, data: { ownerId: bid.userId } });
        await tx.user.update({
          where: { id: bid.userId },
          data: { credits: { decrement: bid.amount } },
        });
        assigned++;
      }

      await tx.auction.update({ where: { id: auction.id }, data: { closed: true } });
      await tx.contract.update({ where: { id: auction.contract.id }, data: { status: 'CLOSED' } });

      console.log(
        `[closeAuctions]   ${assigned}/${auction.contract.couponCount} coupons assigned ` +
          `from ${auction.bids.length} bids` + (skipped ? `, ${skipped} unaffordable` : ''),
      );
    });
  }

  if (expired.length > 0) console.log(`[closeAuctions] Closed ${expired.length} auction(s)`);
}
