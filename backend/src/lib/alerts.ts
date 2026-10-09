/**
 * Mails the site owner when a scheduled job fails, so a broken settlement or a
 * lapsed API plan is noticed the day it happens rather than when a player
 * asks why nothing paid out. Goes to ADMIN_EMAIL (an environment variable,
 * since the repository is public); without it, failures are only logged.
 */
import { sendBatch } from './email';

// One mail per job per hour: a job that fails every 15 minutes should not
// fill the inbox, and the first mail already says what is wrong.
const THROTTLE_MS = 60 * 60 * 1000;
const lastSent = new Map<string, number>();

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Logs the failure and, at most hourly per job, mails it. Never throws. */
export async function reportJobError(job: string, err: unknown): Promise<void> {
  console.error(`[${job}] Failed:`, err);

  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  const now = Date.now();
  if (now - (lastSent.get(job) ?? 0) < THROTTLE_MS) return;
  lastSent.set(job, now);

  const detail = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err);
  try {
    await sendBatch(
      [
        {
          to,
          subject: `Football Contracts: ${job} failed`,
          html:
            `<p>The scheduled job <b>${escape(job)}</b> failed at ${new Date().toISOString()}.</p>` +
            `<pre style="white-space:pre-wrap;font-size:12px">${escape(detail.slice(0, 5000))}</pre>` +
            `<p style="color:#888;font-size:12px">Further failures of this job are not mailed for an hour. ` +
            `The Railway logs have the rest.</p>`,
        },
      ],
      'alert',
    );
  } catch (mailErr) {
    console.error(`[${job}] Alert mail failed:`, mailErr);
  }
}

/** Wraps a cron callback so a throw is reported instead of vanishing. */
export function withAlert(job: string, fn: () => Promise<unknown>): () => Promise<void> {
  return async () => {
    try {
      await fn();
    } catch (err) {
      await reportJobError(job, err);
    }
  };
}
