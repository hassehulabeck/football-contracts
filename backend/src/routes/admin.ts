import { FastifyInstance } from 'fastify';
import { League } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin } from '../lib/guards';
import { couponCountFor } from '../lib/contractBatch';

const leagueParam = z.object({ league: z.nativeEnum(League) });

// Bounds are generous but finite: a typo should not be able to queue a
// thousand contracts or a coupon supply nobody can ever bid out.
const patchSchema = z
  .object({
    enabled: z.boolean(),
    contractsPerWeek: z.number().int().min(0).max(50),
    couponRatio: z.number().gt(0).max(1),
    couponMin: z.number().int().min(1).max(500),
    couponMax: z.number().int().min(1).max(500),
  })
  .partial()
  .strict();

export async function adminRoutes(server: FastifyInstance) {
  server.addHook('preHandler', requireAdmin);

  /** Every league's settings, with what next Wednesday's batch would produce. */
  server.get('/leagues', async (req, reply) => {
    const [rows, players] = await Promise.all([
      server.prisma.leagueConfig.findMany({ orderBy: { league: 'asc' } }),
      server.prisma.user.count({ where: { emailVerified: true } }),
    ]);
    return reply.send({
      players,
      leagues: rows.map((r) => ({ ...r, couponCount: couponCountFor(players, r) })),
    });
  });

  server.patch('/leagues/:league', async (req, reply) => {
    const { league } = leagueParam.parse(req.params);
    const patch = patchSchema.parse(req.body);

    const current = await server.prisma.leagueConfig.findUnique({ where: { league } });
    if (!current) return reply.status(404).send({ error: 'Unknown league' });

    // Checked against the merged row, so changing only one bound cannot leave
    // the pair inverted.
    const next = { ...current, ...patch };
    if (next.couponMin > next.couponMax) {
      return reply.status(400).send({ error: 'Min coupons cannot be more than max coupons' });
    }

    const updated = await server.prisma.leagueConfig.update({
      where: { league },
      data: { ...patch, updatedById: (req.user as { sub: string }).sub },
    });
    const players = await server.prisma.user.count({ where: { emailVerified: true } });
    req.log.info({ league, patch }, 'league config updated');
    return reply.send({ ...updated, couponCount: couponCountFor(players, updated) });
  });
}
