export type League = 'ALLSVENSKAN' | 'DAMALLSVENSKAN' | 'SUPERETTAN' | 'ELITETTAN';
export type ContractPattern = 'WWW' | 'DDD' | 'LLL' | 'WDL' | 'LDW';
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'CLOSED' | 'FULFILLED' | 'FAILED';

/**
 * Player-facing status filter values. These are not the enum: the API maps
 * them, because "CLOSED" reads as *finished* to a player when it means the
 * auction is over and the result is still pending.
 */
export type StatusFilter = 'open' | 'awaiting' | 'fulfilled' | 'failed' | 'all';

export interface Team {
  id: string;
  name: string;
  league: League;
}

export interface AuctionSummary {
  id: string;
  endsAt: string;
  closed: boolean;
  /** Bids received. Demand, next to the coupon supply on the list page. */
  bidCount: number;
}

export interface Contract {
  id: string;
  teamId: string;
  pattern: ContractPattern;
  status: ContractStatus;
  couponCount: number;
  createdAt: string;
  /** Set when the contract became FULFILLED or FAILED; null while live. */
  resolvedAt: string | null;
  team: Team;
  auction: AuctionSummary | null;
  _count?: { coupons: number };
}

export interface ContractListResponse {
  contracts: Contract[];
  total: number;
  page: number;
  pageSize: number;
}

/** One of the three matches that completed a fulfilled contract's pattern. */
export interface FulfillmentMatch {
  playedAt: string;
  result: 'W' | 'D' | 'L' | string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  /** Null only if the opposing club has no Team row — see the API comment. */
  opponent: string | null;
}

/** A fixture the team has not played yet. */
export interface ScheduleFixture {
  kickoffAt: string;
  isHome: boolean;
  status: 'SCHEDULED' | 'POSTPONED' | 'CANCELLED' | string;
  /** Null only if the opposing club has no Team row — see the API comment. */
  opponent: string | null;
}

/**
 * The team's season either side of now. Independent of contract status — this
 * is form, which a bidder wants while the auction is still open.
 */
export interface TeamScheduleData {
  upcoming: ScheduleFixture[];
  /** Every result on record, newest first. Same shape as a fulfillment match. */
  recent: FulfillmentMatch[];
}

export interface ContractDetail extends Contract {
  /** Coupons that found an owner. Can be under couponCount if bids went unpaid. */
  couponsSold: number;
  couponsPaid: number;
  fulfillment: { matches: FulfillmentMatch[] } | null;
  /** Optional: an old backend answering mid-deploy does not send this. */
  schedule?: TeamScheduleData;
}

export interface AuctionDetail {
  id: string;
  contractId: string;
  endsAt: string;
  closed: boolean;
  bidCount: number;
  /**
   * The winning amount, revealed only once the auction has closed. Null while
   * bidding is open — the auction is silent by design.
   */
  highestBid: number | null;
  _count: { bids: number };
}

export interface LeaderboardEntry {
  id: string;
  /**
   * The player's username, or "Anonymous" for an account that has not set one
   * yet. Resolved by the API — the leaderboard is public, so the email it
   * replaced is never on the wire.
   */
  displayName: string;
  credits: number;
}
