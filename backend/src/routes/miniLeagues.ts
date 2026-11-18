import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../lib/guards';
import { currentMonth } from '../lib/months';
import {
  MAX_LEAGUES_PER_PLAYER,
  MAX_MEMBERS,
  newInviteCode,
  normaliseInviteCode,
  removeMember,
} from '../lib/miniLeagues';
import { rankPlayers } from '../lib/standings';
import { boardQuerySchema } from './leaderboard';

const nameSchema = z.string().trim().min(3, 'Name must be at least 3 characters').max(40);
const createSchema = z.object({ name: nameSchema }).strict();
const renameSchema = z.object({ name: nameSchema }).strict();
const joinSchema = z.object({ code: z.string().min(4).max(20) }).strict();
const idParam = z.object({ id: z.string().min(1) });
const memberParam = z.object({ id: z.string().min(1), userId: z.string().min(1) });
const codeParam = z.object({ code: z.string().min(4).max(20) });

const userIdOf = (req: { user: unknown }) => (req.user as { sub: string }).sub;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export async function miniLeagueRoutes(server: FastifyInstance) {
  /** A unique code, retried on the (astronomically rare) collision. */
  async function withFreshCode<T>(write: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await write(newInviteCode());
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= 4) throw err;
      }
    }
  }

  /** The league if the caller is in it, else null. */
  async function memberLeague(leagueId: string, userId: string) {
    const league = await server.prisma.miniLeague.findFirst({
      where: { id: leagueId, members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
    });
    return league;
  }

  /**
   * What an invite link shows before anyone signs in: the league's name, its
   * size and who runs it. Public, because the link is meant to be opened by
   * people without an account yet — and it powers the link preview.
   */
  server.get('/invite/:code', async (req, reply) => {
    const { code } = codeParam.parse(req.params);
    const league = await server.prisma.miniLeague.findUnique({
      where: { inviteCode: normaliseInviteCode(code) },
      select: {
        id: true,
        name: true,
        owner: { select: { username: true } },
        _count: { select: { members: true } },
      },
    });
    if (!league) return reply.status(404).send({ error: 'This invite link is not valid any more' });
    return reply.send({
      id: league.id,
      name: league.name,
      ownerName: league.owner?.username ?? null,
      memberCount: league._count.members,
    });
  });

  /** The caller's leagues, newest membership first. */
  server.get('/', { preHandler: authenticate }, async (req, reply) => {
    const userId = userIdOf(req);
    const memberships = await server.prisma.miniLeagueMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      include: {
        league: { select: { id: true, name: true, ownerId: true, _count: { select: { members: true } } } },
      },
    });
    return reply.send({
      leagues: memberships.map((m) => ({
        id: m.league.id,
        name: m.league.name,
        memberCount: m.league._count.members,
        isOwner: m.league.ownerId === userId,
      })),
    });
  });

  server.post('/', { preHandler: authenticate }, async (req, reply) => {
    const userId = userIdOf(req);
    const { name } = createSchema.parse(req.body);

    const count = await server.prisma.miniLeagueMember.count({ where: { userId } });
    if (count >= MAX_LEAGUES_PER_PLAYER) {
      return reply.status(409).send({ error: `You can be in at most ${MAX_LEAGUES_PER_PLAYER} mini-leagues` });
    }

    const league = await withFreshCode((inviteCode) =>
      server.prisma.miniLeague.create({
        data: { name, inviteCode, ownerId: userId, members: { create: { userId } } },
        select: { id: true, name: true, inviteCode: true },
      }),
    );
    return reply.status(201).send(league);
  });

  /** Idempotent: joining a league you are already in just answers with it. */
  server.post('/join', { preHandler: authenticate }, async (req, reply) => {
    const userId = userIdOf(req);
    const code = normaliseInviteCode(joinSchema.parse(req.body).code);

    const league = await server.prisma.miniLeague.findUnique({
      where: { inviteCode: code },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    if (!league) return reply.status(404).send({ error: 'This invite link is not valid any more' });

    const already = await server.prisma.miniLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    });
    if (already) return reply.send({ id: league.id, name: league.name, joined: false });

    if (league._count.members >= MAX_MEMBERS) {
      return reply.status(409).send({ error: 'This mini-league is full' });
    }
    const count = await server.prisma.miniLeagueMember.count({ where: { userId } });
    if (count >= MAX_LEAGUES_PER_PLAYER) {
      return reply.status(409).send({ error: `You can be in at most ${MAX_LEAGUES_PER_PLAYER} mini-leagues` });
    }

    try {
      await server.prisma.miniLeagueMember.create({ data: { leagueId: league.id, userId } });
    } catch (err) {
      // A double-click raced the check above; the player is in either way.
      if (!isUniqueViolation(err)) throw err;
    }
    return reply.send({ id: league.id, name: league.name, joined: true });
  });

  /** The table. Members only: who is in a private league is the members' business. */
  server.get('/:id', { preHandler: authenticate }, async (req, reply) => {
    const userId = userIdOf(req);
    const { id } = idParam.parse(req.params);
    const { board, month: monthParam } = boardQuerySchema.parse(req.query);
    const month = monthParam ?? currentMonth();

    const league = await memberLeague(id, userId);
    if (!league) return reply.status(404).send({ error: 'Not found' });

    const members = await server.prisma.miniLeagueMember.findMany({
      where: { leagueId: id },
      select: { userId: true },
    });
    const entries = await rankPlayers(server.prisma, { board, month, userIds: members.map((m) => m.userId) });

    const isOwner = league.ownerId === userId;
    return reply.send({
      id: league.id,
      name: league.name,
      memberCount: league._count.members,
      isOwner,
      ownerId: league.ownerId,
      inviteCode: league.inviteCode,
      board,
      month: board === 'month' ? month : null,
      entries,
    });
  });

  // ─── Owner only ────────────────────────────────────────────────────────────

  async function ownedLeague(leagueId: string, userId: string) {
    return server.prisma.miniLeague.findFirst({ where: { id: leagueId, ownerId: userId } });
  }

  server.patch('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { name } = renameSchema.parse(req.body);
    if (!(await ownedLeague(id, userIdOf(req)))) return reply.status(404).send({ error: 'Not found' });
    const league = await server.prisma.miniLeague.update({ where: { id }, data: { name }, select: { id: true, name: true } });
    return reply.send(league);
  });

  /** A new code; the old link stops working at once. For a link that leaked. */
  server.post('/:id/invite-code', { preHandler: authenticate }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    if (!(await ownedLeague(id, userIdOf(req)))) return reply.status(404).send({ error: 'Not found' });
    const league = await withFreshCode((inviteCode) =>
      server.prisma.miniLeague.update({ where: { id }, data: { inviteCode }, select: { inviteCode: true } }),
    );
    return reply.send(league);
  });

  server.delete('/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    if (!(await ownedLeague(id, userIdOf(req)))) return reply.status(404).send({ error: 'Not found' });
    await server.prisma.miniLeague.delete({ where: { id } });
    return reply.send({ message: 'Mini-league deleted' });
  });

  /**
   * Leave (your own id, or "me"), or — for the owner — remove someone else.
   * Either way it goes through removeMember, so an owner who leaves hands the
   * league on instead of orphaning it.
   */
  server.delete('/:id/members/:userId', { preHandler: authenticate }, async (req, reply) => {
    const callerId = userIdOf(req);
    const params = memberParam.parse(req.params);
    const targetId = params.userId === 'me' ? callerId : params.userId;

    const league = await memberLeague(params.id, callerId);
    if (!league) return reply.status(404).send({ error: 'Not found' });
    if (targetId !== callerId && league.ownerId !== callerId) {
      return reply.status(403).send({ error: 'Only the owner can remove players' });
    }

    await server.prisma.$transaction((tx) => removeMember(tx, params.id, targetId));
    return reply.send({ message: targetId === callerId ? 'You left the mini-league' : 'Player removed' });
  });
}
