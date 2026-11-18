import { ImageResponse } from 'next/og';
import { contractStatusLine, fetchContractMeta } from '@/lib/contractMeta';
import { formatTeamName } from '@/lib/formatTeamName';
import { LEAGUES } from '@/lib/leagues';
import { crestDataUrl, renderSiteCard, OG, OG_SIZE, OgMark, OgResultTile } from '@/lib/ogImage';
import { patternDescription } from '@/lib/patterns';
import { SITE_NAME } from '@/lib/site';
import { getI18n } from '@/lib/i18n-server';

// The preview a shared contract link unfurls into: team, pattern, and where
// the auction stands. Regenerated at most every five minutes (fetchPublic's
// revalidate), so an open auction's preview turns into a result in time.
export const alt = 'A Football Contracts contract';
export const size = OG_SIZE;
export const contentType = 'image/png';

// The league colours from globals.css, as hex for next/og.
const LEAGUE_HEX: Record<string, string> = {
  ALLSVENSKAN: '#60a5fa',
  SUPERETTAN: '#f87171',
  DAMALLSVENSKAN: '#c084fc',
  ELITETTAN: '#facc15',
  CHAMPIONSHIP: '#22d3ee',
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contract, { locale, tr }] = await Promise.all([fetchContractMeta(id), getI18n()]);

  // Unknown or unreachable contract: the site's own card, not an error image.
  if (!contract) return renderSiteCard(locale);

  const crest = await crestDataUrl(contract.team.externalId);
  const leagueColour = LEAGUE_HEX[contract.team.league] ?? OG.muted;
  const resolved = contract.status === 'FULFILLED' || contract.status === 'FAILED';
  const statusColour =
    contract.status === 'FULFILLED' ? OG.result.W : contract.status === 'FAILED' ? OG.result.L : OG.brandLight;

  // "Auction open until … · 5 coupons" reads as a headline and a detail line;
  // on one line it wrapped mid-phrase.
  const [headline, ...detail] = contractStatusLine(contract, locale).split(' · ');

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
          padding: 64,
          color: 'white',
          borderLeft: `16px solid ${leagueColour}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <OgMark size={48} />
            <span style={{ fontSize: 32, fontWeight: 700, color: OG.brand }}>{SITE_NAME}</span>
          </div>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: leagueColour,
              border: `3px solid ${leagueColour}`,
              borderRadius: 999,
              padding: '6px 22px',
            }}
          >
            {LEAGUES[contract.team.league].label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {crest && <img src={crest} width={112} height={112} style={{ objectFit: 'contain' }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 72, fontWeight: 700, color: OG.cream, lineHeight: 1.05 }}>
              {formatTeamName(contract.team.name)}
            </span>
            <span style={{ fontSize: 34, color: OG.muted }}>{patternDescription(contract.pattern, locale)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {[...contract.pattern].map((letter, i) => (
              <OgResultTile key={i} letter={letter} size={96} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, maxWidth: 640 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: statusColour, textAlign: 'right' }}>
              {headline}
            </span>
            {(detail.length > 0 || !resolved) && (
              <span style={{ fontSize: 24, color: OG.muted, textAlign: 'right' }}>
                {[...detail, ...(resolved ? [] : [tr('each pays 100 credits if it happens', 'var och en ger 100 krediter om det händer')])].join(' · ')}
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
