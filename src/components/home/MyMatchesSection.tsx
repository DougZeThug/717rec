import { format, isValid, parseISO } from 'date-fns';
import { Calendar, ChevronRight, Clock, Trophy } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';
import { typeScale } from '@/styles/design-system';
import { Match } from '@/types';

interface TeamInfo {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface MatchWithOpponent {
  match: Match;
  opponent: TeamInfo;
  weekNumber: number | null;
}

interface MyMatchesSectionProps {
  matches: MatchWithOpponent[];
  myTeam: TeamInfo;
  isPreviousMatches: boolean;
}

interface MatchRowProps {
  matchInfo: MatchWithOpponent;
  myTeam: TeamInfo;
  isPrevious: boolean;
  shouldApplyWinter: boolean;
}

const MatchRow: React.FC<MatchRowProps> = ({
  matchInfo,
  myTeam,
  isPrevious,
  shouldApplyWinter,
}) => {
  const { match, opponent, weekNumber } = matchInfo;

  // Format date and time
  const matchDate = match.date ? parseISO(match.date) : null;
  const isValidDate = matchDate && isValid(matchDate);
  const formattedDate = isValidDate ? format(matchDate, 'EEEE, MMM d') : 'Date TBD';
  const formattedTime = isValidDate ? format(matchDate, 'h:mm a') : null;

  // Determine if user's team won (for completed matches)
  const isTeam1 = match.team1Id === myTeam.id;
  const myTeamWins = isTeam1 ? match.team1_game_wins : match.team2_game_wins;
  const opponentWins = isTeam1 ? match.team2_game_wins : match.team1_game_wins;
  const didWin = isPrevious && myTeamWins !== null && opponentWins !== null && myTeamWins > opponentWins;
  const didLose = isPrevious && myTeamWins !== null && opponentWins !== null && myTeamWins < opponentWins;

  return (
    <Link to="/schedule" className="group block">
      <div className="flex items-center justify-between py-3 gap-2">
        {/* Teams with logos stacked above names */}
        <div className="flex items-center justify-center gap-3 flex-1">
          {/* My Team - Logo + Name stacked */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div className="relative">
              <div
                className={cn(
                  'absolute inset-0 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  shouldApplyWinter ? 'bg-cyan-400/20' : 'bg-primary/20'
                )}
              />
              <TeamLogo
                imageUrl={myTeam.logoUrl}
                teamName={myTeam.name}
                size="md"
                rounded
                className={cn(
                  'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
                  shouldApplyWinter
                    ? 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50'
                    : 'ring-2 ring-primary/20 group-hover:ring-primary/40'
                )}
              />
            </div>
            <span
              className={cn(
                'text-xs font-medium text-center truncate max-w-[80px]',
                shouldApplyWinter ? 'text-cyan-100' : 'text-foreground'
              )}
            >
              {myTeam.name}
            </span>
          </div>

          {/* VS or Score - Center */}
          <div className="flex flex-col items-center gap-1">
            {isPrevious && myTeamWins !== null && opponentWins !== null ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    myTeamWins > opponentWins
                      ? 'text-green-500'
                      : myTeamWins < opponentWins
                        ? 'text-red-500'
                        : shouldApplyWinter
                          ? 'text-cyan-200'
                          : 'text-foreground'
                  )}
                >
                  {myTeamWins}
                </span>
                <span
                  className={cn(
                    'text-lg font-bold',
                    shouldApplyWinter ? 'text-cyan-300/50' : 'text-muted-foreground'
                  )}
                >
                  -
                </span>
                <span
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    opponentWins > myTeamWins
                      ? 'text-green-500'
                      : opponentWins < myTeamWins
                        ? 'text-red-500'
                        : shouldApplyWinter
                          ? 'text-cyan-200'
                          : 'text-foreground'
                  )}
                >
                  {opponentWins}
                </span>
              </div>
            ) : (
              <span
                className={cn(
                  'text-sm font-bold uppercase',
                  shouldApplyWinter ? 'text-cyan-300/70' : 'text-muted-foreground'
                )}
              >
                vs
              </span>
            )}
            {/* Win/Loss Badge */}
            {isPrevious && didWin && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 bg-green-600 hover:bg-green-600">
                Win
              </Badge>
            )}
            {isPrevious && didLose && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                Loss
              </Badge>
            )}
          </div>

          {/* Opponent - Logo + Name stacked */}
          <div className="flex flex-col items-center gap-1 min-w-0">
            <div className="relative">
              <TeamLogo
                imageUrl={opponent.logoUrl}
                teamName={opponent.name}
                size="md"
                rounded
                className={cn(
                  'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
                  shouldApplyWinter
                    ? 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50'
                    : 'ring-2 ring-muted/30 group-hover:ring-muted/50'
                )}
              />
            </div>
            <span
              className={cn(
                'text-xs font-medium text-center truncate max-w-[80px]',
                shouldApplyWinter ? 'text-cyan-100' : 'text-foreground'
              )}
            >
              {opponent.name}
            </span>
          </div>
        </div>

        {/* Date/Time & Arrow - Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <Calendar
                className={cn(
                  'h-3 w-3',
                  shouldApplyWinter ? 'text-cyan-400/70' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  shouldApplyWinter ? 'text-cyan-200/70' : 'text-muted-foreground'
                )}
              >
                {formattedDate}
              </span>
            </div>
            {formattedTime && (
              <div className="flex items-center gap-1">
                <Clock
                  className={cn(
                    'h-3 w-3',
                    shouldApplyWinter ? 'text-cyan-400/70' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    shouldApplyWinter ? 'text-cyan-200/70' : 'text-muted-foreground'
                  )}
                >
                  {formattedTime}
                </span>
              </div>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-5 w-5 group-hover:translate-x-1 transition-all duration-200',
              shouldApplyWinter
                ? 'text-cyan-400/50 group-hover:text-cyan-400'
                : 'text-muted-foreground/50 group-hover:text-primary'
            )}
          />
        </div>
      </div>
    </Link>
  );
};

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
        {/* Header */}
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

        {/* CTA Link */}
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
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyMatchesSection;
