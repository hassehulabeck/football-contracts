import { api } from './api';
import type { LeaderboardBoard, MiniLeagueDetail, MiniLeagueInvite, MiniLeagueSummary } from '@/types/api';

export async function fetchMyMiniLeagues(): Promise<MiniLeagueSummary[]> {
  return (await api.get<{ leagues: MiniLeagueSummary[] }>('/api/mini-leagues')).data.leagues;
}

export async function fetchMiniLeague(id: string, board: LeaderboardBoard, month?: string): Promise<MiniLeagueDetail> {
  return (
    await api.get<MiniLeagueDetail>(`/api/mini-leagues/${encodeURIComponent(id)}`, {
      params: { board, ...(month ? { month } : {}) },
    })
  ).data;
}

export async function fetchInvite(code: string): Promise<MiniLeagueInvite> {
  return (await api.get<MiniLeagueInvite>(`/api/mini-leagues/invite/${encodeURIComponent(code)}`)).data;
}

export async function createMiniLeague(name: string): Promise<{ id: string; inviteCode: string }> {
  return (await api.post('/api/mini-leagues', { name })).data;
}

export async function joinMiniLeague(code: string): Promise<{ id: string; name: string; joined: boolean }> {
  return (await api.post('/api/mini-leagues/join', { code })).data;
}

/** The link a player sends their friends. */
export function inviteUrl(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

/**
 * An invite opened by someone signed out survives the detour through
 * register → activation email → login: the join page parks the code here and
 * the login page picks it up. Wrapped in try/catch because storage can be
 * blocked (private windows), and losing the invite then is the right failure.
 */
const PENDING_KEY = 'fc_pending_invite';

export function setPendingInvite(code: string) {
  try { localStorage.setItem(PENDING_KEY, code); } catch {}
}

export function takePendingInvite(): string | null {
  try {
    const code = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}

/** Axios error text from the API, or a fallback. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

/**
 * A pasted invite: the whole link or just the code. Returns the code, or null
 * if there is nothing code-shaped in it.
 */
export function normaliseCodeInput(raw: string): string | null {
  const text = raw.trim();
  const fromLink = text.match(/\/join\/([A-Za-z0-9]+)/);
  const code = (fromLink ? fromLink[1] : text).toUpperCase();
  return /^[A-Z0-9]{4,20}$/.test(code) ? code : null;
}

export async function renameMiniLeague(id: string, name: string): Promise<{ name: string }> {
  return (await api.patch(`/api/mini-leagues/${encodeURIComponent(id)}`, { name })).data;
}

export async function newInviteCode(id: string): Promise<{ inviteCode: string }> {
  return (await api.post(`/api/mini-leagues/${encodeURIComponent(id)}/invite-code`)).data;
}

export async function deleteMiniLeague(id: string) {
  await api.delete(`/api/mini-leagues/${encodeURIComponent(id)}`);
}

/** Pass "me" to leave. */
export async function removeMiniLeagueMember(id: string, userId: string) {
  await api.delete(`/api/mini-leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`);
}
