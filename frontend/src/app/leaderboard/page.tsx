'use client';

import { StandingsBoard } from '@/components/StandingsBoard';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { useI18n } from '@/lib/i18n-client';

export default function LeaderboardPage() {
  const { tr } = useI18n();
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-6">{tr('Leaderboard', 'Topplista')}</h1>
      <StandingsBoard
        load={fetchLeaderboard}
        footnote={tr('Top 100 players.', 'De 100 bästa.')}
        emptyText={tr('No players yet — be the first to register.', 'Inga spelare än — bli den första som registrerar sig.')}
      />
    </div>
  );
}
