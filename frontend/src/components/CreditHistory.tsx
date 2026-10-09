'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { leagueStyle } from '@/lib/leagues';
import { formatTeamName } from '@/lib/formatTeamName';
import { TeamLogo } from '@/components/TeamLogo';
import type { CreditTransaction, CreditTransactionPage, CreditTransactionType } from '@/types/api';

const LABELS: Record<CreditTransactionType, string> = {
  STARTING_BALANCE: 'Starting balance',
  COUPON_PURCHASE: 'Coupon bought',
  COUPON_PAYOUT: 'Contract fulfilled',
  ADJUSTMENT: 'Correction',
  REFINANCE: 'Refinancing',
};

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * The player's credit history, newest first. With `pageSize` alone it shows
 * one page (the dashboard); with `paged` it offers "Load more" (/history).
 */
export function CreditHistory({ pageSize, paged = false }: { pageSize: number; paged?: boolean }) {
  const [rows, setRows] = useState<CreditTransaction[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    (cursor?: string) =>
      api
        .get<CreditTransactionPage>('/api/users/me/transactions', {
          params: { limit: pageSize, ...(cursor ? { cursor } : {}) },
        })
        .then((r) => {
          setRows((prev) => (cursor && prev ? [...prev, ...r.data.transactions] : r.data.transactions));
          setNextCursor(r.data.nextCursor);
        }),
    [pageSize],
  );

  useEffect(() => {
    // An old backend mid-deploy has no such route; show nothing rather than an error.
    load().catch(() => setRows([]));
  }, [load]);

  if (rows === null) return <p className="text-white/30 text-sm">Loading…</p>;
  if (rows.length === 0) return <p className="text-white/30 text-sm">No credit history yet.</p>;

  return (
    <>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-left">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">What</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Contract</th>
              <th className="px-4 py-3 font-medium tabular text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 tabular text-white/50 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3 text-orange-100">
                  {LABELS[t.type]}
                  {t.note && <span className="block text-xs text-white/30">{t.note}</span>}
                </td>
                <td
                  className={`px-4 py-3 hidden sm:table-cell ${
                    t.contract ? `border-l-2 ${leagueStyle(t.contract.team.league).stripe}` : ''
                  }`}
                >
                  {t.contract ? (
                    <Link
                      href={`/contracts/${t.contract.id}`}
                      className="inline-flex items-center gap-2 text-orange-100 hover:text-brand-400 transition-colors"
                    >
                      <TeamLogo externalId={t.contract.team.externalId} />
                      {formatTeamName(t.contract.team.name)}
                      <span className="font-mono font-bold text-brand-400">{t.contract.pattern}</span>
                    </Link>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 tabular text-right font-semibold whitespace-nowrap ${
                    t.amount >= 0 ? 'text-green-400' : 'text-orange-200'
                  }`}
                >
                  {t.amount >= 0 ? '+' : '−'}
                  {Math.abs(t.amount).toLocaleString()} cr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paged && nextCursor && (
        <button
          onClick={() => {
            setLoadingMore(true);
            load(nextCursor).finally(() => setLoadingMore(false));
          }}
          disabled={loadingMore}
          className="mt-4 text-sm text-brand-400 hover:text-brand-300 font-semibold transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}
