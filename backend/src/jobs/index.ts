import cron from 'node-cron';
import { createWeeklyContracts } from './createContracts';
import { closeExpiredAuctions } from './closeAuctions';

export function registerJobs() {
  // Every Wednesday at 03:00 CET (02:00 UTC)
  cron.schedule('0 2 * * 3', createWeeklyContracts, { timezone: 'UTC' });

  // Every 15 minutes — close any auctions that have passed their end time
  cron.schedule('*/15 * * * *', closeExpiredAuctions);

  // NOTE: checkContractFulfillment is intentionally NOT scheduled.
  // It ran hourly and called the football API once per team — with 60 teams
  // that is ~1440 requests/day, almost all of them returning nothing new.
  //
  // Until it is rescheduled, no match results are ingested, no contract ever
  // reaches FULFILLED or FAILED, and no coupon is ever paid out. The job itself
  // still works: import checkContractFulfillment from './checkFulfillment'.

  console.log('Scheduled jobs registered');
}
