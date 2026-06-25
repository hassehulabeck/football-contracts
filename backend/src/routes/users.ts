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
        bids: {
          where: { auction: { closed: false } },
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
    return reply.send(user);
  });
}
