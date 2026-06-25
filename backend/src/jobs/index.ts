import cron from 'node-cron';
import { createWeeklyContracts } from './createContracts';
import { closeExpiredAuctions } from './closeAuctions';
import { checkContractFulfillment } from './checkFulfillment';

export function registerJobs() {
  // Every Wednesday at 03:00 CET (02:00 UTC)
  cron.schedule('0 2 * * 3', createWeeklyContracts, { timezone: 'UTC' });

  // Every 15 minutes — close any auctions that have passed their end time
  cron.schedule('*/15 * * * *', closeExpiredAuctions);

  // Every hour — fetch new match results and evaluate contract fulfillment
  cron.schedule('0 * * * *', checkContractFulfillment);

  console.log('Scheduled jobs registered');
}
