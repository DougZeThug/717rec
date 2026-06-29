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

interface MyNextMatchCardProps {
  match: Match;
  myTeam: TeamInfo;
  opponent: TeamInfo;
  weekNumber?: number | null;
  isPrevious?: boolean;
  showHeader?: boolean;
  headerText?: string;
}

// Conditional (winter vs default) class fragments. Selecting the whole object
// with one ternary keeps the component's branching low; base classes stay
// inline in the JSX via cn().
interface CardStyleFragments {
  cardBg: string;
  glowGradient: string;
  headerIcon: string;
  headerLabel: string;
  glowBg: string;
  myLogoRing: string;
  scoreColor: string;
  vsColor: string;
  opponentLogoRing: string;
  teamNames: string;
  dateIcon: string;
  dateText: string;
  chevronColor: string;
  ctaLink: string;
  weekBadgeClass: string;
}

const DEFAULT_CARD_STYLES: CardStyleFragments = {
  cardBg: 'border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5',
  glowGradient: 'bg-gradient-to-r from-primary/10 via-transparent to-accent/10',
  headerIcon: 'text-primary',
  headerLabel: 'text-primary',
  glowBg: 'bg-primary/20',
  myLogoRing: 'ring-2 ring-primary/20 group-hover:ring-primary/40',
  scoreColor: 'text-foreground',
  vsColor: 'text-muted-foreground',
  opponentLogoRing: 'ring-2 ring-muted/30 group-hover:ring-muted/50',
  teamNames: 'text-foreground group-hover:text-primary',
  dateIcon: 'text-muted-foreground',
  dateText: 'text-muted-foreground',
  chevronColor: 'text-muted-foreground/50 group-hover:text-primary',
  ctaLink: 'text-primary/70 hover:text-primary',
  weekBadgeClass: 'text-xs border-muted-foreground/30',
};

const WINTER_CARD_STYLES: CardStyleFragments = {
  cardBg: 'my-next-match-card winter-card-full',
  glowGradient: 'bg-gradient-to-r from-cyan-500/5 via-transparent to-primary/5',
  headerIcon: 'text-cyan-400 animate-pulse',
  headerLabel: 'text-cyan-300',
  glowBg: 'bg-cyan-400/20',
  myLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  scoreColor: 'text-cyan-200',
  vsColor: 'text-cyan-300/70',
  opponentLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  teamNames: 'text-cyan-50 group-hover:text-cyan-300',
  dateIcon: 'text-cyan-400/70',
  dateText: 'text-cyan-200/70',
  chevronColor: 'text-cyan-400/50 group-hover:text-cyan-400',
  ctaLink: 'text-cyan-400/70 hover:text-cyan-300',
  weekBadgeClass: 'text-xs',
};

// Human-readable date/time parts for a match, or sensible fallbacks.
const matchDateParts = (dateStr: string | undefined) => {
  const matchDate = dateStr ? parseISO(dateStr) : null;
  const isValidDate = matchDate && isValid(matchDate);
  return {
    formattedDate: isValidDate ? format(matchDate, 'EEEE, MMM d') : 'Date TBD',
    formattedTime: isValidDate ? format(matchDate, 'h:mm a') : null,
  };
};

// Game-win tallies for "my" team vs the opponent, plus win/loss flags for
// completed (previous) matches.
const matchOutcome = (match: Match, myTeamId: string, isPrevious: boolean) => {
  const isTeam1 = match.team1Id === myTeamId;
  const myTeamWins = (isTeam1 ? match.team1_game_wins : match.team2_game_wins) ?? 0;
  const opponentWins = (isTeam1 ? match.team2_game_wins : match.team1_game_wins) ?? 0;
  return {
    myTeamWins,
    opponentWins,
    didWin: isPrevious && myTeamWins > opponentWins,
    didLose: isPrevious && myTeamWins < opponentWins,
  };
};

const MyNextMatchCard: React.FC<MyNextMatchCardProps> = ({
  match,
  myTeam,
  opponent,
  weekNumber,
  isPrevious = false,
  showHeader = true,
  headerText,
}) => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const w = shouldApplyWinter ? WINTER_CARD_STYLES : DEFAULT_CARD_STYLES;

  // Format date and time
  const { formattedDate, formattedTime } = matchDateParts(match.date);

  // Determine if user's team won (for completed matches)
  const { myTeamWins, opponentWins, didWin, didLose } = matchOutcome(match, myTeam.id, isPrevious);

  // Default header text based on isPrevious
  const displayHeaderText = headerText || (isPrevious ? 'Your Last Match' : 'Your Next Match');

  return (
    <Card
      className={cn('relative overflow-hidden', w.cardBg, isPrevious && 'opacity-90')}
    >
      {/* Subtle glow effect */}
      <div className={cn('absolute inset-0 opacity-50', w.glowGradient)} />

      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SeasonalIcon
                defaultIcon={isPrevious ? Trophy : Calendar}
                winterIcon={SnowflakeSparkle}
                size={16}
                className={w.headerIcon}
              />
              <span
                className={cn('text-xs font-semibold uppercase tracking-wider', w.headerLabel)}
              >
                {displayHeaderText}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {didWin && (
                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                  Win
                </Badge>
              )}
              {didLose && (
                <Badge variant="destructive" className="text-xs">
                  Loss
                </Badge>
              )}
              {weekNumber && (
                <Badge
                  variant={shouldApplyWinter ? 'winter' : 'outline'}
                  className={w.weekBadgeClass}
                >
                  {shouldApplyWinter && <SnowflakeSparkle size={12} className="mr-1" />}
                  Week {weekNumber}
                </Badge>
              )}
            </div>
          </div>
        )}

        <Link to="/schedule" className="group block">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Team Logos - VS Layout */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* My Team Logo */}
              <div className="relative">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                    w.glowBg
                  )}
                />
                <TeamLogo
                  imageUrl={myTeam.logoUrl}
                  teamName={myTeam.name}
                  size="md"
                  rounded
                  className={cn(
                    'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
                    w.myLogoRing
                  )}
                />
              </div>

              {/* VS or Score */}
              {isPrevious ? (
                <span className={cn('text-sm font-bold tabular-nums', w.scoreColor)}>
                  {myTeamWins} - {opponentWins}
                </span>
              ) : (
                <span className={cn('text-xs font-bold uppercase', w.vsColor)}>vs</span>
              )}

              {/* Opponent Logo */}
              <div className="relative">
                <TeamLogo
                  imageUrl={opponent.logoUrl}
                  teamName={opponent.name}
                  size="md"
                  rounded
                  className={cn(
                    'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
                    w.opponentLogoRing
                  )}
                />
              </div>
            </div>

            {/* Team Names & Details */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(typeScale.body, 'font-semibold transition-colors truncate', w.teamNames)}>
                <span className="font-bold">{myTeam.name}</span>
                <span className="text-muted-foreground mx-2">vs</span>
                <span>{opponent.name}</span>
              </h3>

              {/* Date & Time */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className={cn('size-3.5', w.dateIcon)} />
                  <span className={cn(typeScale.caption, w.dateText)}>{formattedDate}</span>
                </div>
                {formattedTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className={cn('size-3.5', w.dateIcon)} />
                    <span className={cn(typeScale.caption, w.dateText)}>{formattedTime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight
              className={cn(
                'size-5 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0',
                w.chevronColor
              )}
            />
          </div>
        </Link>

        {/* CTA Link - only show on first card */}
        {showHeader && (
          <div className="mt-4 text-center">
            <Link
              to="/schedule"
              className={cn(
                'text-xs font-medium transition-colors inline-flex items-center gap-1',
                w.ctaLink
              )}
            >
              See full schedule
              <ChevronRight className="size-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyNextMatchCard;
