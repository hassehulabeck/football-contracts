import axios from 'axios';

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY! },
});

// Swedish league IDs on api-football.com.
// Verified against GET /leagues?country=Sweden on 2026-08-05.
// Note: 115 is Svenska Cupen and 116 is not a Swedish competition — both were
// wrong in the original scaffold and silently corrupted the first team sync.
export const LEAGUE_IDS = {
  ALLSVENSKAN: 113,
  SUPERETTAN: 114,
  DAMALLSVENSKAN: 549,
  ELITETTAN: 736,
} as const;

export async function fetchTeams(leagueId: number, season: number) {
  const res = await client.get('/teams', { params: { league: leagueId, season } });
  return res.data.response as Array<{ team: { id: number; name: string } }>;
}

export async function fetchFinishedFixtures(teamId: number, season: number) {
  const res = await client.get('/fixtures', {
    params: { team: teamId, season, status: 'FT' },
  });
  return res.data.response as Array<{
    fixture: { id: number; date: string };
    teams: { home: { id: number; winner: boolean | null }; away: { id: number; winner: boolean | null } };
    goals: { home: number; away: number };
  }>;
}
