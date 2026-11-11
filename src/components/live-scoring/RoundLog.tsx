import React from 'react';

import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;

interface RoundLogProps {
  rounds: MatchRoundRow[];
  team1Name: string;
  team2Name: string;
  playerNames: Record<string, string>;
}

const bagSummary = (bagsIn: number | null, bagsOn: number | null) =>
  bagsIn === null || bagsOn === null ? null : `${bagsIn}IN ${bagsOn}ON`;

export const RoundLog: React.FC<RoundLogProps> = ({
  rounds,
  team1Name,
  team2Name,
  playerNames,
}) => {
  if (rounds.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-muted-foreground">
        No rounds yet — save the first round to get started.
      </p>
    );
  }

  const newestFirst = [...rounds].sort((a, b) => b.round_number - a.round_number);

  return (
    <ul className="divide-y rounded-lg border bg-card" aria-label="Round history">
      {newestFirst.map((round) => {
        // The team name gives way, not the points: a long name used to push
        // the row past the list edge and hide "+N". The space between stays real
        // text, so the row still reads "Name +3".
        const netLabel =
          round.winner_team === null ? (
            'Wash'
          ) : (
            <>
              <span className="truncate">{round.winner_team === 1 ? team1Name : team2Name}</span>{' '}
              <span className="shrink-0">+{round.net_points}</span>
            </>
          );
        const thrower1 = round.team1_thrower_id ? playerNames[round.team1_thrower_id] : null;
        const thrower2 = round.team2_thrower_id ? playerNames[round.team2_thrower_id] : null;
        const bags1 = bagSummary(round.team1_bags_in, round.team1_bags_on);
        const bags2 = bagSummary(round.team2_bags_in, round.team2_bags_on);

        return (
          <li key={round.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="w-8 shrink-0 text-xs text-muted-foreground">
              R{round.round_number}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {round.team1_score}–{round.team2_score}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {[thrower1, thrower2].filter(Boolean).join(' vs ')}
              {bags1 || bags2 ? ` · ${[bags1, bags2].filter(Boolean).join(' / ')}` : ''}
            </span>
            <span className="flex min-w-0 max-w-[50%] gap-1 text-xs font-medium">{netLabel}</span>
          </li>
        );
      })}
    </ul>
  );
};
