import { Calendar, ChevronRight, Trophy } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';

import { MatchWithOpponent, TeamInfo } from './myMatchesTypes';
import { MatchRow } from './MyMatchRow';

interface MyMatchesSectionProps {
  matches: MatchWithOpponent[];
  myTeam: TeamInfo;
  isPreviousMatches: boolean;
}

// Section title row (icon + label).
const SectionHeader = ({
  headerText,
  isPreviousMatches,
  shouldApplyWinter,
}: {
  headerText: string;
  isPreviousMatches: boolean;
  shouldApplyWinter: boolean;
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <SeasonalIcon
        defaultIcon={isPreviousMatches ? Trophy : Calendar}
        winterIcon={SnowflakeSparkle}
        size={16}
        className={shouldApplyWinter ? 'text-cyan-400 animate-pulse' : 'text-primary'}
      />
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          shouldApplyWinter ? 'text-cyan-300' : 'text-primary'
        )}
      >
        {headerText}
      </span>
    </div>
  </div>
);

// "See full schedule" call-to-action link.
const ScheduleCtaLink = ({ shouldApplyWinter }: { shouldApplyWinter: boolean }) => (
  <div className="mt-3 text-center">
    <Link
      to="/schedule"
      className={cn(
        'text-xs font-medium transition-colors inline-flex items-center gap-1',
        shouldApplyWinter
          ? 'text-cyan-400/70 hover:text-cyan-300'
          : 'text-primary/70 hover:text-primary'
      )}
    >
      See full schedule
      <ChevronRight className="size-3" />
    </Link>
  </div>
);

const MyMatchesSection: React.FC<MyMatchesSectionProps> = ({
  matches,
  myTeam,
  isPreviousMatches,
}) => {
  const { shouldApplyWinter } = useSeasonalTheme();

  if (matches.length === 0) return null;

  // Determine header text based on count and type
  const headerText = isPreviousMatches
    ? matches.length > 1
      ? 'Your Last Matches'
      : 'Your Last Match'
    : matches.length > 1
      ? 'Your Next Matches'
      : 'Your Next Match';

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        shouldApplyWinter
          ? 'my-next-match-card winter-card-full'
          : 'border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5'
      )}
    >
      {/* Subtle glow effect */}
      <div
        className={cn(
          'absolute inset-0 opacity-50',
          shouldApplyWinter
            ? 'bg-gradient-to-r from-cyan-500/5 via-transparent to-primary/5'
            : 'bg-gradient-to-r from-primary/10 via-transparent to-accent/10'
        )}
      />

      <CardContent className="relative p-4 md:p-6">
        <SectionHeader
          headerText={headerText}
          isPreviousMatches={isPreviousMatches}
          shouldApplyWinter={shouldApplyWinter}
        />

        {/* Match rows */}
        <div className="divide-y divide-border/50">
          {matches.map((matchInfo) => (
            <MatchRow
              key={matchInfo.match.id}
              matchInfo={matchInfo}
              myTeam={myTeam}
              isPrevious={isPreviousMatches}
              shouldApplyWinter={shouldApplyWinter}
            />
          ))}
        </div>

        <ScheduleCtaLink shouldApplyWinter={shouldApplyWinter} />
      </CardContent>
    </Card>
  );
};

export default React.memo(MyMatchesSection);
