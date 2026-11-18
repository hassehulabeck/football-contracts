import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: { default: tr('Contracts', 'Kontrakt'), template: '%s — Football Contracts' },
    description: tr(
      'This week’s football contracts: bid on coupons that pay 100 credits if the team hits the pattern.',
      'Veckans fotbollskontrakt: bjud på kuponger som ger 100 krediter om laget når mönstret.',
    ),
  };
}

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
