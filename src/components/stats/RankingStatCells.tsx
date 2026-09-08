import React from 'react';

import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import {
  formatPowerScore,
  getPowerScoreColor,
  getPowerScoreDescription,
  getSosColor,
} from '@/utils/colors';
import { getStandingsPercentageColor } from '@/utils/colors/standingsColors';

import RankTrendIndicator from './RankTrendIndicator';

interface RankingStatCellsProps {
  ranking: Ranking;
  textColor: string;
  showDivision: boolean;
  showRankChange: boolean;
}

const CELL = 'py-3 px-3 text-center';
const NUMERIC = 'font-medium tabular-nums';

/** Every numeric column of a standings row, in table order. */
export const RankingStatCells: React.FC<RankingStatCellsProps> = ({
  ranking,
  textColor,
  showDivision,
  showRankChange,
}) => {
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage ?? 0) * 100;
  const sos = ranking.sos ?? 0;
  const powerScoreBand = getPowerScoreDescription(ranking.powerScore);

  return (
    <>
      {showDivision && <td className={cn(CELL, textColor)}>{ranking.divisionName || 'N/A'}</td>}
      <td className={CELL}>
        {/* The colour is the only cue for how good the number is, so the band
            it falls in is spelled out for screen readers and on hover. */}
        <span
          className={cn(NUMERIC, getPowerScoreColor(ranking.powerScore))}
          title={powerScoreBand}
        >
          {formatPowerScore(ranking.powerScore)}
        </span>
        <span className="sr-only"> — {powerScoreBand}</span>
      </td>
      <td className={cn(CELL, NUMERIC, textColor)}>
        {ranking.wins}-{ranking.losses}
      </td>
      <td className={CELL}>
        <span className={cn(NUMERIC, getStandingsPercentageColor(winPercentage))}>
          {winPercentage.toFixed(1)}%
        </span>
      </td>
      <td className={cn(CELL, NUMERIC, 'hidden md:table-cell', textColor)}>
        {ranking.gamesWon ?? 0}-{ranking.gamesLost ?? 0}
      </td>
      <td className={cn(CELL, 'hidden lg:table-cell')}>
        <span className={cn(NUMERIC, getStandingsPercentageColor(gameWinPercentage))}>
          {gameWinPercentage.toFixed(1)}%
        </span>
      </td>
      <td className={CELL}>
        <span className={cn(NUMERIC, getSosColor(sos))}>{sos.toFixed(3)}</span>
      </td>
      <td className={cn(CELL, NUMERIC, textColor)}>{ranking.streak || 'N/A'}</td>
      <td className={CELL}>
        {showRankChange && Boolean(ranking.rankChange) && (
          <RankTrendIndicator rankChange={ranking.rankChange} />
        )}
      </td>
    </>
  );
};
