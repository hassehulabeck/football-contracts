import { FastifyInstance } from 'fastify';
import { ContractStatus, League, Prisma } from '@prisma/client';
import { z } from 'zod';
import { findPatternWindow, patternProgress } from '../lib/fulfillment';

/**
 * Player-facing status values, mapped onto the enum.
 *
 * "CLOSED" is not exposed under that name: to a player it reads as *finished*,
 * when it actually means the auction is over and the result is still pending.
 * PENDING is not exposed at all — it is the schema default that
 * createWeeklyContracts never writes.
 */
const STATUS_GROUPS: Record<string, ContractStatus[]> = {
  open: ['ACTIVE'],
  awaiting: ['CLOSED'],
  fulfilled: ['FULFILLED'],
  failed: ['FAILED'],
  all: ['ACTIVE', 'CLOSED', 'FULFILLED', 'FAILED'],
};

/** What the endpoint returned before it took any parameters. */
const DEFAULT_STATUSES: ContractStatus[] = ['ACTIVE', 'CLOSED'];

const RESOLVED: ContractStatus[] = ['FULFILLED', 'FAILED'];

const MAX_PAGE_SIZE = 100;

const listQuerySchema = z.object({
  status: z.enum(['open', 'awaiting', 'fulfilled', 'failed', 'all']).optional(),
  league: z.nativeEnum(League).optional(),
  teamId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Clamped rather than rejected: an oversized pageSize is a caller being
  // optimistic, not an error worth failing the request over.
  pageSize: z.coerce.number().int().min(1).catch(50).default(50),
});

export async function contractRoutes(server: FastifyInstance) {
  // List contracts, filtered and paginated.
  //
  // Unfiltered, this returns exactly what it always did (ACTIVE + CLOSED).
  // That default is load-bearing during a deploy: backend and frontend are
  // separate Railway services off one push, so the new backend briefly serves
  // the old frontend.
  server.get('/', async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { status, league, teamId, page } = parsed.data;
    const pageSize = Math.min(parsed.data.pageSize, MAX_PAGE_SIZE);

    const statuses = status ? STATUS_GROUPS[status] : DEFAULT_STATUSES;

    const where: Prisma.ContractWhereInput = {
      status: { in: statuses },
      ...(teamId ? { teamId } : {}),
      ...(league ? { team: { league } } : {}),
    };

    // A resolved-only list is a results feed, so it reads newest-resolved
    // first. Anything that can still include live contracts orders by creation,
    // since those have no resolvedAt to sort on.
    const resolvedOnly = statuses.every((s) => RESOLVED.includes(s));
    const orderBy: Prisma.ContractOrderByWithRelationInput = resolvedOnly
      ? { resolvedAt: 'desc' }
      : { createdAt: 'desc' };

    const [contracts, total] = await server.prisma.$transaction([
      server.prisma.contract.findMany({
        where,
        include: {
          team: true,
          auction: {
            select: { endsAt: true, closed: true, _count: { select: { bids: true } } },
          },
          _count: { select: { coupons: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      server.prisma.contract.count({ where }),
    ]);

    // Flatten the bid count onto the auction, the way GET /api/auctions/:id
    // already presents it, so the list column reads `auction.bidCount` rather
    // than digging through Prisma's `_count`.
    const shaped = contracts.map((c) => ({
      ...c,
      auction: c.auction ? { ...c.auction, bidCount: c.auction._count.bids } : null,
    }));

    return reply.send({ contracts: shaped, total, page, pageSize });
  });

  server.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const contract = await server.prisma.contract.findUnique({
      where: { id },
      include: {
        team: true,
        auction: {
          select: {
            id: true,
            endsAt: true,
            closed: true,
            _count: { select: { bids: true } },
          },
        },
      },
    });
    if (!contract) return reply.status(404).send({ error: 'Not found' });

    // How many coupons found an owner, and how many have actually paid out.
    // Not the same as couponCount: bidders who could not cover their bid at
    // settlement are skipped, so a contract can close undersubscribed.
    const [couponsSold, couponsPaid] = await server.prisma.$transaction([
      server.prisma.coupon.count({ where: { contractId: id, ownerId: { not: null } } }),
      server.prisma.coupon.count({ where: { contractId: id, paidOut: true } }),
    ]);

    const fulfillment =
      contract.status === 'FULFILLED' ? await fulfillmentDetail(server, contract) : null;

    // Both unconditional, unlike `fulfillment`. Form is what a bidder wants
    // before deciding, so it has to be there while the auction is still open,
    // and pattern progress is the same question one match at a time. Progress is
    // not restricted to live contracts either: on a resolved one it is the run
    // that did or did not get there, which is what someone reading an old
    // contract came to see.
    const [schedule, progress] = await Promise.all([
      teamSchedule(server, contract.teamId),
      progressDetail(server, contract),
    ]);

    return reply.send({ ...contract, couponsSold, couponsPaid, fulfillment, schedule, progress });
  });
}

/**
 * The team's whole season either side of now: fixtures still to come, and
 * every result already in.
 *
 * Not scoped to the contract. `fulfillment` answers "which matches paid this
 * out"; this answers "how is this team playing", which is the question a bidder
 * has before an auction closes, and it does not stop at the contract's window.
 */
async function teamSchedule(server: FastifyInstance, teamId: string) {
  const now = new Date();

  const [upcoming, recent] = await server.prisma.$transaction([
    // Filtered on kickoffAt, not on the Fixture table being current. The weekly
    // refresh leaves a played fixture sitting here until the next run, and
    // without this it would show up as still to come.
    server.prisma.fixture.findMany({
      where: { teamId, kickoffAt: { gte: now } },
      orderBy: { kickoffAt: 'asc' },
    }),
    server.prisma.match.findMany({
      where: { teamId },
      orderBy: { playedAt: 'desc' },
    }),
  ]);

  // Same sibling-row trick as fulfillmentDetail: ingest writes one row per side
  // of a fixture, so the row on the same externalId with a different teamId is
  // the opponent.
  const [fixtureSiblings, matchSiblings] = await server.prisma.$transaction([
    server.prisma.fixture.findMany({
      where: { externalId: { in: upcoming.map((f) => f.externalId) }, teamId: { not: teamId } },
      select: { externalId: true, team: { select: { name: true } } },
    }),
    server.prisma.match.findMany({
      where: { externalId: { in: recent.map((m) => m.externalId) }, teamId: { not: teamId } },
      select: { externalId: true, team: { select: { name: true } } },
    }),
  ]);

  const upcomingOpponent = new Map(fixtureSiblings.map((f) => [f.externalId, f.team.name]));
  const recentOpponent = new Map(matchSiblings.map((m) => [m.externalId, m.team.name]));

  return {
    upcoming: upcoming.map((f) => ({
      kickoffAt: f.kickoffAt,
      isHome: f.isHome,
      status: f.status,
      opponent: upcomingOpponent.get(f.externalId) ?? null,
    })),
    recent: recent.map((m) => ({
      playedAt: m.playedAt,
      result: m.result,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      isHome: m.isHome,
      opponent: recentOpponent.get(m.externalId) ?? null,
    })),
  };
}

/**
 * The three matches that completed the pattern, with opponents.
 *
 * Re-derived rather than stored: findPatternWindow is the same function
 * checkFulfillment used to decide the payout, over the same query, so the two
 * cannot disagree.
 */
async function fulfillmentDetail(
  server: FastifyInstance,
  contract: { id: string; teamId: string; pattern: string; createdAt: Date },
) {
  const matches = await server.prisma.match.findMany({
    where: { teamId: contract.teamId, playedAt: { gte: contract.createdAt } },
    orderBy: { playedAt: 'asc' },
  });

  const window = findPatternWindow(matches, contract.pattern);
  if (!window) return null;

  // Ingest writes one row per side of every fixture, so the sibling row on the
  // same externalId names the opponent — no join table needed.
  const siblings = await server.prisma.match.findMany({
    where: {
      externalId: { in: window.map((m) => m.externalId) },
      teamId: { not: contract.teamId },
    },
    select: { externalId: true, team: { select: { name: true } } },
  });
  const opponentByFixture = new Map(siblings.map((s) => [s.externalId, s.team.name]));

  return {
    matches: window.map((m) => ({
      playedAt: m.playedAt,
      result: m.result,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      isHome: m.isHome,
      // Null only if syncTeams has a gap — ingest is restricted to the four
      // leagues, so both clubs are normally tracked. Better one unnamed
      // opponent than a 500 on the whole page.
      opponent: opponentByFixture.get(m.externalId) ?? null,
    })),
  };
}

/**
 * How far through the pattern the team is right now, and on which matches.
 *
 * Deliberately the same query as fulfillmentDetail — same team, same "played
 * after the contract was created", same ascending order — because patternProgress
 * settles completion through findPatternWindow. Narrow this query and the page
 * would start counting matches the payout job does not.
 */
async function progressDetail(
  server: FastifyInstance,
  contract: { teamId: string; pattern: string; createdAt: Date },
) {
  const matches = await server.prisma.match.findMany({
    where: { teamId: contract.teamId, playedAt: { gte: contract.createdAt } },
    orderBy: { playedAt: 'asc' },
  });

  const progress = patternProgress(matches, contract.pattern);

  // Nothing to name, and nothing for the letters to point at.
  if (progress.matched === 0) return { matched: 0, complete: false, matches: [] };

  // Same sibling-row trick as fulfillmentDetail.
  const siblings = await server.prisma.match.findMany({
    where: {
      externalId: { in: progress.matches.map((m) => m.externalId) },
      teamId: { not: contract.teamId },
    },
    select: { externalId: true, team: { select: { name: true } } },
  });
  const opponentByFixture = new Map(siblings.map((s) => [s.externalId, s.team.name]));

  return {
    matched: progress.matched,
    complete: progress.complete,
    matches: progress.matches.map((m) => ({
      playedAt: m.playedAt,
      result: m.result,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      isHome: m.isHome,
      opponent: opponentByFixture.get(m.externalId) ?? null,
    })),
  };
}
