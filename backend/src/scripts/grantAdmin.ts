/**
 * Makes an account an admin — or, with --revoke, stops it being one.
 *
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:grant -- someone@example.com --revoke
 *
 * In production, over SSH (there is deliberately no API route for this):
 *   railway ssh --service football-coupons-backend "cd /app && npm run -s admin:grant:prod -- someone@example.com"
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const revoke = process.argv.includes('--revoke');
  if (!email) throw new Error('usage: admin:grant -- <email> [--revoke]');

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isAdmin: true } });
  if (!user) throw new Error(`no account with email ${email}`);

  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: !revoke } });
  console.log(`${email}: isAdmin ${user.isAdmin} → ${!revoke}`);
}

main()
  .catch((err) => {
    console.error(`ERROR: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
