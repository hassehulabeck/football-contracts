import type { Metadata } from 'next';
import { fetchPublic } from '@/lib/site';
import type { MiniLeagueInvite } from '@/types/api';

// Server-side so a pasted invite unfurls as "Join <league>" rather than the
// generic site card text. The image stays the site card.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const invite = await fetchPublic<MiniLeagueInvite>(`/api/mini-leagues/invite/${encodeURIComponent(code)}`, 60);
  const robots = { index: false };
  if (!invite) return { title: 'Invite', robots };

  const title = `Join ${invite.name}`;
  const players = `${invite.memberCount} player${invite.memberCount === 1 ? '' : 's'}`;
  const description = `${invite.ownerName ? `${invite.ownerName} invites you` : 'You are invited'} to ${invite.name} (${players}) on Football Contracts — a free game where you bid on how football teams play.`;
  return { title, description, robots, openGraph: { title, description, url: `/join/${code}` } };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
