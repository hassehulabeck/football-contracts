'use client';

// Client-side only because of the crest's onError fallback below: an event
// handler cannot be handed to a DOM element from a server component, and /rules
// renders this badge during static generation.

import { LEAGUE_LOGO, leagueStyle } from '@/lib/leagues';
import type { League } from '@/types/api';

interface LeagueBadgeProps {
  league: string;
  /** Use the abbreviated league name — for tight table columns. */
  short?: boolean;
  className?: string;
}

export function LeagueBadge({ league, short, className = '' }: LeagueBadgeProps) {
  const style = leagueStyle(league);
  // A league outside the enum has no crest to show; the dot still carries the
  // (grey) unknown styling, so that case keeps the badge it always had.
  const logo = LEAGUE_LOGO[league as League];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style.badge} ${className}`}
    >
      {logo ? (
        // Decorative: the league name is right beside it. Hides itself if the
        // CDN has no crest, rather than leaving a broken-image box in the pill.
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="w-3.5 h-3.5 object-contain shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
      )}
      {short ? style.short : style.label}
    </span>
  );
}
