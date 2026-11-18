import { z } from 'zod';

/**
 * The site speaks English and Swedish. Strings are written in pairs where
 * they are used — tr(locale, 'English', 'Svenska') — rather than kept in a
 * key dictionary: with two languages, a pair next to its use cannot drift out
 * of step the way a key file does.
 */
export type Locale = 'en' | 'sv';
export const LOCALES: Locale[] = ['en', 'sv'];
export const localeSchema = z.enum(['en', 'sv']);

export function asLocale(value: string | null | undefined): Locale {
  return value === 'sv' ? 'sv' : 'en';
}

export function tr(locale: Locale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

/** "1 coupon" / "3 coupons", "1 kupong" / "3 kuponger". */
export function plural(locale: Locale, n: number, en: [string, string], sv: [string, string]): string {
  const [one, many] = locale === 'sv' ? sv : en;
  return `${n} ${n === 1 ? one : many}`;
}

/** Thousands grouping as each language writes it: 1,000 / 1 000. */
export function formatNumber(locale: Locale, n: number): string {
  return n.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-GB');
}

export const dateLocale = (locale: Locale) => (locale === 'sv' ? 'sv-SE' : 'en-GB');
