export type League = 'ALLSVENSKAN' | 'DAMALLSVENSKAN' | 'SUPERETTAN' | 'ELITETTAN';
export type ContractPattern = 'WWW' | 'DDD' | 'LLL' | 'WDL' | 'LDW';
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'CLOSED' | 'FULFILLED' | 'FAILED';

export interface Team {
  id: string;
  name: string;
  league: League;
}

export interface AuctionSummary {
  id: string;
  endsAt: string;
  closed: boolean;
}

export interface Contract {
  id: string;
  teamId: string;
  pattern: ContractPattern;
  status: ContractStatus;
  couponCount: number;
  createdAt: string;
  team: Team;
  auction: AuctionSummary | null;
  _count?: { coupons: number };
}

export interface AuctionDetail {
  id: string;
  contractId: string;
  endsAt: string;
  closed: boolean;
  bidCount: number;
  sampleBid: number | null;
  _count: { bids: number };
}

export interface LeaderboardEntry {
  id: string;
  email: string;
  credits: number;
}
