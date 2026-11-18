import type { Metadata } from 'next';

export const metadata: Metadata = {
  // An object, not a string: a plain-string title here would stop the root
  // layout's "%s — Football Contracts" template reaching /contracts/[id].
  title: { default: 'Contracts', template: '%s — Football Contracts' },
  description: 'This week’s football contracts: bid on coupons that pay 100 credits if the team hits the pattern.',
};

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
