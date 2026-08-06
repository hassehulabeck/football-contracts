import { leagueStyle } from '@/lib/leagues';

interface LeagueBadgeProps {
  league: string;
  /** Use the abbreviated league name — for tight table columns. */
  short?: boolean;
  className?: string;
}

export function LeagueBadge({ league, short, className = '' }: LeagueBadgeProps) {
  const style = leagueStyle(league);

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
      {short ? style.short : style.label}
    </span>
  );
}
