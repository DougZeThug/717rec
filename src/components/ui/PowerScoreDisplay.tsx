import React from 'react';

import { cn } from '@/lib/utils';
import {
  formatPowerScore,
  getPowerScoreBackgroundColor,
  getPowerScoreColor,
} from '@/utils/colors/powerScoreColors';
import { normalizePowerScore, type PowerScoreSource } from '@/utils/powerScore/normalizePowerScore';

import { PowerScoreGauge } from './power-score-gauge';

export interface PowerScoreDisplayProps {
  /** The raw power score value from the data source */
  score: number | null | undefined;
  /** The data source - determines how the score is scaled */
  source: PowerScoreSource;
  /** Display mode: gauge (circular), text (formatted number), badge (pill), compact (minimal) */
  display?: 'gauge' | 'text' | 'badge' | 'compact';
  /** Size variant for gauge display */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show "PWR" label (gauge mode only) */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardized Power Score Display Component
 *
 * Automatically handles scaling based on the data source to prevent
 * scaling bugs. Use this wrapper instead of directly using PowerScoreGauge
 * or manual formatting.
 *
 * @example
 * // From v_team_details view (0-100 scale)
 * <PowerScoreDisplay score={team.power_score} source="v_team_details" display="gauge" />
 *
 * @example
 * // From team_season_stats table (0-1 scale)
 * <PowerScoreDisplay score={seasonStats.power_score} source="team_season_stats" display="text" />
 *
 * @example
 * // From career calculations (0-100 scale)
 * <PowerScoreDisplay score={careerPowerScore} source="calculated" display="badge" />
 */
export const PowerScoreDisplay: React.FC<PowerScoreDisplayProps> = ({
  score,
  source,
  display = 'text',
  size = 'md',
  showLabel = true,
  className,
}) => {
  // Normalize to 0-100 scale
  const normalizedScore = normalizePowerScore(score, source);

  // Handle null/undefined
  if (normalizedScore === null) {
    if (display === 'gauge') {
      return <PowerScoreGauge score={0} size={size} showLabel={showLabel} className={className} />;
    }
    return <span className={cn('text-muted-foreground', className)}>N/A</span>;
  }

  switch (display) {
    case 'gauge':
      return (
        <PowerScoreGauge
          score={normalizedScore}
          size={size}
          showLabel={showLabel}
          className={className}
        />
      );

    case 'badge':
      return (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium',
            getPowerScoreBackgroundColor(normalizedScore),
            getPowerScoreColor(normalizedScore),
            className
          )}
        >
          {formatPowerScore(normalizedScore)}
        </span>
      );

    case 'compact':
      return (
        <span className={cn('font-mono text-sm', className)}>
          {formatPowerScore(normalizedScore)}
        </span>
      );

    case 'text':
    default:
      return (
        <span className={cn('font-semibold', getPowerScoreColor(normalizedScore), className)}>
          {formatPowerScore(normalizedScore)}
        </span>
      );
  }
};

export default PowerScoreDisplay;
