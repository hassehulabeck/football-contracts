import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: tr('Leaderboard', 'Topplista'),
    description: tr(
      'Who reads football best: players ranked by profit, all season and month by month.',
      'Vem läser fotboll bäst: spelare rankade efter vinst, hela säsongen och månad för månad.',
    ),
  };
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
