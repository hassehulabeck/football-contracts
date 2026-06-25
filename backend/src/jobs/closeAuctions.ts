import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function closeExpiredAuctions() {
  const expired = await prisma.auction.findMany({
    where: { closed: false, endsAt: { lte: new Date() } },
    include: {
      bids: { orderBy: { amount: 'desc' } },
      contract: { select: { id: true, couponCount: true } },
    },
  });

  for (const auction of expired) {
    console.log(`[closeAuctions] Closing auction ${auction.id}`);
    const winners = auction.bids.slice(0, auction.contract.couponCount);

    await prisma.$transaction(async (tx) => {
      // Assign coupons to top bidders
      for (const bid of winners) {
        const coupon = await tx.coupon.findFirst({
          where: { contractId: auction.contract.id, ownerId: null },
        });
        if (coupon) {
          await tx.coupon.update({ where: { id: coupon.id }, data: { ownerId: bid.userId } });
          await tx.user.update({ where: { id: bid.userId }, data: { credits: { decrement: bid.amount } } });
        }
      }

      await tx.auction.update({ where: { id: auction.id }, data: { closed: true } });
      await tx.contract.update({ where: { id: auction.contract.id }, data: { status: 'CLOSED' } });
    });
  }
}
