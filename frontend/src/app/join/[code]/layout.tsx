import type { Metadata } from 'next';
import { fetchPublic } from '@/lib/site';
import type { MiniLeagueInvite } from '@/types/api';
import { getI18n } from '@/lib/i18n-server';
import { plural } from '@/lib/i18n';

// Server-side so a pasted invite unfurls as "Join <league>" rather than the
// generic site card text. The image stays the site card.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const [invite, { locale, tr }] = await Promise.all([
    fetchPublic<MiniLeagueInvite>(`/api/mini-leagues/invite/${encodeURIComponent(code)}`, 60),
    getI18n(),
  ]);
  const robots = { index: false };
  if (!invite) return { title: tr('Invite', 'Inbjudan'), robots };

  const title = tr(`Join ${invite.name}`, `Gå med i ${invite.name}`);
  const players = plural(locale, invite.memberCount, ['player', 'players'], ['spelare', 'spelare']);
  const description = tr(
    `${invite.ownerName ? `${invite.ownerName} invites you` : 'You are invited'} to ${invite.name} (${players}) on Football Contracts — a free game where you bid on how football teams play.`,
    `${invite.ownerName ? `${invite.ownerName} bjuder in dig` : 'Du är inbjuden'} till ${invite.name} (${players}) på Football Contracts — ett gratis spel där du bjuder på hur fotbollslag spelar.`,
  );
  return { title, description, robots, openGraph: { title, description, url: `/join/${code}` } };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
