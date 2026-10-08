import type { ContractPattern } from '@/types/api';

// A pattern is any three results in order, so labels are built from the
// letters rather than looked up — all 27 combinations read correctly.

const WORD: Record<string, { one: string; many: string }> = {
  W: { one: 'Win', many: 'wins' },
  D: { one: 'Draw', many: 'draws' },
  L: { one: 'Loss', many: 'losses' },
};

const isTriple = (p: string) => p[0] === p[1] && p[1] === p[2];

/** Short form for tables: "Three wins", "Win → Draw → Loss". */
export function patternLabel(pattern: ContractPattern | string): string {
  if (isTriple(pattern)) return `Three ${WORD[pattern[0]].many}`;
  return [...pattern].map((r) => WORD[r].one).join(' → ');
}

/** Sentence form: "Three consecutive wins", "Win, then draw, then loss". */
export function patternDescription(pattern: ContractPattern | string): string {
  if (isTriple(pattern)) return `Three consecutive ${WORD[pattern[0]].many}`;
  const [a, b, c] = [...pattern].map((r) => WORD[r].one);
  return `${a}, then ${b.toLowerCase()}, then ${c.toLowerCase()}`;
}
