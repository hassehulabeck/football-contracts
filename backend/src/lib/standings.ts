import type { PrismaClient } from '@prisma/client';
import { PROFIT_TYPES } from './ledger';
import { monthRange } from './months';

export type Board = 'profit' | 'month' | 'credits';

export interface StandingsEntry {
  id: string;
  displayName: string;
  credits: number;
  profit: number;
}

/**
 * Players ranked for one board. The public leaderboard and every mini-league
 * call this, so a mini-league table always agrees with the public one —
 * `userIds` only narrows who is in it.
 *
 * Profit is what a player won or lost by playing: purchases and payouts
 * only. The starting grant, corrections and refinancing are handed out, so
 * they never move anyone up the board. A monthly board counts credits in the
 * month they moved — a coupon bought in October and paid out in November is a
 * loss in October and a gain in November.
 */
export async function rankPlayers(
  prisma: PrismaClient,
  opts: { board: Board; month: string; userIds?: string[]; limit?: number },
): Promise<StandingsEntry[]> {
  const { board, month, userIds, limit } = opts;
  const scope = userIds ? { id: { in: userIds } } : {};

  const users = await prisma.user.findMany({
    where: { emailVerified: true, ...scope },
    // Email is deliberately not selected: callers publish whatever is here.
    select: { id: true, username: true, credits: true, createdAt: true },
  });

  const range = board === 'month' ? monthRange(month) : null;
  const sums = await prisma.creditTransaction.groupBy({
    by: ['userId'],
    where: {
      type: { in: [...PROFIT_TYPES] },
      ...(userIds ? { userId: { in: userIds } } : {}),
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
    });

  // Resolved server-side so a null username can never reach the client as a
  // hole for the frontend to fill with something identifying. Accounts that
  // registered before usernames existed sit here until their next login,
  // when the gate makes them pick one.
  return (limit ? ranked.slice(0, limit) : ranked).map((u) => ({
    id: u.id,
    displayName: u.username ?? 'Anonymous',
    credits: u.credits,
    profit: u.profit,
  }));
}
