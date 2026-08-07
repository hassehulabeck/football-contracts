/**
 * Team names arrive from api-football.com with a "Women" suffix on every
 * Damallsvenskan and Elitettan club — "BK Häcken Women", "Örebro SK Women".
 * The league badge and row stripe already say which league a team is in, and
 * the four leagues are colour-coded, so the suffix repeats what the badge
 * next to it has already said.
 *
 * Stripped at render time only. The stored name keeps the suffix, because
 * syncTeams matches on it: normalizeName strips "women"/"w" as tokens, and the
 * LEAGUE_GENDER guard uses it to stop a women's club reconciling onto the
 * men's club of the same name.
 *
 * Exact suffix match rather than a regex — a club whose name merely contains
 * "women" must come through untouched.
 */
const SUFFIX = ' Women';

export function formatTeamName(name: string): string {
  return name.endsWith(SUFFIX) ? name.slice(0, -SUFFIX.length) : name;
}
