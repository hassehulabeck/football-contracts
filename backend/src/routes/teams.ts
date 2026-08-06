import { FastifyInstance } from 'fastify';
import { League } from '@prisma/client';
import { z } from 'zod';

const querySchema = z.object({
  league: z.nativeEnum(League).optional(),
});

export async function teamRoutes(server: FastifyInstance) {
  /**
   * Every tracked team, optionally one league's worth.
   *
   * Exists because the contracts list is paginated: the team filter used to
   * derive its options from the loaded contracts, which only worked while the
   * page held all of them. Sixty rows, so no pagination here.
   */
  server.get('/', async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query' });
    }

    const teams = await server.prisma.team.findMany({
      where: parsed.data.league ? { league: parsed.data.league } : {},
      select: { id: true, name: true, league: true },
      orderBy: { name: 'asc' },
    });

    return reply.send(teams);
  });
}
