import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import { sendActivationEmail } from '../lib/email';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(server: FastifyInstance) {
  server.post('/register', async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await server.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const activationToken = crypto.randomBytes(32).toString('hex');

    const user = await server.prisma.user.create({
      data: { email: body.email, passwordHash, activationToken },
    });

    await sendActivationEmail(user.email, activationToken);

    return reply.status(201).send({ message: 'Check your email to activate your account' });
  });

  server.get('/activate', async (req, reply) => {
    const { token } = req.query as { token?: string };
    if (!token) return reply.status(400).send({ error: 'Missing token' });

    const user = await server.prisma.user.findUnique({
      where: { activationToken: token },
    });
    if (!user) return reply.status(404).send({ error: 'Invalid or expired token' });

    await server.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, activationToken: null },
    });

    return reply.send({ message: 'Account activated. You can now log in.' });
  });

  server.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await server.prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.emailVerified) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    const token = server.jwt.sign({ sub: user.id, email: user.email });

    return reply.send({ token, user: { id: user.id, email: user.email, credits: user.credits } });
  });
}
