/**
 * Re-reads the upcoming league schedule once a day.
 *
 * api-football is poll-only — there is no webhook for a reschedule — so a
 * fixture moved after a run is not visible here until the next one. A daily
 * cadence keeps that gap under a day, which is roughly the notice a postponement
 * gets in the first place; the read side still filters on kickoffAt rather than
 * trusting this table to be current.
 *
 * Four requests per run, one per league.
 */
import { PrismaClient } from '@prisma/client';
import { ingestFixtures } from '../lib/ingestFixtures';

const prisma = new PrismaClient();

export async function refreshFixtures() {
  console.log('[refreshFixtures] Running');

  try {
    const res = await ingestFixtures(prisma, {
      season: new Date().getUTCFullYear(),
      log: (msg) => console.log(`[refreshFixtures]${msg}`),
    });
    console.log(
      `[refreshFixtures] ${res.fixtures} fixtures, ${res.created} created, ` +
        `${res.updated} updated, ${res.unchanged} unchanged`,
    );
  } catch (err) {
    console.error('[refreshFixtures] Failed:', err);
  }
}
