'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth';
import { CreditHistory } from '@/components/CreditHistory';
import { useI18n } from '@/lib/i18n-client';

export default function HistoryPage() {
  const { user, loading } = useRequireAuth();
  const { tr } = useI18n();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">{tr('Loading…', 'Laddar…')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/dashboard" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
        {tr('← Dashboard', '← Översikt')}
      </Link>
      <h1 className="text-4xl sm:text-5xl text-brand-500 mt-2 mb-2">{tr('Credit history', 'Kredithistorik')}</h1>
      <p className="text-white/50 mb-8">
        {tr(
          'Every change to your balance: coupons bought, contracts paid out, and any corrections.',
          'Varje ändring av ditt saldo: köpta kuponger, utbetalda kontrakt och eventuella rättelser.',
        )}
      </p>
      <CreditHistory pageSize={25} paged />
    </div>
  );
}
