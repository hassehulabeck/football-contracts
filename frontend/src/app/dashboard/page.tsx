'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { leagueStyle } from '@/lib/leagues';
import type { Contract, ContractListResponse, LeaderboardEntry } from '@/types/api';

interface MyCoupon {
  id: string;
  contractId: string;
  paidOut: boolean;
  contract: {
    pattern: string;
    status: string;
    // /api/users/me includes the whole team row, so `league` is already on the
    // wire — see users.ts, `contract: { include: { team: true } }`.
    team: { name: string; league: string };
    auction: { endsAt: string } | null;
  };
}

interface MyBid {
  amount: number;
  updatedAt: string;
  auction: {
    id: string;
    endsAt: string;
    closed: boolean;
    contract: {
      id: string;
      pattern: string;
      status: string;
      team: { name: string; league: string };
    };
  };
}

interface MeData {
  id: string;
  email: string;
  credits: number;
  coupons: MyCoupon[];
  bids: MyBid[];
  /**
   * Bids on auctions that have settled without winning a coupon. Same shape as
   * an active bid — the API splits them so a loss leaves a visible trace
   * instead of the row simply disappearing at close.
   */
  lostBids: MyBid[];
}

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Closing…';
  const totalHours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (totalHours >= 24) return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
  return `${totalHours}h ${mins}m`;
}

function formatDay(dt: string) {
  return new Date(dt).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user, loading } = useRequireAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [openContracts, setOpenContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<MeData>('/api/users/me').then((r) => setMe(r.data));
    api.get<LeaderboardEntry[]>('/api/leaderboard').then((r) => {
      const pos = r.data.findIndex((u) => u.id === user.id);
      setRank(pos >= 0 ? pos + 1 : null);
    });
    api
      .get<ContractListResponse>('/api/contracts', {
        params: { status: 'open', pageSize: 5 },
      })
      .then((r) => setOpenContracts(r.data.contracts));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  const liveCoupons = me?.coupons.filter((c) => !c.paidOut) ?? [];
  const activeBids = me?.bids ?? [];
  const lostBids = me?.lostBids ?? [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Dashboard</h1>
      <p className="text-white/50 mb-10">{user.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Credits" value={user.credits.toLocaleString()} />
        <StatCard label="Live coupons" value={me ? String(liveCoupons.length) : '—'} />
        <StatCard label="Rank" value={rank ? `#${rank}` : '—'} />
      </div>

      {activeBids.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-3">
            Active bids
          </h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Pattern</th>
                  <th className="px-4 py-3 font-medium tabular">Your bid</th>
                  <th className="px-4 py-3 font-medium">Closes in</th>
                </tr>
              </thead>
              <tbody>
                {activeBids.map((bid) => (
                  <tr key={bid.auction.id} className="border-b border-white/5 last:border-0">
                    <td
                      className={`px-4 py-3 font-semibold text-orange-100 border-l-2 ${
                        leagueStyle(bid.auction.contract.team.league).stripe
                      }`}
                    >
                      <Link
                        href={`/contracts/${bid.auction.contract.id}`}
                        className="hover:text-brand-400 transition-colors"
                      >
                        {bid.auction.contract.team.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-400">
                      {bid.auction.contract.pattern}
                    </td>
                    <td className="px-4 py-3 tabular font-bold text-orange-200">
                      {bid.amount.toLocaleString()} cr
                    </td>
                    <td className="px-4 py-3 tabular text-brand-400 font-semibold">
                      {timeRemaining(bid.auction.endsAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {me && me.coupons.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-3">
            Your coupons
          </h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Pattern</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium tabular">Payout</th>
                </tr>
              </thead>
              <tbody>
                {me.coupons.slice(0, 20).map((coupon) => (
                  <tr key={coupon.id} className="border-b border-white/5 last:border-0">
                    <td
                      className={`px-4 py-3 font-semibold text-orange-100 border-l-2 ${
                        leagueStyle(coupon.contract.team.league).stripe
                      }`}
                    >
                      <Link
                        href={`/contracts/${coupon.contractId}`}
                        className="hover:text-brand-400 transition-colors"
                      >
                        {coupon.contract.team.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-400">
                      {coupon.contract.pattern}
                    </td>
                    <td className="px-4 py-3 text-white/50 capitalize">
                      {coupon.contract.status.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 tabular">
                      {coupon.paidOut ? (
                        <span className="text-green-400 font-semibold">+100 cr</span>
                      ) : (
                        <span className="text-white/30">pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {lostBids.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-3">
            Lost contracts
          </h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Pattern</th>
                  <th className="px-4 py-3 font-medium tabular">Your bid</th>
                  <th className="px-4 py-3 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {lostBids.slice(0, 20).map((bid) => (
                  <tr key={bid.auction.id} className="border-b border-white/5 last:border-0">
                    <td
                      className={`px-4 py-3 font-semibold text-white/50 border-l-2 ${
                        leagueStyle(bid.auction.contract.team.league).stripe
                      }`}
                    >
                      <Link
                        href={`/contracts/${bid.auction.contract.id}`}
                        className="hover:text-brand-400 transition-colors"
                      >
                        {bid.auction.contract.team.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white/40">
                      {bid.auction.contract.pattern}
                    </td>
                    <td className="px-4 py-3 tabular text-white/40">
                      {bid.amount.toLocaleString()} cr
                    </td>
                    <td className="px-4 py-3 tabular text-white/30">
                      {formatDay(bid.auction.endsAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/25 text-xs mt-2">
            These auctions settled without your bid winning a coupon. No credits were taken.
          </p>
        </section>
      )}

      {me && me.coupons.length === 0 && activeBids.length === 0 && lostBids.length === 0 && (
        <p className="text-white/30 text-sm mb-8">
          No bids or coupons yet — browse open contracts to get started.
        </p>
      )}

      {openContracts.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest">
              Open contracts
            </h2>
            <Link href="/contracts" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              See all →
            </Link>
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Pattern</th>
                  <th className="px-4 py-3 font-medium">Closes in</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {openContracts.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td
                      className={`px-4 py-3 font-semibold text-orange-100 border-l-2 ${leagueStyle(c.team.league).stripe}`}
                    >
                      {c.team.name}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-400">{c.pattern}</td>
                    <td className="px-4 py-3 tabular text-brand-400 font-semibold">
                      {c.auction ? timeRemaining(c.auction.endsAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/contracts/${c.id}`}
                        className="text-brand-400 hover:text-brand-300 font-bold text-xs uppercase tracking-wide transition-colors"
                      >
                        Bid →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <p className="text-white/50 text-sm uppercase tracking-wide mb-1">{label}</p>
      <p className="tabular text-3xl font-black text-brand-400">{value}</p>
    </div>
  );
}
