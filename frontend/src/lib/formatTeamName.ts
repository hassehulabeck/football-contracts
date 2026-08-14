/**
 * Team names arrive from api-football.com with a " W" suffix on every
 * Damallsvenskan and Elitettan club — "Häcken W", "Örebro SK W", "Häcken II W".
 * All 28 women's clubs carry it and no men's club does. The league badge and
 * row stripe already say which league a team is in, and every league is
 * colour-coded, so the suffix repeats what the badge next to it just said.
 *
 * " Women" is stripped too. No club currently uses that form — every row in
 * production is " W" — but api-football has spelled it both ways across
 * endpoints, and a suffix that reappears costs a redeploy to strip again.
 *
 * Stripped at render time only. The stored name keeps the suffix, because
 * syncTeams matches on it: normalizeName strips "women"/"w" as tokens, and the
 * LEAGUE_GENDER guard uses it to stop a women's club reconciling onto the
 * men's club of the same name.
 *
 * Exact suffix match rather than a regex on the word: a club whose name merely
 * contains "w" must come through untouched, and " W" is only a suffix here.
 * Longest first, so " Women" is not left as "omen" by the " W" branch.
 */
const SUFFIXES = [' Women', ' W'];

export function formatTeamName(name: string): string {
  const suffix = SUFFIXES.find((s) => name.endsWith(s));
  return suffix ? name.slice(0, -suffix.length) : name;
}
