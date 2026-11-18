import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { currentMonth } from '../lib/months';
import { rankPlayers } from '../lib/standings';

export const boardQuerySchema = z.object({
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
  // Public and unauthenticated, so anything rankPlayers selects is published.
  server.get('/', async (req, reply) => {
    const { board, month: monthParam } = boardQuerySchema.parse(req.query);
    const month = monthParam ?? currentMonth();
    const entries = await rankPlayers(server.prisma, { board, month, limit: LIMIT });
    return reply.send({ board, month: board === 'month' ? month : null, entries });
  });
}
