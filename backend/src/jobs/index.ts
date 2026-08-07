import cron from 'node-cron';
import { createWeeklyContracts } from './createContracts';
import { closeExpiredAuctions } from './closeAuctions';
import { checkContractFulfillment } from './checkFulfillment';
import { refreshFixtures } from './refreshFixtures';

export function registerJobs() {
  // Every Wednesday at 03:00 CET (02:00 UTC).
  // Wrapped, not passed by reference: node-cron hands the callback the fire
  // time, which would otherwise arrive as the job's options argument.
  cron.schedule('0 2 * * 3', () => createWeeklyContracts(), { timezone: 'UTC' });

  // Every 15 minutes — close any auctions that have passed their end time
  cron.schedule('*/15 * * * *', closeExpiredAuctions);

  // Every 3 hours, offset off the hour so it does not collide with the auction
  // sweep. Costs 4 API requests per run — 32/day against a 7500/day quota — so
  // the cadence is set by how fast we want coupons paid out, not by the budget.
  // The old per-team ingest cost ~1440/day, which is why this was unscheduled.
  cron.schedule('20 */3 * * *', checkContractFulfillment, { timezone: 'UTC' });

  // Weekly, two hours after the contract job so the two do not share a tick.
  // A schedule changes on the scale of days and api-football has no push for
  // reschedules, so there is nothing a tighter cadence would catch sooner.
  cron.schedule('0 4 * * 3', () => refreshFixtures(), { timezone: 'UTC' });

  console.log('Scheduled jobs registered');
}
