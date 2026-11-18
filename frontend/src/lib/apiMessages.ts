import type { Locale } from './i18n';

/**
 * Swedish for the messages the API answers with. The API speaks English; the
 * frontend translates what it shows, so no route needs to know the visitor's
 * language. Anything not listed (validation detail, admin-only errors) is
 * shown as the API wrote it.
 */
const SV: Record<string, string> = {
  '3–20 characters, using letters, digits, underscores or hyphens': '3–20 tecken: bokstäver, siffror, understreck eller bindestreck',
  'A username can only be changed once every 30 days': 'Användarnamnet kan bara ändras en gång var 30:e dag',
  'Auction has closed': 'Auktionen har stängt',
  'Auction not found': 'Auktionen hittades inte',
  'Email already registered': 'E-postadressen är redan registrerad',
  'Google sign-in failed — please try again': 'Inloggningen med Google misslyckades — försök igen',
  'Google sign-in is not enabled': 'Inloggning med Google är inte påslagen',
  'Insufficient credits': 'Du har inte tillräckligt med krediter',
  'Invalid credentials': 'Fel e-post eller lösenord',
  'Invalid email or password': 'Fel e-post eller lösenord',
  'Invalid or expired token': 'Länken är ogiltig eller har gått ut',
  'Missing token': 'Länken saknar kod',
  'No account found with that email': 'Det finns inget konto med den e-postadressen',
  'Not found': 'Hittades inte',
  'Only the owner can remove players': 'Bara ägaren kan ta bort spelare',
  'That username is taken': 'Användarnamnet är upptaget',
  'This account is already activated — you can log in': 'Kontot är redan aktiverat — du kan logga in',
  'This invite link is not valid any more': 'Den här inbjudningslänken gäller inte längre',
  'This mini-league is full': 'Miniligan är full',
  'This reset link is invalid or has expired — request a new one': 'Återställningslänken är ogiltig eller har gått ut — begär en ny',
  'This unsubscribe link is not valid': 'Avregistreringslänken är ogiltig',
  'Too many messages — please try again in an hour': 'För många meddelanden — försök igen om en timme',
  'Type DELETE to confirm': 'Skriv DELETE för att bekräfta',
  'Wrong password': 'Fel lösenord',
  'Something went wrong': 'Något gick fel',
  'Account activated. You can now log in.': 'Kontot är aktiverat. Nu kan du logga in.',
  'Activation email sent — check your inbox': 'Aktiveringsmejlet är skickat — kolla din inkorg',
  'Check your email to activate your account': 'Kolla din e-post för att aktivera kontot',
  'If an account exists for that email, a reset link is on its way': 'Om det finns ett konto för den adressen är en återställningslänk på väg',
  'Password changed. You can now log in.': 'Lösenordet är ändrat. Nu kan du logga in.',
  'Please verify your email first': 'Bekräfta din e-post först',
  'Bid placed': 'Budet är lagt',
  'Thanks!': 'Tack!',
  'Unsubscribed': 'Avregistrerad',
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Please wait (\d+)s before requesting another email$/, (m) => `Vänta ${m[1]} sekunder innan du begär ett nytt mejl`],
  [/^You can be in at most (\d+) mini-leagues$/, (m) => `Du kan vara med i högst ${m[1]} miniligor`],
];

export function localiseApiMessage(message: string, locale: Locale): string {
  if (locale !== 'sv') return message;
  if (SV[message]) return SV[message];
  for (const [re, fn] of PATTERNS) {
    const m = message.match(re);
    if (m) return fn(m);
  }
  return message;
}

/**
 * The language the visitor is reading, kept here so the axios interceptor in
 * lib/api can localise every response without each call site passing it.
 * I18nProvider keeps it current.
 */
let activeLocale: Locale = 'en';
export function setActiveLocale(locale: Locale) {
  activeLocale = locale;
}
export function getActiveLocale(): Locale {
  return activeLocale;
}
