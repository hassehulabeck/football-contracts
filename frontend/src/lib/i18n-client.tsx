'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { LOCALE_COOKIE, makeTr, type Locale, type Tr } from './i18n';
import { setActiveLocale } from './apiMessages';

interface I18nValue {
  locale: Locale;
  tr: Tr;
  /** Remembers the choice, tells the server (for email), re-renders. */
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Seeded by the root layout with the locale the server rendered in, so the
 * first client render matches the HTML. Switching sets a cookie and refreshes
 * the server components; client components switch at once.
 */
export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setState] = useState<Locale>(initialLocale);
  // Set during render, not in an effect, so a request fired by a child's
  // first effect is already localised.
  setActiveLocale(locale);

  useEffect(() => setState(initialLocale), [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      document.documentElement.lang = next;
      setState(next);
      // Signed in: emails follow the site language. Signed out this 401s,
      // which is fine — registration sends the locale along instead.
      if (api.defaults.headers.common['Authorization']) {
        api.patch('/api/users/me/locale', { locale: next }).catch(() => {});
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ locale, tr: makeTr(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
