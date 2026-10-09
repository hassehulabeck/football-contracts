import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendNewContracts } from '../lib/notifications';
import { withAlert } from '../lib/alerts';
import { createWeeklyContracts } from './createContracts';
import { closeExpiredAuctions } from './closeAuctions';
import { checkContractFulfillment } from './checkFulfillment';
import { refreshFixtures } from './refreshFixtures';

const prisma = new PrismaClient();

export function registerJobs() {
  // Every Wednesday at 03:00 Swedish time.
  //
  // Scheduled in Europe/Stockholm rather than UTC on purpose. As `0 2 * * 3`
  // UTC this fired at 04:00 local through the summer half of the season, while
  // the rules page, the contracts page and description.md all promised 03:00 —
  // the season runs April–November, so the promise was wrong most of the time.
  // Letting the zone handle CET/CEST makes 03:00 true year-round.
  //
  // Wrapped, not passed by reference: node-cron hands the callback the fire
  // time, which would otherwise arrive as the job's options argument.
  //
  // The new-contracts mail is sent from here rather than inside the job, so
  // the create:contracts script (test batches, manual reruns) never mails
  // players about contracts nobody scheduled.
  cron.schedule(
    '0 3 * * 3',
    withAlert('createContracts', async () => {
      const { contractIds } = await createWeeklyContracts();
      try {
        await sendNewContracts(prisma, contractIds);
      } catch (err) {
        console.error('[createContracts] New-contract mail failed:', err);
      }
    }),
    { timezone: 'Europe/Stockholm' },
  );

  // Every 15 minutes — close any auctions that have passed their end time
  cron.schedule('*/15 * * * *', withAlert('closeAuctions', closeExpiredAuctions));

  // Every 3 hours, offset off the hour so it does not collide with the auction
  // sweep. Costs 4 API requests per run — 32/day against a 7500/day quota — so
  // the cadence is set by how fast we want coupons paid out, not by the budget.
  // The old per-team ingest cost ~1440/day, which is why this was unscheduled.
  cron.schedule('20 */3 * * *', withAlert('checkFulfillment', checkContractFulfillment), { timezone: 'UTC' });

  // Daily at 04:00 UTC — two or three hours after the Wednesday contract job
  // depending on the season's offset, so the two never share a tick either way.
  // Kept in UTC because nothing about a fixture poll is local-time-sensitive.
  // api-football has no push for reschedules, so a postponed match is only as
  // fresh as the last poll; daily keeps a moved fixture from sitting wrong on a
  // contract page for the better part of a week. Costs 4 requests a day against
  // a 7500/day quota.
  cron.schedule('0 4 * * *', withAlert('refreshFixtures', refreshFixtures), { timezone: 'UTC' });

  // Every job is wrapped in withAlert, which mails ADMIN_EMAIL when it throws.
  console.log('Scheduled jobs registered');
}
