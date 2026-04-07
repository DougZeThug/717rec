import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import type { ConfidenceLevel, PredictionResult } from '@/utils/predictions';
import { formatBreakdown, formatProbability } from '@/utils/predictions';

interface MatchPredictionProps {
  prediction: PredictionResult;
  team1Name: string;
  team2Name: string;
}

export const MatchPrediction: React.FC<MatchPredictionProps> = ({
  prediction,
  team1Name,
  team2Name,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { probA, probB, expectedText, confidence, breakdown } = prediction;

  const team1Pct = Math.round(probA * 100);
  const team2Pct = 100 - team1Pct;
  const isCoinFlip = Math.abs(probA - 0.5) < 0.03;

  return (
    <div className="mt-2 pt-2 border-t border-border/30">
      {/* Probability bar */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={cn(
            'text-[10px] font-bold tabular-nums w-8 text-right',
            !isCoinFlip && probA > probB
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground'
          )}
        >
          {team1Pct}%
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted/50 flex">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 transition-all duration-500 rounded-l-full"
            style={{ width: `${team1Pct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 transition-all duration-500 rounded-r-full"
            style={{ width: `${team2Pct}%` }}
          />
        </div>
        <span
          className={cn(
            'text-[10px] font-bold tabular-nums w-8',
            !isCoinFlip && probB > probA
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-muted-foreground'
          )}
        >
          {team2Pct}%
        </span>
      </div>

      {/* Favored text + confidence + expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 py-0.5 hover:bg-muted/30 rounded transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle prediction details"
      >
        <span className="text-[10px] text-muted-foreground">{expectedText}</span>
        <ConfidenceBadge level={confidence} />
        {isExpanded ? (
          <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable breakdown */}
      {isExpanded && (
        <div className="mt-1.5 px-2 py-1.5 bg-muted/30 rounded-lg">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {formatBreakdown(breakdown)}
          </p>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-1 italic">
            Heuristic model: 65% Career + 25% Season + 10% Head-to-Head
          </p>
        </div>
      )}
    </div>
  );
};

const ConfidenceBadge: React.FC<{ level: ConfidenceLevel }> = ({ level }) => {
  const colorClasses = {
    Low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    High: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <span
      className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', colorClasses[level])}
    >
      {level}
    </span>
  );
};

export default MatchPrediction;
