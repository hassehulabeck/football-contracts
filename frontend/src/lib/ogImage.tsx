/**
 * Shared pieces for the link-preview images (opengraph-image.tsx routes).
 *
 * These render through next/og, which supports only a subset of CSS — flexbox
 * layout, inline styles, no Tailwind classes — so the site's theme tokens are
 * repeated here as plain hex values. Keep them in step with globals.css.
 */
import { ImageResponse } from 'next/og';
import { SITE_NAME } from './site';

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  pitch: '#1a1a18',
  brand: '#f97316',
  brandLight: '#fdba74',
  cream: '#fed7aa',
  muted: 'rgba(255,255,255,0.55)',
  result: { W: '#4ade80', D: '#d4d4d4', L: '#f87171' } as Record<string, string>,
};

/** The site's football mark, the same drawing as app/icon.svg. */
export function OgMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#2a2a27" />
      <circle cx="32" cy="32" r="22" fill={OG.brand} />
      <path d="M32 21.5 42 28.8 38.2 40.5H25.8L22 28.8Z" fill={OG.pitch} />
      <path
        d="M32 21.5V10.4M42 28.8 52.7 25.3M38.2 40.5 44.8 49.5M25.8 40.5 19.2 49.5M22 28.8 11.3 25.3"
        stroke={OG.pitch}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** One result letter as a coloured tile, as on the contract page. */
export function OgResultTile({ letter, size = 120 }: { letter: string; size?: number }) {
  const colour = OG.result[letter] ?? OG.muted;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        border: `6px solid ${colour}`,
        background: 'rgba(255,255,255,0.04)',
        color: colour,
        fontSize: size * 0.55,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {letter}
    </div>
  );
}

/**
 * A crest as a data URL, or null. Fetched here rather than handed to <img> as
 * a URL because a failed fetch inside the renderer fails the whole image; a
 * preview without a crest is fine, a broken preview is not.
 */
export async function crestDataUrl(externalId: number | null | undefined): Promise<string | null> {
  if (!externalId) return null;
  try {
    const res = await fetch(`https://media.api-sports.io/football/teams/${externalId}.png`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** The site's own card: the preview for every page without one of its own. */
export function renderSiteCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: OG.pitch,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <OgMark />
          <span style={{ fontSize: 40, fontWeight: 700, color: OG.brand }}>{SITE_NAME}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <OgResultTile letter="W" />
            <OgResultTile letter="D" />
            <OgResultTile letter="L" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
            <span style={{ fontSize: 56, fontWeight: 700, color: OG.cream, lineHeight: 1.1 }}>
              Bid on how your team plays
            </span>
            <span style={{ fontSize: 28, color: OG.muted, lineHeight: 1.35 }}>
              Win a coupon in a silent auction. It pays 100 credits if the team hits the pattern.
            </span>
          </div>
        </div>

        <span style={{ fontSize: 26, color: OG.muted }}>
          Allsvenskan · Superettan · Damallsvenskan · Elitettan · Championship — free to play
        </span>
      </div>
    ),
    OG_SIZE,
  );
}
