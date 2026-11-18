/**
 * English and Swedish. Strings are written in pairs where they are used —
 * tr('Contracts', 'Kontrakt') — rather than in a key dictionary: with two
 * languages a pair next to its use cannot drift out of step, and a page reads
 * the same as before with its translation beside it.
 *
 * Server components get `tr` from getI18n() (lib/i18n-server), client
 * components from useI18n() (lib/i18n-client).
 */
export type Locale = 'en' | 'sv';
export const LOCALE_COOKIE = 'fc_lang';

export function asLocale(value: string | null | undefined): Locale {
  return value === 'sv' ? 'sv' : 'en';
}

export type Tr = (en: string, sv: string) => string;

export function makeTr(locale: Locale): Tr {
  return locale === 'sv' ? (_en, sv) => sv : (en) => en;
}

/** For toLocaleString and friends. */
export const dateLocale = (locale: Locale) => (locale === 'sv' ? 'sv-SE' : 'en-GB');

/** Thousands grouping as each language writes it: 1,000 / 1 000. */
export function formatNumber(locale: Locale, n: number): string {
  return n.toLocaleString(dateLocale(locale));
}

/** "1 coupon" / "3 coupons", "1 kupong" / "3 kuponger". */
export function plural(locale: Locale, n: number, en: [string, string], sv: [string, string]): string {
  const [one, many] = locale === 'sv' ? sv : en;
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * No cookie yet: Swedish for a browser that prefers Swedish (or Norwegian or
 * Danish, which read Swedish fine), English for everyone else.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return 'en';
  const first = header.split(',')[0]?.trim().toLowerCase() ?? '';
  return /^(sv|nb|nn|no|da)\b/.test(first) ? 'sv' : 'en';
}
