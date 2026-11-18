import type { Locale } from './i18n';
import type { ContractPattern } from '@/types/api';

// A pattern is any three results in order, so labels are built from the
// letters rather than looked up — all 27 combinations read correctly.

const WORD: Record<Locale, Record<string, { one: string; many: string }>> = {
  en: {
    W: { one: 'Win', many: 'wins' },
    D: { one: 'Draw', many: 'draws' },
    L: { one: 'Loss', many: 'losses' },
  },
  sv: {
    W: { one: 'Vinst', many: 'vinster' },
    D: { one: 'Oavgjort', many: 'oavgjorda' },
    L: { one: 'Förlust', many: 'förluster' },
  },
};

const isTriple = (p: string) => p[0] === p[1] && p[1] === p[2];

/** Short form for tables: "Three wins", "Win → Draw → Loss" / "Tre vinster". */
export function patternLabel(pattern: ContractPattern | string, locale: Locale = 'en'): string {
  const w = WORD[locale];
  if (isTriple(pattern)) return `${locale === 'sv' ? 'Tre' : 'Three'} ${w[pattern[0]].many}`;
  return [...pattern].map((r) => w[r].one).join(' → ');
}

/** Sentence form: "Three consecutive wins", "Win, then draw, then loss". */
export function patternDescription(pattern: ContractPattern | string, locale: Locale = 'en'): string {
  const w = WORD[locale];
  if (isTriple(pattern)) {
    return locale === 'sv' ? `Tre raka ${w[pattern[0]].many}` : `Three consecutive ${w[pattern[0]].many}`;
  }
  const [a, b, c] = [...pattern].map((r) => w[r].one);
  const then = locale === 'sv' ? 'sedan' : 'then';
  return `${a}, ${then} ${b.toLowerCase()}, ${then} ${c.toLowerCase()}`;
}
