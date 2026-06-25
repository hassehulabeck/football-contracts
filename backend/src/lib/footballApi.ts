import axios from 'axios';

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY! },
});

// Swedish league IDs on api-football.com
export const LEAGUE_IDS = {
  ALLSVENSKAN: 113,
  DAMALLSVENSKAN: 114,
  SUPERETTAN: 115,
  ELITETTAN: 116,
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
