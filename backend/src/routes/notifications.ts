import { FastifyInstance } from 'fastify';
import { League } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../lib/guards';
import { KIND_FLAGS, NOTIFICATION_KINDS, verifyUnsubscribe, type NotificationKind } from '../lib/notifications';

const prefsSchema = z.object({
  notifyAuctionResults: z.boolean(),
  notifyPayouts: z.boolean(),
  notifyNewContracts: z.boolean(),
  favouriteLeagues: z.array(z.nativeEnum(League)).max(Object.keys(League).length),
  // Sixty teams exist; the cap only stops an absurd payload.
  favouriteTeamIds: z.array(z.string()).max(200),
});

const unsubscribeSchema = z.object({
  u: z.string().min(1),
  k: z.enum(NOTIFICATION_KINDS as [NotificationKind, ...NotificationKind[]]),
  s: z.string().min(1),
});

const PREFS_SELECT = {
  notifyAuctionResults: true,
  notifyPayouts: true,
  notifyNewContracts: true,
  favouriteLeagues: true,
  favouriteTeams: { select: { teamId: true } },
} as const;

type PrefsRow = {
  notifyAuctionResults: boolean;
  notifyPayouts: boolean;
  notifyNewContracts: boolean;
  favouriteLeagues: League[];
  favouriteTeams: { teamId: string }[];
};

function toResponse({ favouriteTeams, ...rest }: PrefsRow) {
  return { ...rest, favouriteTeamIds: favouriteTeams.map((f) => f.teamId) };
}

export async function notificationRoutes(server: FastifyInstance) {
  // RFC 8058 clients POST `List-Unsubscribe=One-Click` form-encoded. Fastify
  // has no parser for that and would answer 415, so accept it here. The body
  // carries nothing we need — the signed query string does.
  server.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) =>
    done(null, body),
  );

  server.get('/me', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const user = await server.prisma.user.findUnique({ where: { id: userId }, select: PREFS_SELECT });
    if (!user) return reply.status(404).send({ error: 'Not found' });
    return reply.send(toResponse(user));
  });

  /** Replaces the whole set — the settings page always sends every field. */
  server.put('/me', { preHandler: authenticate }, async (req, reply) => {
    const userId = (req.user as any).sub as string;
    const { favouriteTeamIds, ...flags } = prefsSchema.parse(req.body);

    // Unknown ids are dropped rather than rejected: a team removed by a sync
    // while the page was open should not make the whole save fail.
    const teams = await server.prisma.team.findMany({
      where: { id: { in: favouriteTeamIds } },
      select: { id: true },
    });

    const user = await server.prisma.user.update({
      where: { id: userId },
      data: {
        ...flags,
        favouriteLeagues: [...new Set(flags.favouriteLeagues)],
        favouriteTeams: { deleteMany: {}, create: teams.map((t) => ({ teamId: t.id })) },
      },
      select: PREFS_SELECT,
    });
    return reply.send(toResponse(user));
  });

  /**
   * One-click unsubscribe, authorised by the signed link in the mail rather
   * than a login. POST only: this is both the target of the List-Unsubscribe
   * header (RFC 8058 — mail clients POST to it) and what the confirm button on
   * /unsubscribe calls. A GET could be triggered by a link scanner.
   */
  server.post('/unsubscribe', async (req, reply) => {
    const parsed = unsubscribeSchema.safeParse(req.query);
    if (!parsed.success || !verifyUnsubscribe(parsed.data.u, parsed.data.k, parsed.data.s)) {
      return reply.status(400).send({ error: 'This unsubscribe link is not valid' });
    }
    const { u, k } = parsed.data;
    const data = Object.fromEntries(KIND_FLAGS[k].map((flag) => [flag, false]));
    // updateMany so a deleted account is a quiet no-op, not a 500.
    await server.prisma.user.updateMany({ where: { id: u }, data });
    return reply.send({ message: 'Unsubscribed', kind: k });
  });
}
