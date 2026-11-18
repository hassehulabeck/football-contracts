import { fetchPublic } from './site';
import type { PayoutsResponse } from '@/types/api';

/** Server-side: the most recent payouts, refreshed at most every 5 minutes. */
export function fetchPayouts(limit: number) {
  return fetchPublic<PayoutsResponse>(`/api/contracts/payouts?limit=${limit}`, 300);
}
