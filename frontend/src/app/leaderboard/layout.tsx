import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Who reads football best: players ranked by profit, all season and month by month.',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
