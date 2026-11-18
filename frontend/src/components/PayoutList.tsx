import Link from 'next/link';
import { formatTeamName } from '@/lib/formatTeamName';
import { patternLabel } from '@/lib/patterns';
import { LeagueBadge } from './LeagueBadge';
import { TeamLogo } from './TeamLogo';
import type { Payout } from '@/types/api';

const PAYOUT = 100;

function day(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short' });
}

/**
 * Fulfilled contracts as "bought for 8–22, paid 100". The point is the gap
 * between the two numbers: it is what tells a newcomer the game is worth
 * playing, and an existing player what to bid next time.
 */
export function PayoutList({ payouts }: { payouts: Payout[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {payouts.map((p) => {
        const best = p.pricePaid ? PAYOUT - p.pricePaid.min : null;
        return (
          <li key={p.id}>
            <Link
              href={`/contracts/${p.id}`}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3 sm:px-4 py-3 transition-colors"
            >
              <TeamLogo externalId={p.team.externalId} className="w-7! h-7!" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-orange-100 truncate">{formatTeamName(p.team.name)}</span>
                  <span className="font-mono font-black text-brand-400 text-sm">{p.pattern}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                  <LeagueBadge league={p.team.league} short />
                  <span className="truncate" title={patternLabel(p.pattern)}>{day(p.resolvedAt)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {p.pricePaid ? (
                  <>
                    <div className="text-sm text-white/60 tabular">
                      Bought for{' '}
                      <span className="text-orange-100 font-semibold">
                        {p.pricePaid.min === p.pricePaid.max ? p.pricePaid.min : `${p.pricePaid.min}–${p.pricePaid.max}`}
                      </span>
                    </div>
                    <div className="text-green-400 font-black tabular">up to +{best}</div>
                  </>
                ) : (
                  <div className="text-white/30 text-sm">No coupons sold</div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
