'use client';

import { StandingsBoard } from '@/components/StandingsBoard';
import { fetchLeaderboard } from '@/lib/leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-6">Leaderboard</h1>
      <StandingsBoard
        load={fetchLeaderboard}
        footnote="Top 100 players."
        emptyText="No players yet — be the first to register."
      />
    </div>
  );
}
