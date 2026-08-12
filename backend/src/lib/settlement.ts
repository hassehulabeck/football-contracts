/**
 * Deciding which bids actually get paid when auctions close.
 *
 * This lives on its own for the same reason `fulfillment.ts` does: it is the
 * one part of settlement that cannot be decided auction by auction. Credits are
 * debited only at close, and the bid endpoint can only check affordability one
 * bid at a time, so 1000 credits can back a 1000-credit bid on ten separate
 * auctions. Which of those bids a player can honour is therefore a question
 * about every closing auction at once — and being pure, it can be tested
 * without a database.
 */

/** The fields settlement needs — any Bid row satisfies this. */
export interface SettleableBid {
  id: string;
  userId: string;
  amount: number;
  createdAt: Date;
}

export interface SettleableAuction {
  id: string;
  /** How many coupons this auction's contract has to give out. */
  couponCount: number;
  /** Every bid on the auction, in any order. */
  bids: SettleableBid[];
}

export interface Award {
  auctionId: string;
  bid: SettleableBid;
}

export interface Skip {
  auctionId: string;
  bid: SettleableBid;
  /** What the bidder could actually afford by the time their bid came up. */
  creditsLeft: number;
}

export interface Settlement {
  /** Bids that win a coupon and can pay for it, largest bid first. */
  awards: Award[];
  /** Bids that earned a coupon but could not cover it, largest bid first. */
  skips: Skip[];
  /** What each bidder is left with once every award is debited. */
  finalCredits: Map<string, number>;
}

/**
 * Age, used only to break a tie between equal bids: whoever bid first wins.
 * Falls back to id so two bids sharing a timestamp still have one stable order
 * rather than depending on the order rows came back from Postgres.
 */
function byAge(a: SettleableBid, b: SettleableBid): number {
  const delta = a.createdAt.getTime() - b.createdAt.getTime();
  if (delta !== 0) return delta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Highest bid first; an equal bid placed earlier outranks a later one. */
function byRank(a: SettleableBid, b: SettleableBid): number {
  if (a.amount !== b.amount) return b.amount - a.amount;
  return byAge(a, b);
}

/**
 * Settle every closing auction together.
 *
 * Two rules, which happen to agree on the same ordering:
 *
 * 1. *Entitlement* is per auction — the highest bids win that contract's
 *    coupons, ties broken by who bid first.
 * 2. *Affordability* is resolved across all closing auctions at once, again
 *    highest bid first, so a player short of credits spends them on the
 *    contract they bid most for and forfeits the cheaper ones. Every bid a
 *    player cannot cover passes its coupon to the next bidder down on that
 *    auction, who is affordability-checked in turn.
 *
 * Because both rules sort the same way, one pass over every bid in rank order
 * settles the lot: a bid is entitled exactly when its auction still has a
 * coupon left by the time the pass reaches it.
 *
 * Previously affordability was decided auction by auction in whatever order
 * Postgres happened to return, so *which* of a player's bids survived was
 * arbitrary.
 *
 * `credits` is the balance each bidder starts the run with; bidders missing
 * from it are treated as having nothing.
 */
export function settleAuctions(
  auctions: SettleableAuction[],
  credits: ReadonlyMap<string, number>,
): Settlement {
  const remaining = new Map(credits);
  const awards: Award[] = [];
  const skips: Skip[] = [];

  const capacity = new Map(auctions.map((a) => [a.id, a.couponCount]));
  const assigned = new Map<string, number>();

  const ranked = auctions
    .flatMap((auction) => auction.bids.map((bid) => ({ auctionId: auction.id, bid })))
    .sort((x, y) => byRank(x.bid, y.bid));

  for (const { auctionId, bid } of ranked) {
    const sold = assigned.get(auctionId) ?? 0;
    // Outbid: higher bids already took every coupon. Not an affordability
    // failure, so it is not reported as a skip.
    if (sold >= (capacity.get(auctionId) ?? 0)) continue;

    const left = remaining.get(bid.userId) ?? 0;
    if (left < bid.amount) {
      skips.push({ auctionId, bid, creditsLeft: left });
      continue;
    }

    remaining.set(bid.userId, left - bid.amount);
    assigned.set(auctionId, sold + 1);
    awards.push({ auctionId, bid });
  }

  return { awards, skips, finalCredits: remaining };
}
