'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n-client';
import { LanguageSwitch } from './LanguageSwitch';

export function Footer() {
  const { tr } = useI18n();
  return (
    <footer className="border-t border-white/10 px-4 sm:px-6 py-6 mt-12">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-white/40">
        <span>{tr('Football Contracts — a free prediction game. No real money involved.', 'Football Contracts — ett gratis tippningsspel. Inga riktiga pengar.')}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/results" className="hover:text-orange-200 transition-colors">
            {tr('Results', 'Resultat')}
          </Link>
          <Link href="/rules" className="hover:text-orange-200 transition-colors">
            {tr('Rules', 'Regler')}
          </Link>
          <Link href="/privacy" className="hover:text-orange-200 transition-colors">
            {tr('Privacy', 'Integritet')}
          </Link>
          <Link href="/feedback" className="hover:text-orange-200 transition-colors">
            {tr('Contact & feedback', 'Kontakt & synpunkter')}
          </Link>
          <LanguageSwitch />
        </nav>
      </div>
    </footer>
  );
}
