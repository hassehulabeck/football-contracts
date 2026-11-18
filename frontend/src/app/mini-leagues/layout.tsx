import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: { default: tr('Mini-leagues', 'Miniligor'), template: '%s — Football Contracts' },
    description: tr(
      'Play Football Contracts against your friends: a private table for your group, joined with one link.',
      'Spela Football Contracts mot dina vänner: en egen tabell för gruppen, med en enda länk.',
    ),
    robots: { index: false },
  };
}

export default function MiniLeaguesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
