'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { LeaderboardEntry } from '@/types/api';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<LeaderboardEntry[]>('/api/leaderboard')
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  const myRank = user ? entries.findIndex((e) => e.id === user.id) : -1;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Leaderboard</h1>
      <p className="text-white/50 mb-2">Ranked by total credits. Top 100 players.</p>
      {myRank >= 0 && (
        <p className="text-sm text-brand-400 font-semibold mb-8">
          Your rank:{' '}
          <span className="tabular font-black">#{myRank + 1}</span>
          <span className="text-white/30 font-normal ml-2">of {entries.length}</span>
        </p>
      )}
      {myRank < 0 && <div className="mb-8" />}

      {entries.length === 0 ? (
        <p className="text-white/30 text-center py-16">No players yet — be the first to register.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-left">
                <th className="px-4 py-3 font-medium w-12">#</th>
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium tabular text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isMe = user?.id === entry.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      isMe ? 'bg-brand-500/10 border-brand-500/20' : 'hover:bg-white/3'
                    }`}
                  >
                    <td className="px-4 py-3 tabular text-white/40 font-semibold">
                      {medal ?? i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isMe ? 'text-orange-200' : 'text-orange-100'}`}>
                        {entry.email}
                      </span>
                      {isMe && (
                        <span className="ml-2 text-xs text-brand-400 font-bold uppercase tracking-widest">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular text-right font-black text-brand-400 text-base">
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
