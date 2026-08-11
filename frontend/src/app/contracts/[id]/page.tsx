'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTeamName } from '@/lib/formatTeamName';
import { LeagueBadge } from '@/components/LeagueBadge';
import { MatchRow } from '@/components/MatchRow';
import { PatternProgress } from '@/components/PatternProgress';
import { TeamSchedule } from '@/components/TeamSchedule';
import type { ContractDetail, AuctionDetail } from '@/types/api';

const PATTERN_DESCRIPTION: Record<string, string> = {
  WWW: 'Three consecutive wins',
  DDD: 'Three consecutive draws',
  LLL: 'Three consecutive losses',
  WDL: 'Win, then draw, then loss',
  LDW: 'Loss, then draw, then win',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Auction open',
  CLOSED: 'Auction closed — awaiting results',
  FULFILLED: 'Fulfilled',
  FAILED: 'Failed',
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

interface MyBid {
  amount: number;
  updatedAt: string;
}

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [loading, setLoading] = useState(true);

  const [bidAmount, setBidAmount] = useState('');
  const [bidStatus, setBidStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bidMessage, setBidMessage] = useState('');

  useEffect(() => {
    api.get<ContractDetail>(`/api/contracts/${id}`)
      .then(async (r) => {
        setContract(r.data);
        if (r.data.auction?.id) {
          const [ar] = await Promise.all([
            api.get<AuctionDetail>(`/api/auctions/${r.data.auction.id}`),
          ]);
          setAuction(ar.data);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch user's own bid once we know the auction ID and the user is available
  useEffect(() => {
    if (!user || !contract?.auction?.id) return;
    api.get<MyBid | null>(`/api/auctions/${contract.auction.id}/my-bid`)
      .then((r) => {
        setMyBid(r.data);
        if (r.data) setBidAmount(String(r.data.amount));
      })
      .catch(() => {}); // 401 just means not logged in — handled by UI
  }, [user, contract?.auction?.id]);

  async function placeBid() {
    if (!contract?.auction?.id) return;
    const amount = parseInt(bidAmount, 10);
    if (!amount || amount < 1) {
      setBidStatus('error');
      setBidMessage('Enter a valid credit amount');
      return;
    }

    setBidStatus('loading');
    setBidMessage('');

    try {
      await api.post(`/api/auctions/${contract.auction.id}/bid`, { amount });
      setMyBid({ amount, updatedAt: new Date().toISOString() });
      setBidStatus('success');
      setBidMessage(myBid ? 'Bid updated!' : 'Bid placed!');
      // Refresh public auction stats
      const ar = await api.get<AuctionDetail>(`/api/auctions/${contract.auction.id}`);
      setAuction(ar.data);
    } catch (err: any) {
      setBidStatus('error');
      setBidMessage(err.response?.data?.error ?? 'Failed to place bid');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-white/50">Contract not found.</p>
        <Link href="/contracts" className="text-brand-400 hover:text-brand-300 text-sm mt-4 inline-block">
          ← Back to contracts
        </Link>
      </div>
    );
  }

  const auctionOpen =
    contract.status === 'ACTIVE' &&
    contract.auction != null &&
    !contract.auction.closed;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/contracts" className="text-white/30 hover:text-white/60 text-sm transition-colors mb-6 inline-block">
        ← Contracts
      </Link>

      <div className="mb-3">
        <LeagueBadge league={contract.team.league} />
      </div>
      <h1 className="text-4xl font-black text-brand-500 mb-1">
        {formatTeamName(contract.team.name)}
      </h1>
      <p className="text-orange-200 text-xl mb-8">{PATTERN_DESCRIPTION[contract.pattern]}</p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <PatternProgress pattern={contract.pattern} progress={contract.progress} />
        <InfoCard label="Coupons" value={String(contract.couponCount)} />
        <InfoCard label="Status" value={STATUS_LABEL[contract.status]} />
        <InfoCard label="Created" value={formatDate(contract.createdAt)} />
      </div>

      {contract.status === 'FULFILLED' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
          <h2 className="text-green-400 text-xs uppercase tracking-widest mb-1 font-bold">
            Fulfilled
          </h2>
          {contract.resolvedAt && (
            <p className="text-white/40 text-xs mb-4">
              Confirmed {formatDate(contract.resolvedAt)}
            </p>
          )}

          {contract.fulfillment ? (
            <>
              <p className="text-white/50 text-sm mb-3">
                These three matches completed the pattern:
              </p>
              <div className="rounded-lg border border-white/10 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    {contract.fulfillment.matches.map((m, i) => (
                      <MatchRow key={i} match={m} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            // The window is re-derived from the match table on read. If results
            // were later corrected it can disappear, and saying so is better
            // than rendering an empty box.
            <p className="text-white/40 text-sm mb-4">
              The matching run is no longer reconstructible from current results.
            </p>
          )}

          <p className="text-white/50 text-sm">
            <span className="tabular font-bold text-green-400">{contract.couponsPaid}</span>{' '}
            {contract.couponsPaid === 1 ? 'coupon' : 'coupons'} paid out at 100 credits each.
          </p>
        </div>
      )}

      {contract.status === 'FAILED' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-red-400 text-xs uppercase tracking-widest mb-1 font-bold">
            Failed
          </h2>
          {contract.resolvedAt && (
            <p className="text-white/40 text-xs mb-3">Closed {formatDate(contract.resolvedAt)}</p>
          )}
          <p className="text-white/50 text-sm">
            {formatTeamName(contract.team.name)} never produced {contract.pattern} in three
            consecutive matches
            before the season ended. The {contract.couponsSold}{' '}
            {contract.couponsSold === 1 ? 'coupon' : 'coupons'} sold here paid nothing.
          </p>
        </div>
      )}

      {contract.status === 'CLOSED' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-2 font-bold">
            Awaiting result
          </h2>
          <p className="text-white/50 text-sm">
            The auction is over and {contract.couponsSold}{' '}
            {contract.couponsSold === 1 ? 'coupon is' : 'coupons are'} held. This contract stays
            open until {formatTeamName(contract.team.name)} produces {contract.pattern} in three
            consecutive
            matches, or until the season ends on 30 November.
          </p>
        </div>
      )}

      {contract.auction && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">Auction</h2>

          {/* Two figures while bidding is open, three once it has settled —
              the winning bid only exists to be shown after the fact. */}
          <div
            className={`grid gap-4 mb-4 ${
              contract.auction.closed ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            <div>
              <p className="text-white/40 text-xs mb-1">
                {contract.auction.closed ? 'Closed' : 'Closes'}
              </p>
              <p className="text-orange-200 text-sm font-semibold">{formatDate(contract.auction.endsAt)}</p>
            </div>
            {auction && (
              <>
                <div>
                  <p className="text-white/40 text-xs mb-1">Bids placed</p>
                  <p className="tabular font-black text-2xl text-brand-400">{auction.bidCount}</p>
                </div>
                {contract.auction.closed && (
                  <div>
                    <p className="text-white/40 text-xs mb-1">Highest bid</p>
                    {/* `!= null` on purpose: during a deploy the old backend
                        can still be answering, and it has no highestBid at
                        all. Undefined must fall through to the dash. */}
                    <p className="tabular font-black text-2xl text-brand-400">
                      {auction.highestBid != null ? auction.highestBid : '—'}
                      {auction.highestBid != null && (
                        <span className="text-white/40 text-sm font-normal ml-1">cr</span>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {auctionOpen && (
            <div className="border-t border-white/10 pt-4">
              {user ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white/40 text-xs uppercase tracking-widest">
                      {myBid ? 'Update your bid' : 'Place your bid'}
                    </h3>
                    {myBid && (
                      <span className="text-xs text-white/40">
                        Current bid:{' '}
                        <span className="tabular font-bold text-brand-400">{myBid.amount} cr</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min={1}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && placeBid()}
                      placeholder="Credits"
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 tabular"
                    />
                    <button
                      onClick={placeBid}
                      disabled={bidStatus === 'loading'}
                      className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                    >
                      {bidStatus === 'loading' ? '…' : myBid ? 'Update' : 'Bid'}
                    </button>
                  </div>
                  {bidMessage && (
                    <p className={`text-sm mt-2 ${bidStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {bidMessage}
                    </p>
                  )}
                  <p className="text-white/30 text-xs mt-2">
                    You have{' '}
                    <span className="tabular text-white/50">{user.credits.toLocaleString()}</span>{' '}
                    credits. Bids are silent — you can update yours any time before close. Top{' '}
                    <span className="text-white/50">{contract.couponCount}</span> bids win coupons.
                  </p>
                </>
              ) : (
                <p className="text-white/50 text-sm">
                  <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-semibold">
                    Log in
                  </Link>{' '}
                  to place a bid on this contract.
                </p>
              )}
            </div>
          )}

          {!auctionOpen && contract.auction.closed && (
            <p className="text-white/30 text-sm border-t border-white/10 pt-4">
              This auction has closed.{' '}
              <span className="tabular text-white/50">{contract.couponsSold}</span> of{' '}
              <span className="tabular text-white/50">{contract.couponCount}</span> coupons went
              to the highest bidders who could cover their bid at settlement.
            </p>
          )}
        </div>
      )}

      {/* Shown whatever the contract status is — form is what a bidder reads
          before the auction closes, not just after it resolves. Guarded
          because an old backend answering mid-deploy sends no schedule. */}
      {contract.schedule && (
        <TeamSchedule
          upcoming={contract.schedule.upcoming}
          recent={contract.schedule.recent}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="font-semibold text-orange-100">{value}</p>
    </div>
  );
}
