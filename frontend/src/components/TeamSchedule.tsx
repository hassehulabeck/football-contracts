'use client';

import { useState } from 'react';
import { formatTeamName } from '@/lib/formatTeamName';
import { MatchRow } from '@/components/MatchRow';
import { TeamLogo } from '@/components/TeamLogo';
import type { ScheduleFixture, TeamScheduleData } from '@/types/api';

/** How many rows each section shows before "see more". */
const PREVIEW_COUNT = 5;

const FIXTURE_STATUS_LABEL: Record<string, string> = {
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
};

export function TeamSchedule({ upcoming, recent }: TeamScheduleData) {
  return (
    <div className="grid gap-6">
      <Section
        title="Upcoming"
        rows={upcoming}
        empty="No fixtures scheduled — the season may be over."
        render={(f, i) => <FixtureRow key={i} fixture={f} />}
      />
      <Section
        title="Recent results"
        rows={recent}
        empty="No results recorded for this team yet."
        render={(m, i) => <MatchRow key={i} match={m} />}
      />
    </div>
  );
}

function Section<T>({
  title,
  rows,
  empty,
  render,
}: {
  title: string;
  rows: T[];
  empty: string;
  render: (row: T, index: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, PREVIEW_COUNT);
  const hidden = rows.length - shown.length;

  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">{title}</h2>

      {rows.length === 0 ? (
        <p className="text-white/25 text-sm">{empty}</p>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>{shown.map(render)}</tbody>
            </table>
          </div>

          {(hidden > 0 || expanded) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-brand-400 hover:text-brand-300 text-xs font-bold uppercase tracking-wide mt-3 transition-colors"
            >
              {expanded ? 'Show less' : `See ${hidden} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/**
 * One fixture still to come. Deliberately not MatchRow: there is no result or
 * score to show, and a placeholder in those columns would read as 0–0.
 */
function FixtureRow({ fixture }: { fixture: ScheduleFixture }) {
  const off = fixture.status === 'POSTPONED' || fixture.status === 'CANCELLED';

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-3 py-2.5 tabular text-white/40 text-xs whitespace-nowrap">
        {new Date(fixture.kickoffAt).toLocaleDateString('sv-SE', {
          month: 'short',
          day: 'numeric',
        })}
      </td>
      <td className="px-3 py-2.5 tabular text-white/30 text-xs whitespace-nowrap">
        {/* A TBD fixture still carries a date, so the time can be a placeholder
            00:00. Shown anyway — it is what the API knows. */}
        {new Date(fixture.kickoffAt).toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
      <td className={`px-3 py-2.5 ${off ? 'text-white/30 line-through' : 'text-white/50'}`}>
        {fixture.opponent ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-white/30">vs</span>
            <TeamLogo externalId={fixture.opponentTeamId} className="w-3.5 h-3.5" />
            {formatTeamName(fixture.opponent)}
          </span>
        ) : (
          <span className="text-white/25">Opponent unknown</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {off ? (
          <span className="text-orange-300/70 text-xs font-semibold uppercase tracking-wide">
            {FIXTURE_STATUS_LABEL[fixture.status]}
          </span>
        ) : (
          <span className="text-white/30 text-xs">{fixture.isHome ? 'Home' : 'Away'}</span>
        )}
      </td>
    </tr>
  );
}
