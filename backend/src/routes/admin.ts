import { FastifyInstance } from 'fastify';
import { League } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin } from '../lib/guards';
import { couponCountFor } from '../lib/contractBatch';
import { PROFIT_TYPES } from '../lib/ledger';

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

const userParam = z.object({ id: z.string().min(1) });

const adjustSchema = z
  .object({
    // Signed. Bounded so a slipped key cannot mint a fortune.
    amount: z.number().int().min(-10_000).max(10_000).refine((n) => n !== 0, 'Amount cannot be zero'),
    // Shown to the player in their credit history, so say why.
    note: z.string().trim().min(3).max(200),
  })
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

  /**
   * Every account, with what an admin needs to look after a test group:
   * balance, profit, activity, and whether they ever activated.
   */
  server.get('/users', async (req, reply) => {
    const [users, profits] = await Promise.all([
      server.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          credits: true,
          emailVerified: true,
          isAdmin: true,
          createdAt: true,
          _count: { select: { bids: true, coupons: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      server.prisma.creditTransaction.groupBy({
        by: ['userId'],
        where: { type: { in: [...PROFIT_TYPES] } },
        _sum: { amount: true },
      }),
    ]);
    const profit = new Map(profits.map((p) => [p.userId, p._sum.amount ?? 0]));
    return reply.send(
      users.map(({ _count, ...u }) => ({
        ...u,
        profit: profit.get(u.id) ?? 0,
        bids: _count.bids,
        coupons: _count.coupons,
      })),
    );
  });

  /**
   * Grants or removes credits, recorded as an ADJUSTMENT in the player's
   * ledger with the note and the admin's name — never counted as profit.
   * Refuses to take a balance below zero.
   */
  server.post('/users/:id/adjust', async (req, reply) => {
    const { id } = userParam.parse(req.params);
    const { amount, note } = adjustSchema.parse(req.body);
    const adminId = (req.user as { sub: string }).sub;

    const admin = await server.prisma.user.findUnique({ where: { id: adminId }, select: { username: true, email: true } });
    const by = admin?.username ?? admin?.email ?? adminId;

    const result = await server.prisma.$transaction(async (tx) => {
      // Guarded like settlement: the floor is checked in the same statement
      // that moves the balance, so two adjustments cannot race it negative.
      const moved = await tx.user.updateMany({
        where: { id, ...(amount < 0 ? { credits: { gte: -amount } } : {}) },
        data: { credits: { increment: amount } },
      });
      if (moved.count === 0) return null;
      await tx.creditTransaction.create({
        data: { userId: id, amount, type: 'ADJUSTMENT', note: `${note} (by ${by})` },
      });
      return tx.user.findUnique({ where: { id }, select: { id: true, credits: true } });
    });

    if (!result) {
      const exists = await server.prisma.user.count({ where: { id } });
      return exists
        ? reply.status(400).send({ error: 'That would take the balance below zero' })
        : reply.status(404).send({ error: 'No such user' });
    }
    req.log.info({ userId: id, amount, by }, 'credits adjusted');
    return reply.send(result);
  });
}
