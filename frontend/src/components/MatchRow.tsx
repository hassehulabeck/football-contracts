import { formatTeamName } from '@/lib/formatTeamName';
import { TeamLogo } from '@/components/TeamLogo';
import type { FulfillmentMatch } from '@/types/api';

export const RESULT_STYLE: Record<string, string> = {
  W: 'bg-green-500/20 text-green-400 border-green-500/40',
  D: 'bg-white/10 text-white/60 border-white/20',
  L: 'bg-red-500/20 text-red-400 border-red-500/40',
};

/**
 * One played match: result letter, date, score, opponent.
 *
 * Shared by the fulfillment table on a fulfilled contract and by the recent-form
 * list, so a result reads the same in both places.
 */
export function MatchRow({ match }: { match: FulfillmentMatch }) {
  // homeScore/awayScore are always stored home-first, so flip them for an away
  // match to read as "us — them".
  const [own, other] = match.isHome
    ? [match.homeScore, match.awayScore]
    : [match.awayScore, match.homeScore];

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-3 py-2.5 w-10">
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded border font-mono font-bold text-xs ${
            RESULT_STYLE[match.result] ?? RESULT_STYLE.D
          }`}
        >
          {match.result}
        </span>
      </td>
      <td className="px-3 py-2.5 tabular text-white/40 text-xs whitespace-nowrap">
        {new Date(match.playedAt).toLocaleDateString('sv-SE', {
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-3 py-2.5 tabular font-bold text-orange-100 whitespace-nowrap">
        {own}–{other}
      </td>
      <td className="px-3 py-2.5 text-white/50">
        {match.opponent ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-white/30">vs</span>
            <TeamLogo externalId={match.opponentTeamId} className="w-3.5 h-3.5" />
            {formatTeamName(match.opponent)}
          </span>
        ) : (
          <span className="text-white/25">Opponent unknown</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-white/30 text-xs text-right">
        {match.isHome ? 'Home' : 'Away'}
      </td>
    </tr>
  );
}
