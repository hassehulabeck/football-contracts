import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { prismaPlugin } from './plugins/prisma';
import { authRoutes } from './routes/auth';
import { contractRoutes } from './routes/contracts';
import { teamRoutes } from './routes/teams';
import { auctionRoutes } from './routes/auctions';
import { userRoutes } from './routes/users';
import { leaderboardRoutes } from './routes/leaderboard';
import { leagueRoutes } from './routes/leagues';
import { adminRoutes } from './routes/admin';
import { notificationRoutes } from './routes/notifications';
import { registerJobs } from './jobs';

const server = Fastify({ logger: true });

// FRONTEND_URL is the canonical address (activation links use it); CORS_ORIGINS
// lists every address the frontend is served from, e.g. the custom domain *and*
// the railway.app one. A browser on an unlisted origin gets a preflight without
// an allow header and never sends the request at all.
const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

async function start() {
  await server.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await server.register(prismaPlugin);

  // Routes validate with `schema.parse()`, which throws; without this a bad
  // request body surfaced as a 500 and the frontend could only say
  // "Something went wrong".
  server.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      const field = issue.path.join('.');
      return reply.status(400).send({
        error: field ? `${field}: ${issue.message}` : issue.message,
        details: err.flatten(),
      });
    }
    reply.send(err);
  });

  // Railway polls this to decide when the container is live and ready for traffic.
  server.get('/health', async () => ({ status: 'ok' }));

  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(contractRoutes, { prefix: '/api/contracts' });
  await server.register(teamRoutes, { prefix: '/api/teams' });
  await server.register(auctionRoutes, { prefix: '/api/auctions' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(leaderboardRoutes, { prefix: '/api/leaderboard' });
  await server.register(leagueRoutes, { prefix: '/api/leagues' });
  await server.register(adminRoutes, { prefix: '/api/admin' });
  await server.register(notificationRoutes, { prefix: '/api/notifications' });

  registerJobs();

  const port = Number(process.env.PORT ?? 4000);
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Backend running on port ${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
