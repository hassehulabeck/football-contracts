'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Contract, AuctionDetail } from '@/types/api';

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

const LEAGUE_LABEL: Record<string, string> = {
  ALLSVENSKAN: 'Allsvenskan',
  DAMALLSVENSKAN: 'Damallsvenskan',
  SUPERETTAN: 'Superettan',
  ELITETTAN: 'Elitettan',
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

  const [contract, setContract] = useState<Contract | null>(null);
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [myBid, setMyBid] = useState<MyBid | null>(null);
  const [loading, setLoading] = useState(true);

  const [bidAmount, setBidAmount] = useState('');
  const [bidStatus, setBidStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bidMessage, setBidMessage] = useState('');

  useEffect(() => {
    api.get<Contract>(`/api/contracts/${id}`)
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

      <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
        {LEAGUE_LABEL[contract.team.league]}
      </p>
      <h1 className="text-4xl font-black text-brand-500 mb-1">{contract.team.name}</h1>
      <p className="text-orange-200 text-xl mb-8">{PATTERN_DESCRIPTION[contract.pattern]}</p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <InfoCard label="Pattern" value={contract.pattern} mono />
        <InfoCard label="Coupons" value={String(contract.couponCount)} />
        <InfoCard label="Status" value={STATUS_LABEL[contract.status]} />
        <InfoCard label="Created" value={formatDate(contract.createdAt)} />
      </div>

      {contract.auction && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">Auction</h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-white/40 text-xs mb-1">Closes</p>
              <p className="text-orange-200 text-sm font-semibold">{formatDate(contract.auction.endsAt)}</p>
            </div>
            {auction && (
              <>
                <div>
                  <p className="text-white/40 text-xs mb-1">Bids placed</p>
                  <p className="tabular font-black text-2xl text-brand-400">{auction.bidCount}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Sample bid</p>
                  <p className="tabular font-black text-2xl text-brand-400">
                    {auction.sampleBid !== null ? auction.sampleBid : '—'}
                    {auction.sampleBid !== null && (
                      <span className="text-white/40 text-sm font-normal ml-1">cr</span>
                    )}
                  </p>
                </div>
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
              This auction has closed. Coupons have been distributed to the top{' '}
              {contract.couponCount} bidders.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-semibold text-orange-100 ${mono ? 'font-mono text-brand-400 text-lg' : ''}`}>
        {value}
      </p>
    </div>
  );
}
