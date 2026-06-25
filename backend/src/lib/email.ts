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
