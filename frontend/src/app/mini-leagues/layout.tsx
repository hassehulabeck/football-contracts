import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Mini-leagues', template: '%s — Football Contracts' },
  description: 'Play Football Contracts against your friends: a private table for your group, joined with one link.',
  robots: { index: false },
};

export default function MiniLeaguesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
