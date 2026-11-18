import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';

/** How many mini-leagues one player can be in, and how big one can get. */
export const MAX_LEAGUES_PER_PLAYER = 20;
export const MAX_MEMBERS = 200;

// No 0/O, 1/I/L: a code gets read out loud and typed off a phone screen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

/** 31^8 ≈ 850 billion codes: unguessable for a game, short enough to type. */
export function newInviteCode(): string {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  let code = '';
  // 256 % 31 leaves a slight bias towards the first letters; harmless here.
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

/** Codes are shown upper-case but accepted however they were typed. */
export function normaliseInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Takes one player out of a league, keeping the league in a sane state:
 * an owner leaving hands the league to whoever has been in it longest, and
 * the last member leaving deletes it. Called for leaving, being removed, and
 * account deletion, so all three agree.
 */
export async function removeMember(tx: Prisma.TransactionClient, leagueId: string, userId: string) {
  await tx.miniLeagueMember.deleteMany({ where: { leagueId, userId } });

  const league = await tx.miniLeague.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
  if (!league) return;

  const next = await tx.miniLeagueMember.findFirst({
    where: { leagueId },
    orderBy: { joinedAt: 'asc' },
    select: { userId: true },
  });
  if (!next) {
    await tx.miniLeague.delete({ where: { id: leagueId } });
  } else if (league.ownerId === userId || league.ownerId === null) {
    await tx.miniLeague.update({ where: { id: leagueId }, data: { ownerId: next.userId } });
  }
}

/** Every league a player is in, left one by one so each gets the rules above. */
export async function leaveAllLeagues(tx: Prisma.TransactionClient, userId: string) {
  const memberships = await tx.miniLeagueMember.findMany({ where: { userId }, select: { leagueId: true } });
  for (const m of memberships) await removeMember(tx, m.leagueId, userId);
}
