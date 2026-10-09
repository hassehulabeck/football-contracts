import fs from 'fs';
import path from 'path';
import { Resend, type CreateEmailOptions } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.FROM_EMAIL ?? 'noreply@footballcontracts.app';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

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

export type OutgoingMail = Omit<CreateEmailOptions, 'from' | 'react'> & { to: string; subject: string; html: string };

// Resend's batch endpoint takes at most 100 messages per call.
const BATCH_SIZE = 100;

/**
 * Sends notification mail in batches. Never throws: a failed batch is logged
 * and the rest still go, because a mail is a courtesy and the job that calls
 * this has already done the work the mail is about.
 *
 * EMAIL_DRY_RUN=1 logs instead of sending, and with EMAIL_DRY_RUN_DIR set also
 * writes each message's HTML there — for checking mail locally without
 * reaching anyone's inbox.
 */
export async function sendBatch(mails: OutgoingMail[], tag: string): Promise<void> {
  if (mails.length === 0) return;

  if (process.env.EMAIL_DRY_RUN) {
    const dir = process.env.EMAIL_DRY_RUN_DIR;
    mails.forEach((m, i) => {
      console.log(`[email:${tag}] DRY RUN → ${m.to}: ${m.subject}`);
      if (dir) fs.writeFileSync(path.join(dir, `${tag}-${i}.html`), m.html);
    });
    return;
  }

  let sent = 0;
  for (let i = 0; i < mails.length; i += BATCH_SIZE) {
    const chunk = mails.slice(i, i + BATCH_SIZE).map((m) => ({ ...m, from: FROM }));
    try {
      const { error } = await resend.batch.send(chunk);
      if (error) throw new Error(error.message);
      sent += chunk.length;
    } catch (err) {
      console.error(`[email:${tag}] batch of ${chunk.length} failed:`, err);
    }
  }
  console.log(`[email:${tag}] sent ${sent}/${mails.length}`);
}

/**
 * Forwards a feedback-form message to the site owner. ADMIN_EMAIL is an
 * environment variable rather than a constant because the repository is
 * public. Returns whether a mail went out; the caller has already stored the
 * message, so an unset address or a failed send loses nothing.
 */
export async function sendFeedbackEmail(fb: {
  message: string;
  replyTo: string | null;
  username: string | null;
  page: string | null;
}): Promise<boolean> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.warn('[feedback] ADMIN_EMAIL is not set; message stored but not mailed');
    return false;
  }
  const who = fb.username ? `${fb.username} (signed in)` : 'a visitor';
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      ...(fb.replyTo ? { reply_to: fb.replyTo } : {}),
      subject: `Feedback from ${fb.username ?? 'a visitor'}`,
      html:
        `<p>From ${escapeHtml(who)}${fb.replyTo ? `, answer to ${escapeHtml(fb.replyTo)}` : ', no reply address'}` +
        `${fb.page ? `, sent from ${escapeHtml(fb.page)}` : ''}:</p>` +
        `<blockquote style="white-space:pre-wrap;border-left:3px solid #ea580c;margin:0;padding:4px 12px">${escapeHtml(fb.message)}</blockquote>`,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error('[feedback] mail failed:', err);
    return false;
  }
}
