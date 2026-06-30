import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { WeeklyRecapData } from '@/services/WeeklyRecapService';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

import WeeklyRecapHeader from './WeeklyRecapHeader';
import MoversSection from './WeeklyRecapMoversSection';
import StreaksSection from './WeeklyRecapStreaksSection';
import UpsetsSection from './WeeklyRecapUpsetsSection';

interface WeeklyRecapCardProps {
  data: WeeklyRecapData;
  risers: WeeklyPowerScoreTrend[];
  faller?: WeeklyPowerScoreTrend;
}

const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({ data, risers, faller }) => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const hasUpsets = data.upsets.length > 0;
  const hasStreaks = data.hotStreaks.length > 0;
  const hasMovers = risers.length > 0 || Boolean(faller);
  if (!hasUpsets && !hasStreaks && !hasMovers) return null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        shouldApplyWinter
          ? 'winter-card-full'
          : 'border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-indigo-500/5'
      )}
      style={{ minHeight: '160px' }}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-50',
          shouldApplyWinter
            ? 'bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5'
            : 'bg-gradient-to-r from-violet-500/10 via-transparent to-indigo-500/10'
        )}
      />
      <CardContent className="relative p-3 md:p-6 space-y-3 md:space-y-5">
        <WeeklyRecapHeader weekNumber={data.weekNumber} winter={shouldApplyWinter} />
        <UpsetsSection upsets={data.upsets} winter={shouldApplyWinter} />
        {hasUpsets && (hasStreaks || hasMovers) && (
          <div className="hidden md:block border-t border-border/50" />
        )}
        <StreaksSection streaks={data.hotStreaks} winter={shouldApplyWinter} />
        {(hasUpsets || hasStreaks) && hasMovers && <div className="border-t border-border/50" />}
        <MoversSection risers={risers} faller={faller} winter={shouldApplyWinter} />
      </CardContent>
    </Card>
  );
};

export default WeeklyRecapCard;
