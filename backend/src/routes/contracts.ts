import { FastifyInstance } from 'fastify';

export async function contractRoutes(server: FastifyInstance) {
  // List active contracts (with auction end time and coupon count)
  server.get('/', async (req, reply) => {
    const contracts = await server.prisma.contract.findMany({
      where: { status: { in: ['ACTIVE', 'CLOSED'] } },
      include: {
        team: true,
        auction: { select: { endsAt: true, closed: true } },
        _count: { select: { coupons: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(contracts);
  });

  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const contract = await server.prisma.contract.findUnique({
      where: { id },
      include: {
        team: true,
        auction: {
          select: {
            id: true,
            endsAt: true,
            closed: true,
            _count: { select: { bids: true } },
          },
        },
      },
    });
    if (!contract) return reply.status(404).send({ error: 'Not found' });
    return reply.send(contract);
  });
}
