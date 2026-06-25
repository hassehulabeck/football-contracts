import { PrismaClient } from '@prisma/client';
import { fetchFinishedFixtures } from '../lib/footballApi';

const prisma = new PrismaClient();
const COUPON_PAYOUT = 100;

export async function checkContractFulfillment() {
  console.log('[checkFulfillment] Running');
  const season = new Date().getFullYear();
  const teams = await prisma.team.findMany();

  // Ingest new match results for all tracked teams
  for (const team of teams) {
    await ingestMatchesForTeam(team.id, team.externalId, season);
  }

  // Season runs April–November; contracts can only fail after it ends
  const now = new Date();
  const seasonOver = now > new Date(now.getFullYear(), 10, 30); // Nov 30

  // Evaluate all closed contracts that haven't reached a terminal state
  const contracts = await prisma.contract.findMany({
    where: { status: 'CLOSED' },
    include: { team: true },
  });

  for (const contract of contracts) {
    const matches = await prisma.match.findMany({
      where: { teamId: contract.teamId, playedAt: { gte: contract.createdAt } },
      orderBy: { playedAt: 'asc' },
    });

    // Slide a 3-match window over all results since contract creation
    let fulfilled = false;
    for (let i = 0; i <= matches.length - 3; i++) {
      const window = matches[i].result + matches[i + 1].result + matches[i + 2].result;
      if (window === contract.pattern) {
        await fulfillContract(contract.id);
        fulfilled = true;
        break;
      }
    }

    if (!fulfilled && seasonOver) {
      await prisma.contract.update({ where: { id: contract.id }, data: { status: 'FAILED' } });
      console.log(`[checkFulfillment] Contract ${contract.id} failed — season ended without pattern ${contract.pattern}`);
    }
  }
}

async function ingestMatchesForTeam(teamId: string, externalId: number, season: number) {
  try {
    const fixtures = await fetchFinishedFixtures(externalId, season);
    for (const f of fixtures) {
      const isHome = f.teams.home.id === externalId;
      const homeWon = f.teams.home.winner;
      let result: string;
      if (homeWon === null) result = 'D';
      else if (isHome) result = homeWon ? 'W' : 'L';
      else result = homeWon ? 'L' : 'W';

      await prisma.match.upsert({
        where: { externalId: f.fixture.id },
        create: {
          externalId: f.fixture.id,
          teamId,
          result,
          homeScore: f.goals.home,
          awayScore: f.goals.away,
          isHome,
          playedAt: new Date(f.fixture.date),
        },
        update: { result, homeScore: f.goals.home, awayScore: f.goals.away },
      });
    }
  } catch (err) {
    console.error(`[checkFulfillment] Failed to ingest matches for team ${externalId}:`, err);
  }
}

async function fulfillContract(contractId: string) {
  const coupons = await prisma.coupon.findMany({
    where: { contractId, ownerId: { not: null }, paidOut: false },
  });

  await prisma.$transaction([
    ...coupons.map((c) =>
      prisma.user.update({ where: { id: c.ownerId! }, data: { credits: { increment: COUPON_PAYOUT } } })
    ),
    ...coupons.map((c) =>
      prisma.coupon.update({ where: { id: c.id }, data: { paidOut: true } })
    ),
    prisma.contract.update({ where: { id: contractId }, data: { status: 'FULFILLED' } }),
  ]);

  console.log(`[checkFulfillment] Contract ${contractId} fulfilled — paid out ${coupons.length} coupons`);
}
