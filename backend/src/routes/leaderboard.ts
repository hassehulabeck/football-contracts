import { FastifyInstance } from 'fastify';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/', async (req, reply) => {
    const users = await server.prisma.user.findMany({
      where: { emailVerified: true },
      select: { id: true, email: true, credits: true },
      orderBy: { credits: 'desc' },
      take: 100,
    });
    return reply.send(users);
  });
}
