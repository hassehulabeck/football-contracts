import type { Metadata } from 'next';
import { contractDescription, contractTitle, fetchContractMeta } from '@/lib/contractMeta';
import { getI18n } from '@/lib/i18n-server';

// The page itself is a client component and cannot export metadata, so the
// per-contract title and link-preview text live in this pass-through layout.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [contract, { locale, tr }] = await Promise.all([fetchContractMeta(id), getI18n()]);
  if (!contract) return { title: tr('Contract', 'Kontrakt') };

  const title = contractTitle(contract);
  const description = contractDescription(contract, locale);
  return {
    title,
    description,
    alternates: { canonical: `/contracts/${id}` },
    openGraph: { title, description, url: `/contracts/${id}`, type: 'website' },
  };
}

export default function ContractLayout({ children }: { children: React.ReactNode }) {
  return children;
}
