'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-client';
import { dateLocale, formatNumber, type Locale, type Tr } from '@/lib/i18n';
import type { LeaderboardBoard, LeaderboardEntry } from '@/types/api';

function tabs(tr: Tr): { board: LeaderboardBoard; label: string; blurb: string }[] {
  return [
    {
      board: 'profit',
      label: tr('Profit', 'Vinst'),
      blurb: tr(
        'Ranked by profit: payouts won minus what coupons cost. Your starting credits do not count.',
        'Rankad efter vinst: utbetalningar minus vad kupongerna kostade. Startkrediterna räknas inte.',
      ),
    },
    {
      board: 'month',
      label: tr('Month', 'Månad'),
      blurb: tr(
        'Profit made in one calendar month, counted when credits moved: a coupon bought this month and paid out next month counts as a loss now and a gain then.',
        'Vinst under en kalendermånad, räknad när krediterna rörde sig: en kupong köpt den här månaden och utbetald nästa räknas som en förlust nu och en vinst då.',
      ),
    },
    { board: 'credits', label: tr('Credits', 'Krediter'), blurb: tr('Ranked by current balance.', 'Rankad efter nuvarande saldo.') },
  ];
}

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

function monthLabel(month: string, locale: Locale): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(dateLocale(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function signed(n: number, locale: Locale): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatNumber(locale, Math.abs(n))}`;
}

interface StandingsBoardProps {
  /** Fetches one board. Called again whenever the tab or month changes, or `reloadKey` does. */
  load: (board: LeaderboardBoard, month?: string) => Promise<LeaderboardEntry[]>;
  /** Changing it refetches the current board, e.g. after a member is removed. */
  reloadKey?: unknown;
  /** Appended to the tab's explanation, e.g. "Top 100 players." */
  footnote?: string;
  emptyText?: string;
  /** Extra cell at the end of each row, e.g. an owner's Remove button. */
  rowAction?: (entry: LeaderboardEntry) => React.ReactNode;
}

/**
 * The profit / month / credits tabs and table. The public leaderboard and the
 * mini-league pages both render this, so the two can never drift apart.
 */
export function StandingsBoard({
  load,
  reloadKey,
  footnote = '',
  emptyText,
  rowAction,
}: StandingsBoardProps) {
  const { locale, tr } = useI18n();
  const TABS = tabs(tr);
  const { user } = useAuth();
  const [board, setBoard] = useState<LeaderboardBoard>('profit');
  const [month, setMonth] = useState(thisMonth);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    load(board, board === 'month' ? month : undefined)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
    // `load` is usually an inline closure; reloadKey is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, month, reloadKey]);

  const tab = TABS.find((t) => t.board === board)!;
  const myRank = user ? entries.findIndex((e) => e.id === user.id) : -1;
  const showProfit = board !== 'credits';

  return (
    <div>
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
            aria-label={tr('Previous month', 'Föregående månad')}
          >
            ‹
          </button>
          <span className="text-orange-100 font-semibold w-36 text-center">{monthLabel(month, locale)}</span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= thisMonth()}
            className="text-brand-400 hover:text-brand-300 font-bold px-2 disabled:opacity-20 disabled:cursor-default"
            aria-label={tr('Next month', 'Nästa månad')}
          >
            ›
          </button>
        </div>
      )}

      <p className="text-white/50 text-sm mb-2">{tab.blurb}{footnote ? ` ${footnote}` : ''}</p>
      {myRank >= 0 ? (
        <p className="text-sm text-brand-400 font-semibold mb-8">
          {tr('Your rank', 'Din placering')}: <span className="tabular font-black">#{myRank + 1}</span>
          <span className="text-white/30 font-normal ml-2">{tr('of', 'av')} {entries.length}</span>
        </p>
      ) : (
        <div className="mb-8" />
      )}

      {loading ? (
        <p className="text-white/50 text-center py-16">{tr('Loading…', 'Laddar…')}</p>
      ) : entries.length === 0 ? (
        <p className="text-white/30 text-center py-16">{emptyText ?? tr('No players yet.', 'Inga spelare än.')}</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-left">
                <th className="px-2 sm:px-4 py-3 font-medium w-12">#</th>
                <th className="px-2 sm:px-4 py-3 font-medium">{tr('Player', 'Spelare')}</th>
                {showProfit && <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">{tr('Profit', 'Vinst')}</th>}
                <th className="px-2 sm:px-4 py-3 font-medium tabular text-right">{tr('Credits', 'Krediter')}</th>
                {rowAction && <th className="px-2 sm:px-4 py-3" />}
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
                    <td className="px-2 sm:px-4 py-3 tabular text-white/40 font-semibold">{medal ?? i + 1}</td>
                    <td className="px-2 sm:px-4 py-3">
                      <span className={`font-semibold ${isMe ? 'text-orange-200' : 'text-orange-100'}`}>
                        {entry.displayName}
                      </span>
                      {isMe && (
                        <span className="ml-2 text-xs text-brand-400 font-bold uppercase tracking-widest">
                          {tr('you', 'du')}
                        </span>
                      )}
                    </td>
                    {showProfit && (
                      <td
                        className={`px-2 sm:px-4 py-3 tabular text-right font-black text-base ${
                          profit > 0 ? 'text-green-400' : profit < 0 ? 'text-orange-300' : 'text-white/40'
                        }`}
                      >
                        {signed(profit, locale)}
                      </td>
                    )}
                    <td
                      className={`px-2 sm:px-4 py-3 tabular text-right ${
                        showProfit ? 'text-white/50' : 'font-black text-brand-400 text-base'
                      }`}
                    >
                      {formatNumber(locale, entry.credits)}
                    </td>
                    {rowAction && <td className="px-2 sm:px-4 py-3 text-right">{rowAction(entry)}</td>}
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
