import { api } from '@/lib/api';
import type { LeaderboardBoard, LeaderboardEntry, LeaderboardResponse } from '@/types/api';

/**
 * Fetches one leaderboard. The API used to answer with a bare array (the
 * credits ranking); an old backend still answering mid-deploy does, so both
 * shapes are accepted.
 */
export async function fetchLeaderboard(board: LeaderboardBoard, month?: string): Promise<LeaderboardEntry[]> {
  const r = await api.get<LeaderboardResponse | LeaderboardEntry[]>('/api/leaderboard', {
    params: { board, ...(month ? { month } : {}) },
  });
  return Array.isArray(r.data) ? r.data : r.data.entries;
}
