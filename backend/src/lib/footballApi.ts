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

export type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
};

/**
 * Finished fixtures for one league, optionally limited to a date window.
 *
 * Deliberately per-league and not per-team. The per-team form costs one request
 * per team — 60 requests to learn what four requests already contain, since both
 * clubs in a Swedish league match are tracked. It also pulls in cup and European
 * fixtures, which is the wrong result set: a contract is about league form.
 *
 * `from`/`to` are inclusive YYYY-MM-DD strings in the API's own timezone (UTC).
 */
export async function fetchLeagueFixtures(
  leagueId: number,
  season: number,
  from?: string,
  to?: string,
) {
  return getFixtures(leagueId, season, 'FT', from, to);
}

/**
 * Fixtures that have not been played, for the upcoming-schedule table.
 *
 * Postponed and cancelled fixtures are pulled alongside the scheduled ones on
 * purpose. Filtering to NS would make a postponed match disappear from the
 * schedule entirely, which reads as "no game that week" rather than "this game
 * is off" — and with a weekly refresh, that wrong impression would stand for
 * days.
 *
 * Same per-league shape and cost as fetchLeagueFixtures above.
 */
export async function fetchUpcomingLeagueFixtures(
  leagueId: number,
  season: number,
  from?: string,
  to?: string,
) {
  // api-football takes several statuses as one dash-joined value.
  // TBD is a fixture with a date but no confirmed kick-off time yet.
  return getFixtures(leagueId, season, 'NS-TBD-PST-CANC', from, to);
}

async function getFixtures(
  leagueId: number,
  season: number,
  status: string,
  from?: string,
  to?: string,
) {
  const res = await client.get('/fixtures', {
    params: { league: leagueId, season, status, ...(from && to ? { from, to } : {}) },
  });

  const errors = res.data.errors;
  // The API answers 200 with an `errors` object for plan/parameter problems —
  // an empty `response` would otherwise read as "no matches were played".
  if (errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)) {
    throw new Error(`api-football rejected league=${leagueId} season=${season}: ${JSON.stringify(errors)}`);
  }

  return res.data.response as ApiFixture[];
}
