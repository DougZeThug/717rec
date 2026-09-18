import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import type { RecapTeamGrade } from '@/types/recapEdition';
import { getGradeColor } from '@/utils/reportCardUtils';

/** Hoisted so the default is one object, not a new one every render. */
const NO_BLURBS: Record<string, string> = {};

interface PowerRankingsTableProps {
  teams: RecapTeamGrade[];
  /** One line per team, keyed by team id, as written for the edition. */
  blurbs?: Record<string, string>;
}

/** Places gained or lost, or a dash when there was no week to compare with. */
const Movement: React.FC<{ team: RecapTeamGrade }> = ({ team }) => {
  if (team.previousRank === null) {
    return (
      <span className="text-muted-foreground" title="No previous week to compare with">
        —
      </span>
    );
  }

  // aria-label rather than a nested sr-only span: an extra element in here
  // splits the arrow away from its number for anything reading the text.
  const moved = team.previousRank - team.rank;
  if (moved > 0) {
    return (
      <span
        className="text-emerald-600 dark:text-emerald-400"
        aria-label={`Up ${moved} place${moved === 1 ? '' : 's'}`}
      >
        ▲{moved}
      </span>
    );
  }
  if (moved < 0) {
    const places = Math.abs(moved);
    return (
      <span
        className="text-red-600 dark:text-red-400"
        aria-label={`Down ${places} place${places === 1 ? '' : 's'}`}
      >
        ▼{places}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground" aria-label="No change">
      ▬
    </span>
  );
};

/** One team's row. Extracted so the table markup stays readable. */
const PowerRankingRow: React.FC<{ team: RecapTeamGrade; blurb?: string }> = ({ team, blurb }) => {
  const line = blurb?.trim() ?? '';

  return (
    <tr className="border-t border-border align-top">
      <td className="py-2 tabular-nums text-muted-foreground">{team.rank}</td>
      <td className="py-2 tabular-nums text-xs">
        <Movement team={team} />
      </td>
      <td className="py-2">
        <div className="font-medium">{team.teamName}</div>
        <div className="text-xs text-muted-foreground">{team.division}</div>
        {line !== '' && <p className="text-xs mt-1 max-w-prose">{line}</p>}
      </td>
      <td
        className={`py-2 text-center font-semibold ${
          team.grade ? getGradeColor(team.grade) : 'text-muted-foreground'
        }`}
      >
        {/* A team with no rating gets a dash, never a letter it has not earned. */}
        {team.grade ?? '—'}
      </td>
      <td className="py-2 text-right tabular-nums">
        {team.wins}–{team.losses}
      </td>
      <td className="py-2 text-right tabular-nums">
        {team.powerScore === null ? '—' : team.powerScore.toFixed(1)}
      </td>
    </tr>
  );
};

/** The table itself, so the card wrapping it does not deepen its markup. */
const RankingsGrid: React.FC<PowerRankingsTableProps> = ({ teams, blurbs = NO_BLURBS }) => (
  <table className="w-full text-sm">
    <caption className="sr-only">
      Every team in the league, ranked across all divisions for this week
    </caption>
    <thead>
      <tr className="text-muted-foreground text-left">
        <th className="pb-2 w-8">#</th>
        <th className="pb-2 w-10" aria-label="Movement since last week">
          +/-
        </th>
        <th className="pb-2">Team</th>
        <th className="pb-2 w-10 text-center">Grade</th>
        <th className="pb-2 text-right">W–L</th>
        <th className="pb-2 text-right">Power</th>
      </tr>
    </thead>
    <tbody>
      {teams.map((team) => (
        <PowerRankingRow key={team.teamId} team={team} blurb={blurbs[team.teamId]} />
      ))}
    </tbody>
  </table>
);

/**
 * The whole league, ranked, on the public recap page.
 *
 * Rows arrive ranked and graded in the frozen facts, so this never re-sorts and
 * never re-grades — what it shows is what was true when the edition was
 * published, whatever has happened since.
 *
 * Unlike the graphic, there is no row limit and no one-line clamp here: the
 * full blurb is shown.
 */
const PowerRankingsTable: React.FC<PowerRankingsTableProps> = ({ teams, blurbs = NO_BLURBS }) => {
  if (teams.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Power rankings</h2>
      <Card>
        <CardContent className="pt-6">
          <RankingsGrid teams={teams} blurbs={blurbs} />
        </CardContent>
      </Card>
    </section>
  );
};

export default PowerRankingsTable;
