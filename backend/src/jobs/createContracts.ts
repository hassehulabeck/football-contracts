import { PrismaClient, ContractPattern } from '@prisma/client';

const prisma = new PrismaClient();
const PATTERNS: ContractPattern[] = ['WWW', 'DDD', 'LLL', 'WDL', 'LDW'];
const CONTRACTS_PER_BATCH = 25;

export async function createWeeklyContracts() {
  console.log('[createContracts] Starting weekly contract generation');

  const teams = await prisma.team.findMany();
  if (teams.length === 0) {
    console.warn('[createContracts] No teams in database — skipping');
    return;
  }

  const userCount = await prisma.user.count({ where: { emailVerified: true } });
  const couponCount = userCount > 50 ? Math.floor(userCount * 0.1) : 5;

  const auctionEnd = new Date();
  auctionEnd.setHours(auctionEnd.getHours() + 48);

  for (let i = 0; i < CONTRACTS_PER_BATCH; i++) {
    const team = teams[Math.floor(Math.random() * teams.length)];
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];

    const contract = await prisma.contract.create({
      data: {
        teamId: team.id,
        pattern,
        status: 'ACTIVE',
        couponCount,
        coupons: {
          create: Array.from({ length: couponCount }, () => ({})),
        },
        auction: {
          create: { endsAt: auctionEnd },
        },
      },
    });

    console.log(`[createContracts] Created contract ${contract.id} for ${team.name} (${pattern})`);
  }

  console.log(`[createContracts] Done — ${CONTRACTS_PER_BATCH} contracts created`);
}
