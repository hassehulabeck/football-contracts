import { cookies, headers } from 'next/headers';
import { asLocale, LOCALE_COOKIE, localeFromAcceptLanguage, makeTr, type Locale } from './i18n';

/** The visitor's language: their explicit choice, else their browser's. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (chosen) return asLocale(chosen);
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, tr: makeTr(locale) };
}
