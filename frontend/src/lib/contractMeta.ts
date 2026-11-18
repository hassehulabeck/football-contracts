import { formatTeamName } from './formatTeamName';
import { LEAGUES } from './leagues';
import { patternDescription } from './patterns';
import { fetchPublic } from './site';
import { dateLocale, makeTr, plural, type Locale } from './i18n';
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

function stockholm(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** One line on where the contract stands, for preview text and images. */
export function contractStatusLine(c: ContractMeta, locale: Locale = 'en'): string {
  const tr = makeTr(locale);
  const coupons = plural(locale, c.couponCount, ['coupon', 'coupons'], ['kupong', 'kuponger']);
  switch (c.status) {
    case 'ACTIVE':
      return c.auction && !c.auction.closed
        ? tr(
            `Auction open until ${stockholm(c.auction.endsAt, locale)} · ${coupons}`,
            `Auktionen är öppen till ${stockholm(c.auction.endsAt, locale)} · ${coupons}`,
          )
        : coupons;
    case 'CLOSED':
      return tr(
        `${c.couponsSold} of ${c.couponCount} coupons sold · waiting for the pattern`,
        `${c.couponsSold} av ${c.couponCount} kuponger sålda · väntar på mönstret`,
      );
    case 'FULFILLED':
      return tr('Fulfilled — every coupon holder got 100 credits', 'Uppfyllt — varje kupongägare fick 100 krediter');
    case 'FAILED':
      return tr('The season ran out before the pattern came', 'Säsongen tog slut innan mönstret kom');
    default:
      return coupons;
  }
}

export function contractTitle(c: ContractMeta): string {
  return `${formatTeamName(c.team.name)} ${c.pattern}`;
}

export function contractDescription(c: ContractMeta, locale: Locale = 'en'): string {
  const team = formatTeamName(c.team.name);
  const league = LEAGUES[c.team.league].label;
  const what = patternDescription(c.pattern, locale);
  return locale === 'sv'
    ? `${what} för ${team} (${league}). ${contractStatusLine(c, locale)}.`
    : `${what} for ${team} (${league}). ${contractStatusLine(c, locale)}.`;
}
