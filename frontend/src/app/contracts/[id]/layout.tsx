import type { Metadata } from 'next';
import { contractDescription, contractTitle, fetchContractMeta } from '@/lib/contractMeta';

// The page itself is a client component and cannot export metadata, so the
// per-contract title and link-preview text live in this pass-through layout.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const contract = await fetchContractMeta(id);
  if (!contract) return { title: 'Contract' };

  const title = contractTitle(contract);
  const description = contractDescription(contract);
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
