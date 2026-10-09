import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import { sendActivationEmail, sendPasswordResetEmail } from '../lib/email';
import { STARTING_CREDITS } from '../lib/ledger';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const resendActivationSchema = z.object({
  email: z.string().email(),
});

// Floor between two activation emails to the same address. Long enough to
// stop someone hammering the endpoint (and burning Resend send quota), short
// enough that a friend who mistypes their email doesn't have to wait long
// for a fresh link.
const RESEND_COOLDOWN_MS = 60_000;

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const RESET_TOKEN_TTL_MS = 60 * 60_000;

// Same reply whether or not the account exists, so this endpoint can't be
// used to probe which emails are registered.
const FORGOT_PASSWORD_REPLY = {
  message: 'If an account exists for that email, a reset link is on its way',
};

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
      data: {
        email: body.email,
        passwordHash,
        activationToken,
        activationTokenSentAt: new Date(),
        credits: STARTING_CREDITS,
        creditTransactions: { create: { amount: STARTING_CREDITS, type: 'STARTING_BALANCE' } },
      },
    });

    await sendActivationEmail(user.email, activationToken);

    return reply.status(201).send({ message: 'Check your email to activate your account' });
  });

  server.post('/resend-activation', async (req, reply) => {
    const body = resendActivationSchema.parse(req.body);

    const user = await server.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.status(404).send({ error: 'No account found with that email' });
    if (user.emailVerified) {
      return reply.status(400).send({ error: 'This account is already activated — you can log in' });
    }

    if (user.activationTokenSentAt) {
      const elapsed = Date.now() - user.activationTokenSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return reply.status(429).send({ error: `Please wait ${wait}s before requesting another email` });
      }
    }

    // Old token still works if the friend finds the first email after all —
    // only mint a new one if somehow it got cleared without activating.
    const activationToken = user.activationToken ?? crypto.randomBytes(32).toString('hex');

    await server.prisma.user.update({
      where: { id: user.id },
      data: { activationToken, activationTokenSentAt: new Date() },
    });

    await sendActivationEmail(user.email, activationToken);

    return reply.send({ message: 'Activation email sent — check your inbox' });
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

  server.post('/forgot-password', async (req, reply) => {
    const body = forgotPasswordSchema.parse(req.body);

    const user = await server.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.send(FORGOT_PASSWORD_REPLY);

    // Silently dropped inside the cooldown: a 429 here would reveal that the
    // account exists.
    if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return reply.send(FORGOT_PASSWORD_REPLY);
    }

    // A new request replaces any earlier link, so only the latest email works.
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    await server.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashResetToken(token),
        passwordResetExpiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
        passwordResetSentAt: now,
      },
    });

    await sendPasswordResetEmail(user.email, token);

    return reply.send(FORGOT_PASSWORD_REPLY);
  });

  server.post('/reset-password', async (req, reply) => {
    const body = resetPasswordSchema.parse(req.body);

    const user = await server.prisma.user.findUnique({
      where: { passwordResetTokenHash: hashResetToken(body.token) },
    });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return reply.status(400).send({ error: 'This reset link is invalid or has expired — request a new one' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    // Following the emailed link proves the player owns the address, so an
    // unverified account is activated here too instead of bouncing them back
    // to the activation flow.
    await server.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        emailVerified: true,
        activationToken: null,
      },
    });

    return reply.send({ message: 'Password changed. You can now log in.' });
  });

  server.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await server.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    // Checked after the password so a wrong-password guess on an unverified
    // account still gets the generic error, not a hint that the email exists.
    if (!user.emailVerified) {
      return reply.status(403).send({ error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' });
    }

    const token = server.jwt.sign({ sub: user.id, email: user.email });

    // username rides along so the client knows immediately whether to send the
    // player to /settings/username, without a second round trip to /users/me.
    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  });
}
