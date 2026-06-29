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

// Conditional (winter vs default) class fragments for a match row. Selecting the
// whole object with a single ternary keeps MatchRow's branching low; the base
// classes stay inline in the JSX via cn().
interface RowStyleFragments {
  iconColor: string;
  dateColor: string;
  bulletColor: string;
  glowBg: string;
  myLogoRing: string;
  teamNameColor: string;
  scoreNeutral: string;
  scoreDashColor: string;
  vsColor: string;
  opponentLogoRing: string;
  chevronColor: string;
}

const DEFAULT_ROW_STYLES: RowStyleFragments = {
  iconColor: 'text-muted-foreground',
  dateColor: 'text-muted-foreground',
  bulletColor: 'text-muted-foreground/50',
  glowBg: 'bg-primary/20',
  myLogoRing: 'ring-2 ring-primary/20 group-hover:ring-primary/40',
  teamNameColor: 'text-foreground',
  scoreNeutral: 'text-foreground',
  scoreDashColor: 'text-muted-foreground',
  vsColor: 'text-muted-foreground',
  opponentLogoRing: 'ring-2 ring-muted/30 group-hover:ring-muted/50',
  chevronColor: 'text-muted-foreground/50 group-hover:text-primary',
};

const WINTER_ROW_STYLES: RowStyleFragments = {
  iconColor: 'text-cyan-400/70',
  dateColor: 'text-cyan-200/70',
  bulletColor: 'text-cyan-300/30',
  glowBg: 'bg-cyan-400/20',
  myLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  teamNameColor: 'text-cyan-100',
  scoreNeutral: 'text-cyan-200',
  scoreDashColor: 'text-cyan-300/50',
  vsColor: 'text-cyan-300/70',
  opponentLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  chevronColor: 'text-cyan-400/50 group-hover:text-cyan-400',
};

// Color for one side's score: green if winning, red if losing, neutral if tied.
const scoreColor = (self: number, other: number, neutral: string): string =>
  self > other ? 'text-green-500' : self < other ? 'text-red-500' : neutral;

// Human-readable date/time parts for a match, or sensible fallbacks.
const matchDateParts = (dateStr: string | undefined) => {
  const matchDate = dateStr ? parseISO(dateStr) : null;
  const isValidDate = matchDate && isValid(matchDate);
  return {
    formattedDate: isValidDate ? format(matchDate, 'EEEE, MMM d') : 'Date TBD',
    formattedTime: isValidDate ? format(matchDate, 'h:mm a') : null,
  };
};

const MatchRow: React.FC<MatchRowProps> = ({
  matchInfo,
  myTeam,
  isPrevious,
  shouldApplyWinter,
}) => {
  const { match, opponent } = matchInfo;
  const s = shouldApplyWinter ? WINTER_ROW_STYLES : DEFAULT_ROW_STYLES;

  // Format date and time
  const { formattedDate, formattedTime } = matchDateParts(match.date);

  // Determine if user's team won (for completed matches)
  const isTeam1 = match.team1Id === myTeam.id;
  const myTeamWins = (isTeam1 ? match.team1_game_wins : match.team2_game_wins) ?? 0;
  const opponentWins = (isTeam1 ? match.team2_game_wins : match.team1_game_wins) ?? 0;
  const didWin = isPrevious && myTeamWins > opponentWins;
  const didLose = isPrevious && myTeamWins < opponentWins;

  return (
    <Link to="/schedule" className="group block">
      <div className="py-3">
        {/* Date/Time - Above match on mobile, hidden on desktop */}
        <div className="flex items-center justify-center gap-3 mb-2 md:hidden">
          <div className="flex items-center gap-1">
            <Calendar className={cn('size-3', s.iconColor)} />
            <span className={cn('text-xs', s.dateColor)}>{formattedDate}</span>
          </div>
          {formattedTime && (
            <>
              <span className={cn('text-xs', s.bulletColor)}>•</span>
              <div className="flex items-center gap-1">
                <Clock className={cn('size-3', s.iconColor)} />
                <span className={cn('text-xs', s.dateColor)}>{formattedTime}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Teams with logos stacked above names */}
          <div className="flex items-center justify-center gap-3 flex-1">
            {/* My Team - Logo + Name stacked */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className="relative">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    s.glowBg
                  )}
                />
                <TeamLogo
                  imageUrl={myTeam.logoUrl}
                  teamName={myTeam.name}
                  size="md"
                  rounded
                  className={cn(
                    'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
                    s.myLogoRing
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center truncate max-w-[80px]',
                  s.teamNameColor
                )}
              >
                {myTeam.name}
              </span>
            </div>

            {/* VS or Score - Center */}
            <div className="flex flex-col items-center gap-1">
              {isPrevious ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      scoreColor(myTeamWins, opponentWins, s.scoreNeutral)
                    )}
                  >
                    {myTeamWins}
                  </span>
                  <span className={cn('text-lg font-bold', s.scoreDashColor)}>-</span>
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      scoreColor(opponentWins, myTeamWins, s.scoreNeutral)
                    )}
                  >
                    {opponentWins}
                  </span>
                </div>
              ) : (
                <span className={cn('text-sm font-bold uppercase', s.vsColor)}>vs</span>
              )}
              {/* Win/Loss Badge */}
              {didWin && (
                <Badge
                  variant="default"
                  className="text-[10px] px-1.5 py-0 h-5 bg-green-600 hover:bg-green-600"
                >
                  Win
                </Badge>
              )}
              {didLose && (
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
                    s.opponentLogoRing
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center truncate max-w-[80px]',
                  s.teamNameColor
                )}
              >
                {opponent.name}
              </span>
            </div>
          </div>

          {/* Date/Time & Arrow - Right side (desktop only) */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <Calendar className={cn('size-3', s.iconColor)} />
                <span className={cn('text-xs', s.dateColor)}>{formattedDate}</span>
              </div>
              {formattedTime && (
                <div className="flex items-center gap-1">
                  <Clock className={cn('size-3', s.iconColor)} />
                  <span className={cn('text-xs', s.dateColor)}>{formattedTime}</span>
                </div>
              )}
            </div>
            <ChevronRight
              className={cn(
                'size-5 group-hover:translate-x-1 transition-all duration-200',
                s.chevronColor
              )}
            />
          </div>

          {/* Arrow only on mobile */}
          <ChevronRight
            className={cn(
              'size-5 group-hover:translate-x-1 transition-all duration-200 md:hidden flex-shrink-0',
              s.chevronColor
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
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(MyMatchesSection);
