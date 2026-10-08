import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.FROM_EMAIL ?? 'noreply@footballcontracts.app';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export async function sendActivationEmail(email: string, token: string) {
  const url = `${FRONTEND_URL}/auth/activate?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Activate your Football Contracts account',
    html: `<p>Click the link below to activate your account:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${FRONTEND_URL}/auth/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Football Contracts password',
    html:
      `<p>Someone asked to reset the password for this account. Click the link below to choose a new one:</p>` +
      `<p><a href="${url}">${url}</a></p>` +
      `<p>The link works once and expires in an hour. If you didn't ask for this, you can ignore this email.</p>`,
  });
}
