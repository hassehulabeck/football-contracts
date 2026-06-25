'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Contract } from '@/types/api';

const PATTERN_LABEL: Record<string, string> = {
  WWW: 'Three wins',
  DDD: 'Three draws',
  LLL: 'Three losses',
  WDL: 'Win → Draw → Loss',
  LDW: 'Loss → Draw → Win',
};

const LEAGUE_LABEL: Record<string, string> = {
  ALLSVENSKAN: 'Allsvenskan',
  DAMALLSVENSKAN: 'Damallsvenskan',
  SUPERETTAN: 'Superettan',
  ELITETTAN: 'Elitettan',
};

function timeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Closing…';
  const totalHours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (totalHours >= 24) return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
  return `${totalHours}h ${mins}m`;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Contract[]>('/api/contracts')
      .then((r) => setContracts(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading contracts…</p>
      </div>
    );
  }

  const active = contracts.filter((c) => c.status === 'ACTIVE');
  const closed = contracts.filter((c) => c.status !== 'ACTIVE');

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Contracts</h1>
      <p className="text-white/50 mb-8">
        Bid on team performance contracts. New contracts every Wednesday at 03:00.
      </p>

      {contracts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/30">No contracts right now — check back on Wednesday.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-bold text-orange-300 uppercase tracking-widest mb-3">
                Open auctions
              </h2>
              <ContractTable contracts={active} />
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white/30 uppercase tracking-widest mb-3">
                Closed
              </h2>
              <ContractTable contracts={closed} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ContractTable({ contracts }: { contracts: Contract[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">League</th>
            <th className="px-4 py-3 font-medium">Pattern</th>
            <th className="px-4 py-3 font-medium tabular">Coupons</th>
            <th className="px-4 py-3 font-medium">Auction ends</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 font-semibold text-orange-100">{c.team.name}</td>
              <td className="px-4 py-3 text-white/40 hidden sm:table-cell">
                {LEAGUE_LABEL[c.team.league]}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono font-bold text-brand-400">{c.pattern}</span>
                <span className="text-white/30 ml-2 hidden md:inline text-xs">
                  {PATTERN_LABEL[c.pattern]}
                </span>
              </td>
              <td className="px-4 py-3 tabular text-white/60">{c.couponCount}</td>
              <td className="px-4 py-3 tabular">
                {c.auction ? (
                  c.auction.closed ? (
                    <span className="text-white/30">Closed</span>
                  ) : (
                    <span className="text-brand-400 font-semibold">
                      {timeRemaining(c.auction.endsAt)}
                    </span>
                  )
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/contracts/${c.id}`}
                  className="text-brand-400 hover:text-brand-300 font-bold text-xs uppercase tracking-wide transition-colors"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
