/** What every account starts with. Must match the `credits` default in schema.prisma. */
export const STARTING_CREDITS = 1000;

/** What a coupon pays its owner when the contract is fulfilled. */
export const COUPON_PAYOUT = 100;

/**
 * The transaction types that count as profit — credits won or lost by playing.
 * Grants, corrections and refinancing are handed out, not earned, so the
 * leaderboard leaves them out.
 */
export const PROFIT_TYPES = ['COUPON_PURCHASE', 'COUPON_PAYOUT'] as const;
