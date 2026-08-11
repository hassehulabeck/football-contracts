import { formatTeamName } from '@/lib/formatTeamName';
import { RESULT_STYLE } from './MatchRow';
import type { FulfillmentMatch, PatternProgressData } from '@/types/api';

/**
 * A letter the run has not reached. Flatter and dimmer than any real result, so
 * "not yet" never reads as a draw — RESULT_STYLE.D is itself grey.
 */
const PENDING_STYLE = 'bg-transparent text-white/25 border-white/10';

/**
 * Ring on a letter the run has actually produced.
 *
 * The ring, not the colour, is what marks a letter as banked. On WWW the green
 * would carry it alone, but a matched D in WDL is grey either way, and a pattern
 * has to be readable the same way whichever letters it happens to contain.
 */
const MATCHED_RING: Record<string, string> = {
  W: 'ring-2 ring-green-400/60',
  D: 'ring-2 ring-white/50',
  L: 'ring-2 ring-red-400/60',
};

/** "W 2–1 vs Häcken, 8 aug" — what a lit letter is standing on. */
function describe(match: FulfillmentMatch) {
  // homeScore/awayScore are stored home-first, so flip them for an away match.
  const [own, other] = match.isHome
    ? [match.homeScore, match.awayScore]
    : [match.awayScore, match.homeScore];
  const date = new Date(match.playedAt).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  });
  const opponent = match.opponent ? ` vs ${formatTeamName(match.opponent)}` : '';
  return `${match.result} ${own}–${other}${opponent}, ${date}`;
}

/**
 * The contract's pattern, letter by letter, with the ones already produced lit.
 *
 * `progress` is optional because an old backend answering mid-deploy sends none.
 * Without it every letter renders unlit, which is what the page showed before
 * this existed — a plain statement of the pattern.
 */
export function PatternProgress({
  pattern,
  progress,
}: {
  pattern: string;
  progress?: PatternProgressData;
}) {
  const letters = pattern.split('');
  const matched = progress?.matched ?? 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Pattern</p>

      <div className="flex gap-1.5 mb-2">
        {letters.map((letter, i) => {
          const isMatched = i < matched;
          const match = isMatched ? progress?.matches[i] : undefined;
          return (
            <span
              key={i}
              title={match ? describe(match) : undefined}
              aria-label={
                isMatched && match ? `${letter}, matched: ${describe(match)}` : `${letter}, not yet`
              }
              className={`inline-flex items-center justify-center w-8 h-8 rounded border font-mono font-bold ${
                isMatched
                  ? `${RESULT_STYLE[letter] ?? RESULT_STYLE.D} ${MATCHED_RING[letter] ?? ''}`
                  : PENDING_STYLE
              }`}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {progress && (
        <p className="text-xs text-white/40">
          {progress.complete ? (
            <span className="text-green-400 font-semibold">Pattern complete</span>
          ) : matched > 0 ? (
            <>
              <span className="tabular text-white/60 font-semibold">
                {matched} of {letters.length}
              </span>{' '}
              matched
            </>
          ) : (
            'No run in progress'
          )}
        </p>
      )}
    </div>
  );
}
