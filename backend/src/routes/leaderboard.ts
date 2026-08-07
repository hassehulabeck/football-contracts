import { FastifyInstance } from 'fastify';

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/', async (req, reply) => {
    const users = await server.prisma.user.findMany({
      where: { emailVerified: true },
      // Email is deliberately not selected. This endpoint is public and
      // unauthenticated, so anything in the select is published.
      select: { id: true, username: true, credits: true },
      orderBy: { credits: 'desc' },
      take: 100,
    });

    // Resolved server-side so a null username can never reach the client as a
    // hole for the frontend to fill with something identifying. Accounts that
    // registered before usernames existed sit here until their next login,
    // when the gate makes them pick one.
    return reply.send(
      users.map((u) => ({
        id: u.id,
        displayName: u.username ?? 'Anonymous',
        credits: u.credits,
      })),
    );
  });
}
