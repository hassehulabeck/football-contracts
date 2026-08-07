import { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * 3–20 characters, letters/digits/underscore/hyphen. Deliberately narrow: this
 * is rendered unescaped in the leaderboard, and a name that can hold spaces or
 * lookalike unicode is a name that can impersonate another player.
 */
const usernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
});

const RENAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export async function userRoutes(server: FastifyInstance) {
  const authenticate = async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  };

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
                    team: { select: { name: true, league: true } },
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

    return reply.send({ ...user, bids, lostBids });
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
}
