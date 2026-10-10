'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth';
import { CreditHistory } from '@/components/CreditHistory';

export default function HistoryPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/dashboard" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
        ← Dashboard
      </Link>
      <h1 className="text-4xl sm:text-5xl text-brand-500 mt-2 mb-2">Credit history</h1>
      <p className="text-white/50 mb-8">
        Every change to your balance: coupons bought, contracts paid out, and any corrections.
      </p>
      <CreditHistory pageSize={25} paged />
    </div>
  );
}
