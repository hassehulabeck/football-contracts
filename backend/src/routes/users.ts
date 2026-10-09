import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { authenticate } from '../lib/guards';

/**
 * 3–20 characters, letters/digits/underscore/hyphen. Deliberately narrow: this
 * is rendered unescaped in the leaderboard, and a name that can hold spaces or
 * lookalike unicode is a name that can impersonate another player.
 */
const usernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
});

const RENAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const deleteAccountSchema = z.object({ password: z.string().min(1) });

const transactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  // The id of the last row of the previous page.
  cursor: z.string().optional(),
});

export async function userRoutes(server: FastifyInstance) {
  server.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await server.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        // Null means the account has never set one. The frontend gate reads
        // this and forces the player to /settings/username before anything
        // else, so it must stay on this response.
        username: true,
        usernameChangedAt: true,
        credits: true,
        // Shows the Admin link. The server re-checks on every admin request;
        // this only decides what the navbar renders.
        isAdmin: true,
        createdAt: true,
        coupons: {
          include: {
            contract: { include: { team: true, auction: { select: { endsAt: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        // Deliberately unfiltered. Closed auctions used to be excluded here,
        // which meant a losing bid vanished the moment its auction settled —
        // the player never saw it again. Both live and settled bids are
        // fetched now and split below.
        bids: {
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
                    // externalId is the api-football team id the crest URL is
                    // built from — the coupons above get it via `team: true`.
                    team: { select: { name: true, league: true, externalId: true } },
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

    // A settled bid won if it earned a coupon on that contract. There is no
    // relation from Bid to Coupon — closeAuctions writes ownerId and nothing
    // links back — so ownership is the only evidence, and the coupons above
    // already carry it.
    const wonContractIds = new Set(user.coupons.map((c) => c.contractId));

    // `bids` keeps its name and shape: the dashboard's Active bids table reads
    // it as-is and should not have to change.
    const bids = user.bids.filter((b) => !b.auction.closed);
    // Winners are omitted — they surface as coupons instead, and listing them
    // here would show the same contract twice.
    const lostBids = user.bids.filter(
      (b) => b.auction.closed && !wonContractIds.has(b.auction.contract.id),
    );

    // What each coupon cost. Settlement charges the winning bid's own amount,
    // a player has one bid per auction, and bids are frozen once it closes, so
    // the bid on the coupon's contract is exactly what was paid. Null only if
    // that bid row is ever missing.
    const pricePaid = new Map(user.bids.map((b) => [b.auction.contract.id, b.amount]));
    const coupons = user.coupons.map((c) => ({ ...c, pricePaid: pricePaid.get(c.contractId) ?? null }));

    return reply.send({ ...user, coupons, bids, lostBids });
  });

  /**
   * The player's credit history, newest first, a page at a time. Each row
   * carries the contract it concerns so the list can say what was bought or
   * paid out without a second request.
   */
  server.get('/me/transactions', { preHandler: authenticate }, async (req, reply) => {
    const { limit, cursor } = transactionsQuerySchema.parse(req.query);
    const userId = (req.user as any).sub as string;

    const rows = await server.prisma.creditTransaction.findMany({
      where: { userId },
      // id breaks ties: a payout run writes several rows in the same instant.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        amount: true,
        type: true,
        note: true,
        createdAt: true,
        contract: {
          select: {
            id: true,
            pattern: true,
            team: { select: { name: true, league: true, externalId: true } },
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const transactions = hasMore ? rows.slice(0, limit) : rows;
    return reply.send({
      transactions,
      nextCursor: hasMore ? transactions[transactions.length - 1].id : null,
    });
  });

  /**
   * Set or change the public username.
   *
   * The cooldown is enforced here rather than by hiding the form: the
   * leaderboard is the only place a player is identifiable, and a name that
   * can be changed freely can be used to shed a reputation or to briefly
   * squat someone else's.
   */
  server.patch('/me/username', { preHandler: authenticate }, async (req, reply) => {
    const parsed = usernameSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: '3–20 characters, using letters, digits, underscores or hyphens',
        details: parsed.error.flatten(),
      });
    }
    const { username } = parsed.data;

    const userId = (req.user as any).sub as string;
    const user = await server.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: 'Not found' });

    // Checked before the cooldown: submitting the name you already have is not
    // a rename, and answering it with "come back in 30 days" is a lie.
    if (user.username === username) {
      return reply.send({ id: user.id, username: user.username });
    }

    // Null usernameChangedAt means this is the first set, which is never
    // rate-limited — otherwise the forced-setup flow would lock the account out.
    if (user.usernameChangedAt) {
      const eligibleAt = new Date(user.usernameChangedAt.getTime() + RENAME_COOLDOWN_MS);
      if (eligibleAt > new Date()) {
        return reply.status(429).send({
          error: 'A username can only be changed once every 30 days',
          eligibleAt: eligibleAt.toISOString(),
        });
      }
    }

    // Checked case-insensitively even though the index is not: "hanand" and
    // "HanAnd" on a leaderboard are one player impersonating another.
    const clash = await server.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' }, id: { not: userId } },
      select: { id: true },
    });
    if (clash) return reply.status(409).send({ error: 'That username is taken' });

    try {
      const updated = await server.prisma.user.update({
        where: { id: userId },
        data: { username, usernameChangedAt: new Date() },
      });
      return reply.send({ id: updated.id, username: updated.username });
    } catch (err: any) {
      // The check above and this write are not atomic. P2002 is the unique
      // index catching a same-case claim that landed in between.
      if (err?.code === 'P2002') {
        return reply.status(409).send({ error: 'That username is taken' });
      }
      throw err;
    }
  });

  /**
   * Deletes the account and everything tied to it, for good. The password is
   * asked again so a borrowed, still-signed-in browser cannot do it.
   *
   * Bids go (including any on open auctions, which simply drop out of them).
   * Coupons are released rather than deleted: the contract keeps its count,
   * the coupon just has no owner, and payouts skip ownerless coupons. Ledger
   * rows and favourites cascade with the user. Feedback keeps the message
   * but loses the link to the account.
   */
  server.delete('/me', { preHandler: authenticate }, async (req, reply) => {
    const { password } = deleteAccountSchema.parse(req.body);
    const userId = (req.user as any).sub as string;

    const user = await server.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(403).send({ error: 'Wrong password' });
    }

    await server.prisma.$transaction([
      server.prisma.bid.deleteMany({ where: { userId } }),
      server.prisma.coupon.updateMany({ where: { ownerId: userId }, data: { ownerId: null } }),
      server.prisma.feedback.updateMany({ where: { userId }, data: { userId: null, replyTo: null } }),
      server.prisma.user.delete({ where: { id: userId } }),
    ]);

    return reply.send({ message: 'Account deleted' });
  });
}
