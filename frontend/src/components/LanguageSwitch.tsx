'use client';

import { useI18n } from '@/lib/i18n-client';

/** "Svenska · English", the current one highlighted. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const option = (code: 'sv' | 'en', label: string) => (
    <button
      type="button"
      onClick={() => locale !== code && setLocale(code)}
      aria-pressed={locale === code}
      lang={code}
      className={locale === code ? 'text-orange-200 font-semibold' : 'hover:text-orange-200 transition-colors'}
    >
      {label}
    </button>
  );
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {option('sv', 'Svenska')}
      <span aria-hidden="true">·</span>
      {option('en', 'English')}
    </span>
  );
}
