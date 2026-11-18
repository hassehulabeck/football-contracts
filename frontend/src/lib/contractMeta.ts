import { formatTeamName } from './formatTeamName';
import { LEAGUES } from './leagues';
import { patternDescription } from './patterns';
import { fetchPublic } from './site';
import type { League } from '@/types/api';

/** The slice of GET /api/contracts/:id a link preview needs. */
export interface ContractMeta {
  id: string;
  pattern: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'FULFILLED' | 'FAILED';
  couponCount: number;
  couponsSold: number;
  team: { name: string; league: League; externalId: number };
  auction: { endsAt: string; closed: boolean; _count: { bids: number } } | null;
}

export function fetchContractMeta(id: string) {
  return fetchPublic<ContractMeta>(`/api/contracts/${encodeURIComponent(id)}`);
}

function stockholm(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** One line on where the contract stands, for preview text and images. */
export function contractStatusLine(c: ContractMeta): string {
  switch (c.status) {
    case 'ACTIVE':
      return c.auction && !c.auction.closed
        ? `Auction open until ${stockholm(c.auction.endsAt)} · ${c.couponCount} coupons`
        : `${c.couponCount} coupons`;
    case 'CLOSED':
      return `${c.couponsSold} of ${c.couponCount} coupons sold · waiting for the pattern`;
    case 'FULFILLED':
      return 'Fulfilled — every coupon holder got 100 credits';
    case 'FAILED':
      return 'The season ran out before the pattern came';
    default:
      return `${c.couponCount} coupons`;
  }
}

export function contractTitle(c: ContractMeta): string {
  return `${formatTeamName(c.team.name)} ${c.pattern}`;
}

export function contractDescription(c: ContractMeta): string {
  return `${patternDescription(c.pattern)} for ${formatTeamName(c.team.name)} (${LEAGUES[c.team.league].label}). ${contractStatusLine(c)}.`;
}
