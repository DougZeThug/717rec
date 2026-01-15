import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import type { ConfidenceLevel, PredictionResult } from '@/utils/predictions';
import { formatBreakdown, formatProbability } from '@/utils/predictions';

interface MatchPredictionProps {
  prediction: PredictionResult;
  team1Name: string;
  team2Name: string;
}

/**
 * Displays match prediction for upcoming matches
 *
 * Shows:
 * - Win probability for each team (e.g., "Team A 72% · Team B 28%")
 * - Expected outcome text (e.g., "Team A favored")
 * - Confidence level badge (Low/Medium/High)
 * - Expandable "Why" breakdown showing inputs
 */
export const MatchPrediction: React.FC<MatchPredictionProps> = ({
  prediction,
  team1Name,
  team2Name,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { probA, probB, expectedText, confidence, breakdown } = prediction;

  // Determine which team is favored for styling
  const team1Favored = probA > probB;
  const isCoinFlip = Math.abs(probA - 0.5) < 0.03;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      {/* Main prediction line */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex flex-col items-center gap-1.5',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md py-1.5 px-2 -mx-2',
          'transition-colors duration-200'
        )}
        aria-expanded={isExpanded}
        aria-label="Toggle prediction details"
      >
        {/* Label and probabilities */}
        <div className="flex items-center justify-center gap-1.5 text-xs">
          <TrendingUp className="h-3 w-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-muted-foreground font-medium">Model:</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              !isCoinFlip && team1Favored
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {team1Name.length > 12 ? team1Name.substring(0, 10) + '…' : team1Name}{' '}
            {formatProbability(probA)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              !isCoinFlip && !team1Favored
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {team2Name.length > 12 ? team2Name.substring(0, 10) + '…' : team2Name}{' '}
            {formatProbability(probB)}
          </span>
        </div>

        {/* Expected outcome + confidence */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">{expectedText}</span>
          <ConfidenceBadge level={confidence} />
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable "Why" breakdown */}
      {isExpanded && (
        <div className="mt-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-md">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {formatBreakdown(breakdown)}
          </p>
          <p className="text-[10px] text-muted-foreground/70 text-center mt-1 italic">
            Heuristic model: 65% Career (Power, SOS, Win%) + 35% Current Season
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Confidence level badge component
 */
const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
  const colorClasses = {
    Low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    High: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <span
      className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded',
        colorClasses[level]
      )}
    >
      {level}
    </span>
  );
};

export default MatchPrediction;
