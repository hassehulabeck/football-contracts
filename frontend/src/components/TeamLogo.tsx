'use client';

// Client-side for the same reason as LeagueBadge: the onError fallback is an
// event handler, which a server component cannot pass to an <img>.

interface TeamLogoProps {
  /** The team's api-football id. Nothing renders without one. */
  externalId: number | null | undefined;
  className?: string;
}

/**
 * A club crest, from api-football's media CDN — the same source as the league
 * logos in `lib/leagues.ts`, keyed by the team id already stored on every Team.
 *
 * Plain <img>, not next/image: nothing else in the app uses next/image, and it
 * would mean whitelisting the CDN host in next.config.js for a 16px icon.
 * Decorative by design — every place this appears, the team's name is next to
 * it — so the alt is empty and a missing crest hides itself rather than leaving
 * a broken-image box in a table cell.
 */
export function TeamLogo({ externalId, className = '' }: TeamLogoProps) {
  if (!externalId) return null;

  return (
    <img
      src={`https://media.api-sports.io/football/teams/${externalId}.png`}
      alt=""
      aria-hidden="true"
      className={`w-4 h-4 object-contain shrink-0 ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
