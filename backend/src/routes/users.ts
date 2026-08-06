import { FastifyInstance } from 'fastify';

export async function userRoutes(server: FastifyInstance) {
  const authenticate = async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  server.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await server.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true,
        coupons: {
          include: {
            contract: { include: { team: true, auction: { select: { endsAt: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Deliberately unfiltered. Closed auctions used to be excluded here,
        // which meant a losing bid vanished the moment its auction settled —
        // the player never saw it again. Both live and settled bids are
        // fetched now and split below.
        bids: {
          select: {
            amount: true,
            updatedAt: true,
            auction: {
              select: {
                id: true,
                endsAt: true,
                closed: true,
                contract: {
                  select: {
                    id: true,
                    pattern: true,
                    status: true,
                    team: { select: { name: true, league: true } },
                  },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!user) return reply.status(404).send({ error: 'Not found' });

    // A settled bid won if it earned a coupon on that contract. There is no
    // relation from Bid to Coupon — closeAuctions writes ownerId and nothing
    // links back — so ownership is the only evidence, and the coupons above
    // already carry it.
    const wonContractIds = new Set(user.coupons.map((c) => c.contractId));

    // `bids` keeps its name and shape: the dashboard's Active bids table reads
    // it as-is and should not have to change.
    const bids = user.bids.filter((b) => !b.auction.closed);
    // Winners are omitted — they surface as coupons instead, and listing them
    // here would show the same contract twice.
    const lostBids = user.bids.filter(
      (b) => b.auction.closed && !wonContractIds.has(b.auction.contract.id),
    );

    return reply.send({ ...user, bids, lostBids });
  });
}
