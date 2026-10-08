import { FastifyInstance } from 'fastify';
import { couponCountFor } from '../lib/contractBatch';
import { loadLeagueConfig } from '../jobs/createContracts';

export async function leagueRoutes(server: FastifyInstance) {
  /**
   * Public: what the weekly batch does right now, so the rules page states the
   * live numbers instead of copy that drifts from them. Only the batch settings
   * are published — not who changed them.
   */
  server.get('/config', async (req, reply) => {
    const [config, players] = await Promise.all([
      loadLeagueConfig(server.prisma),
      server.prisma.user.count({ where: { emailVerified: true } }),
    ]);
    return reply.send({
      leagues: config.map((c) => ({
        league: c.league,
        enabled: c.enabled,
        contractsPerWeek: c.contractsPerWeek,
        couponRatio: c.couponRatio,
        couponMin: c.couponMin,
        couponMax: c.couponMax,
        couponCount: couponCountFor(players, c),
      })),
    });
  });
}
