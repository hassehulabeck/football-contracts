'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchLeaderboard } from '@/lib/leaderboard';
import type { LeaderboardBoard, LeaderboardEntry } from '@/types/api';

const TABS: { board: LeaderboardBoard; label: string; blurb: string }[] = [
  {
    board: 'profit',
    label: 'Profit',
    blurb: 'Ranked by profit: payouts won minus what coupons cost. Your starting credits do not count.',
  },
  {
    board: 'month',
    label: 'Month',
    blurb: 'Profit made in one calendar month, counted when credits moved: a coupon bought this month and paid out next month counts as a loss now and a gain then.',
  },
  { board: 'credits', label: 'Credits', blurb: 'Ranked by current balance.' },
];

/** The current month in Stockholm as "YYYY-MM". */
function thisMonth(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit' })
    .format(new Date())
    .slice(0, 7);
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function signed(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString()}`;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<LeaderboardBoard>('profit');
  const [month, setMonth] = useState(thisMonth);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard(board, board === 'month' ? month : undefined)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [board, month]);

  const tab = TABS.find((t) => t.board === board)!;
  const myRank = user ? entries.findIndex((e) => e.id === user.id) : -1;
  const showProfit = board !== 'credits';

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-6">Leaderboard</h1>

      <div className="flex gap-1 mb-4 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.board}
            onClick={() => setBoard(t.board)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
              board === t.board
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-white/50 hover:text-orange-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {board === 'month' && (
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="text-brand-400 hover:text-brand-300 font-bold px-2"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-orange-100 font-semibold w-36 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= thisMonth()}
            className="text-brand-400 hover:text-brand-300 font-bold px-2 disabled:opacity-20 disabled:cursor-default"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      )}

      <p className="text-white/50 text-sm mb-2">{tab.blurb} Top 100 players.</p>
      {myRank >= 0 ? (
        <p className="text-sm text-brand-400 font-semibold mb-8">
          Your rank: <span className="tabular font-black">#{myRank + 1}</span>
          <span className="text-white/30 font-normal ml-2">of {entries.length}</span>
        </p>
      ) : (
        <div className="mb-8" />
      )}

      {loading ? (
        <p className="text-white/50 text-center py-16">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-white/30 text-center py-16">No players yet — be the first to register.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-left">
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                {showProfit && <th className="px-4 py-3 font-medium tabular text-right">Profit</th>}
                <th className="px-4 py-3 font-medium tabular text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isMe = user?.id === entry.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const profit = entry.profit ?? 0;
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      isMe ? 'bg-brand-500/10 border-brand-500/20' : 'hover:bg-white/3'
                    }`}
                  >
                    <td className="px-4 py-3 tabular text-white/40 font-semibold">{medal ?? i + 1}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isMe ? 'text-orange-200' : 'text-orange-100'}`}>
                        {entry.displayName}
                      </span>
                      {isMe && (
                        <span className="ml-2 text-xs text-brand-400 font-bold uppercase tracking-widest">
                          you
                        </span>
                      )}
                    </td>
                    {showProfit && (
                      <td
                        className={`px-4 py-3 tabular text-right font-black text-base ${
                          profit > 0 ? 'text-green-400' : profit < 0 ? 'text-orange-300' : 'text-white/40'
                        }`}
                      >
                        {signed(profit)}
                      </td>
                    )}
                    <td
                      className={`px-4 py-3 tabular text-right ${
                        showProfit ? 'text-white/50' : 'font-black text-brand-400 text-base'
                      }`}
                    >
                      {entry.credits.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
