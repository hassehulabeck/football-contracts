import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PROFIT_TYPES } from '../lib/ledger';
import { currentMonth, monthRange } from '../lib/months';

const querySchema = z.object({
  // profit: all-time profit. month: profit within one Stockholm calendar
  // month. credits: current balance, the original ranking.
  board: z.enum(['profit', 'month', 'credits']).default('profit'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

const LIMIT = 100;

export async function leaderboardRoutes(server: FastifyInstance) {
  server.get('/', async (req, reply) => {
    const { board, month: monthParam } = querySchema.parse(req.query);
    const month = monthParam ?? currentMonth();

    const users = await server.prisma.user.findMany({
      where: { emailVerified: true },
      // Email is deliberately not selected. This endpoint is public and
      // unauthenticated, so anything in the select is published.
      select: { id: true, username: true, credits: true, createdAt: true },
    });

    // Profit is what a player won or lost by playing: purchases and payouts
    // only. The starting grant, corrections and refinancing are handed out,
    // so they never move anyone up the board. A monthly board counts credits
    // in the month they moved — a coupon bought in October and paid out in
    // November is a loss in October and a gain in November.
    const range = board === 'month' ? monthRange(month) : null;
    const sums = await server.prisma.creditTransaction.groupBy({
      by: ['userId'],
      where: {
        type: { in: [...PROFIT_TYPES] },
        ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      },
      _sum: { amount: true },
    });
    const profit = new Map(sums.map((s) => [s.userId, s._sum.amount ?? 0]));

    const ranked = users
      .map((u) => ({ ...u, profit: profit.get(u.id) ?? 0 }))
      .sort((a, b) => {
        const primary = board === 'credits' ? b.credits - a.credits : b.profit - a.profit;
        // Ties: the richer player, then whoever joined first, so the order is
        // stable between refreshes rather than whatever Postgres returned.
        return primary || b.credits - a.credits || a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, LIMIT);

    // Resolved server-side so a null username can never reach the client as a
    // hole for the frontend to fill with something identifying. Accounts that
    // registered before usernames existed sit here until their next login,
    // when the gate makes them pick one.
    return reply.send({
      board,
      month: board === 'month' ? month : null,
      entries: ranked.map((u) => ({
        id: u.id,
        displayName: u.username ?? 'Anonymous',
        credits: u.credits,
        profit: u.profit,
      })),
    });
  });
}
