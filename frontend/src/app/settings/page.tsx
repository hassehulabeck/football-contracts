'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth';

function Row({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
    >
      <span>
        <span className="block text-orange-100 font-semibold">{title}</span>
        <span className="block text-sm text-white/40">{detail}</span>
      </span>
      <span className="text-brand-400">→</span>
    </Link>
  );
}

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Settings</h1>
      <p className="text-white/50 mb-8">Signed in as {user.email}</p>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <Row href="/settings/username" title="Username" detail={user.username ?? 'Not set'} />
        <Row
          href="/settings/notifications"
          title="Email notifications"
          detail="Auction results, payouts, new contracts for your teams"
        />
      </div>
    </div>
  );
}
