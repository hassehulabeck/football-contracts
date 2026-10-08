import type { FastifyReply, FastifyRequest } from 'fastify';

/** preHandler: the request carries a valid JWT. `req.user.sub` is the user id. */
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

/**
 * preHandler: a valid JWT *and* an admin account. The flag is read from the
 * database on every request instead of being baked into the token, so
 * revoking it takes effect at once rather than when the token expires.
 */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const userId = (req.user as { sub: string }).sub;
  const user = await req.server.prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return reply.status(403).send({ error: 'Forbidden' });
}
