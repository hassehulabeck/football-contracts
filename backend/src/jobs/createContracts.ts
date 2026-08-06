import { PrismaClient, ContractPattern } from '@prisma/client';

const prisma = new PrismaClient();
const PATTERNS: ContractPattern[] = ['WWW', 'DDD', 'LLL', 'WDL', 'LDW'];
const CONTRACTS_PER_BATCH = 25;
const AUCTION_HOURS = 48;

export type CreateContractsOptions = {
  count?: number;
  /** Auction duration in hours. Shorten it to watch a full cycle on demand. */
  auctionHours?: number;
  dryRun?: boolean;
  log?: (msg: string) => void;
};

export async function createWeeklyContracts(opts: CreateContractsOptions = {}) {
  const count = opts.count ?? CONTRACTS_PER_BATCH;
  const auctionHours = opts.auctionHours ?? AUCTION_HOURS;
  const dryRun = opts.dryRun ?? false;
  const log = opts.log ?? ((msg: string) => console.log(`[createContracts] ${msg}`));

  log('Starting contract generation');

  const teams = await prisma.team.findMany();
  if (teams.length === 0) {
    log('No teams in database — skipping');
    return { created: 0, couponCount: 0, auctionEnd: null as Date | null };
  }

  // Coupon supply tracks the player base: 10% of verified users once past 50.
  const userCount = await prisma.user.count({ where: { emailVerified: true } });
  const couponCount = userCount > 50 ? Math.floor(userCount * 0.1) : 5;

  const auctionEnd = new Date(Date.now() + auctionHours * 60 * 60 * 1000);

  let created = 0;
  for (let i = 0; i < count; i++) {
    const team = teams[Math.floor(Math.random() * teams.length)];
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];

    if (dryRun) {
      log(`[DRY] would create ${team.name} (${pattern})`);
      created++;
      continue;
    }

    const contract = await prisma.contract.create({
      data: {
        teamId: team.id,
        pattern,
        status: 'ACTIVE',
        couponCount,
        coupons: { create: Array.from({ length: couponCount }, () => ({})) },
        auction: { create: { endsAt: auctionEnd } },
      },
    });
    created++;

    log(`Created contract ${contract.id} for ${team.name} (${pattern})`);
  }

  log(
    `Done — ${created} contracts, ${couponCount} coupons each, ` +
      `auction ends ${auctionEnd.toISOString()}`,
  );

  return { created, couponCount, auctionEnd };
}
