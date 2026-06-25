import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const bidSchema = z.object({
  amount: z.number().int().positive(),
});

export async function auctionRoutes(server: FastifyInstance) {
  const authenticate = async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  // Get auction info (bid count + a random sample bid to hint at the market)
  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const auction = await server.prisma.auction.findUnique({
      where: { id },
      include: {
        contract: { include: { team: true } },
        _count: { select: { bids: true } },
      },
    });
    if (!auction) return reply.status(404).send({ error: 'Not found' });

    // Reveal total bid count and one random bid amount (not the bidder)
    const bids = await server.prisma.bid.findMany({ where: { auctionId: id }, select: { amount: true } });
    const sampleBid = bids.length > 0 ? bids[Math.floor(Math.random() * bids.length)].amount : null;

    return reply.send({
      ...auction,
      bidCount: auction._count.bids,
      sampleBid,
    });
  });

  // Return the authenticated user's own bid for this auction (null if none)
  server.get('/:id/my-bid', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).sub as string;

    const bid = await server.prisma.bid.findUnique({
      where: { auctionId_userId: { auctionId: id, userId } },
      select: { amount: true, updatedAt: true },
    });

    return reply.send(bid ?? null);
  });

  // Place or update a bid
  server.post('/:id/bid', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).sub as string;
    const { amount } = bidSchema.parse(req.body);

    const auction = await server.prisma.auction.findUnique({ where: { id } });
    if (!auction) return reply.status(404).send({ error: 'Auction not found' });
    if (auction.closed || new Date() > auction.endsAt) {
      return reply.status(409).send({ error: 'Auction has closed' });
    }

    const user = await server.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < amount) {
      return reply.status(400).send({ error: 'Insufficient credits' });
    }

    await server.prisma.bid.upsert({
      where: { auctionId_userId: { auctionId: id, userId } },
      create: { auctionId: id, userId, amount },
      update: { amount },
    });

    return reply.send({ message: 'Bid placed' });
  });
}
