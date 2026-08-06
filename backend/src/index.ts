import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prismaPlugin } from './plugins/prisma';
import { authRoutes } from './routes/auth';
import { contractRoutes } from './routes/contracts';
import { teamRoutes } from './routes/teams';
import { auctionRoutes } from './routes/auctions';
import { userRoutes } from './routes/users';
import { leaderboardRoutes } from './routes/leaderboard';
import { registerJobs } from './jobs';

const server = Fastify({ logger: true });

async function start() {
  await server.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await server.register(prismaPlugin);

  // Railway polls this to decide when the container is live and ready for traffic.
  server.get('/health', async () => ({ status: 'ok' }));

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(contractRoutes, { prefix: '/api/contracts' });
  await server.register(teamRoutes, { prefix: '/api/teams' });
  await server.register(auctionRoutes, { prefix: '/api/auctions' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(leaderboardRoutes, { prefix: '/api/leaderboard' });

  registerJobs();

  const port = Number(process.env.PORT ?? 4000);
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Backend running on port ${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
