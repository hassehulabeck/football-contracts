import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendFeedbackEmail } from '../lib/email';

const feedbackSchema = z.object({
  message: z.string().trim().min(5).max(4000),
  replyTo: z.string().trim().email().max(200).optional().or(z.literal('')),
  page: z.string().max(200).optional(),
  // Honeypot: hidden from people, filled in by form-spamming bots.
  website: z.string().optional(),
});

// Per-IP throttle, in memory. One process serves the site, so a restart
// resetting it is the only gap, and that is acceptable for a contact form.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(ip, hits);
    return true;
  }
  recent.set(ip, [...hits, now]);
  return false;
}

export async function feedbackRoutes(server: FastifyInstance) {
  /** Open to visitors too; a signed-in sender is identified from the token. */
  server.post('/', async (req, reply) => {
    const body = feedbackSchema.parse(req.body);
    // Answered as a success so the bot learns nothing.
    if (body.website) return reply.send({ message: 'Thanks!' });
    if (throttled(req.ip)) {
      return reply.status(429).send({ error: 'Too many messages — please try again in an hour' });
    }

    let user: { id: string; email: string; username: string | null } | null = null;
    try {
      await req.jwtVerify();
      user = await server.prisma.user.findUnique({
        where: { id: (req.user as { sub: string }).sub },
        select: { id: true, email: true, username: true },
      });
    } catch {
      // Not signed in — fine.
    }

    const replyTo = body.replyTo || user?.email || null;
    const fb = await server.prisma.feedback.create({
      data: { message: body.message, replyTo, userId: user?.id ?? null, page: body.page ?? null },
    });

    const emailed = await sendFeedbackEmail({
      message: body.message,
      replyTo,
      username: user?.username ?? null,
      page: body.page ?? null,
    });
    if (emailed) await server.prisma.feedback.update({ where: { id: fb.id }, data: { emailed: true } });

    return reply.send({ message: 'Thanks!' });
  });
}
