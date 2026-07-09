import { Calendar, ChevronRight, Clock, Radio } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { useCanScoreMatch } from '@/hooks/live-scoring/useCanScoreMatch';
import { cn } from '@/lib/utils';

import {
  DEFAULT_ROW_STYLES,
  matchDateParts,
  RowStyleFragments,
  scoreColor,
  WINTER_ROW_STYLES,
} from './matchRowStyles';
import { MatchWithOpponent, TeamInfo } from './myMatchesTypes';

interface MatchRowProps {
  matchInfo: MatchWithOpponent;
  myTeam: TeamInfo;
  isPrevious: boolean;
  shouldApplyWinter: boolean;
}

// A team's logo (with optional hover glow) above its name.
const TeamColumn = ({
  team,
  ringClass,
  nameClass,
  glowClass,
}: {
  team: TeamInfo;
  ringClass: string;
  nameClass: string;
  glowClass?: string;
}) => (
  <div className="flex flex-col items-center gap-1 min-w-0">
    <div className="relative">
      {glowClass && (
        <div
          className={cn(
            'absolute inset-0 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            glowClass
          )}
        />
      )}
      <TeamLogo
        imageUrl={team.logoUrl}
        teamName={team.name}
        size="md"
        rounded
        className={cn(
          'relative z-10 transition-all duration-300 !w-12 !h-12 !min-w-12 !min-h-12',
          ringClass
        )}
      />
    </div>
    <span className={cn('text-xs font-medium text-center truncate max-w-[80px]', nameClass)}>
      {team.name}
    </span>
  </div>
);

// Center column: score (for completed matches) or "vs", plus a Win/Loss badge.
const ScoreColumn = ({
  isPrevious,
  myTeamWins,
  opponentWins,
  didWin,
  didLose,
  styles,
}: {
  isPrevious: boolean;
  myTeamWins: number;
  opponentWins: number;
  didWin: boolean;
  didLose: boolean;
  styles: RowStyleFragments;
}) => (
  <div className="flex flex-col items-center gap-1">
    {isPrevious ? (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-lg font-bold tabular-nums',
            scoreColor(myTeamWins, opponentWins, styles.scoreNeutral)
          )}
        >
          {myTeamWins}
        </span>
        <span className={cn('text-lg font-bold', styles.scoreDashColor)}>-</span>
        <span
          className={cn(
            'text-lg font-bold tabular-nums',
            scoreColor(opponentWins, myTeamWins, styles.scoreNeutral)
          )}
        >
          {opponentWins}
        </span>
      </div>
    ) : (
      <span className={cn('text-sm font-bold uppercase', styles.vsColor)}>vs</span>
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
);

// The three-column teams row: my team, score/vs, opponent.
const MatchTeamsRow = ({
  myTeam,
  opponent,
  isPrevious,
  myTeamWins,
  opponentWins,
  didWin,
  didLose,
  styles,
}: {
  myTeam: TeamInfo;
  opponent: TeamInfo;
  isPrevious: boolean;
  myTeamWins: number;
  opponentWins: number;
  didWin: boolean;
  didLose: boolean;
  styles: RowStyleFragments;
}) => (
  <div className="flex items-center justify-center gap-3 flex-1">
    <TeamColumn
      team={myTeam}
      ringClass={styles.myLogoRing}
      nameClass={styles.teamNameColor}
      glowClass={styles.glowBg}
    />
    <ScoreColumn
      isPrevious={isPrevious}
      myTeamWins={myTeamWins}
      opponentWins={opponentWins}
      didWin={didWin}
      didLose={didLose}
      styles={styles}
    />
    <TeamColumn
      team={opponent}
      ringClass={styles.opponentLogoRing}
      nameClass={styles.teamNameColor}
    />
  </div>
);

// Mobile-only date/time row (shown above the match, hidden on desktop).
const MobileDateTime = ({
  formattedDate,
  formattedTime,
  styles,
}: {
  formattedDate: string;
  formattedTime: string | null;
  styles: RowStyleFragments;
}) => (
  <div className="flex items-center justify-center gap-3 mb-2 md:hidden">
    <div className="flex items-center gap-1">
      <Calendar className={cn('size-3', styles.iconColor)} />
      <span className={cn('text-xs', styles.dateColor)}>{formattedDate}</span>
    </div>
    {formattedTime && (
      <>
        <span className={cn('text-xs', styles.bulletColor)}>•</span>
        <div className="flex items-center gap-1">
          <Clock className={cn('size-3', styles.iconColor)} />
          <span className={cn('text-xs', styles.dateColor)}>{formattedTime}</span>
        </div>
      </>
    )}
  </div>
);

// Desktop-only date/time stack plus the row arrow.
const DesktopDateTime = ({
  formattedDate,
  formattedTime,
  styles,
}: {
  formattedDate: string;
  formattedTime: string | null;
  styles: RowStyleFragments;
}) => (
  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <Calendar className={cn('size-3', styles.iconColor)} />
        <span className={cn('text-xs', styles.dateColor)}>{formattedDate}</span>
      </div>
      {formattedTime && (
        <div className="flex items-center gap-1">
          <Clock className={cn('size-3', styles.iconColor)} />
          <span className={cn('text-xs', styles.dateColor)}>{formattedTime}</span>
        </div>
      )}
    </div>
    <ChevronRight
      className={cn(
        'size-5 group-hover:translate-x-1 transition-all duration-200',
        styles.chevronColor
      )}
    />
  </div>
);

export const MatchRow: React.FC<MatchRowProps> = ({
  matchInfo,
  myTeam,
  isPrevious,
  shouldApplyWinter,
}) => {
  const { match, opponent } = matchInfo;
  const rowStyles = shouldApplyWinter ? WINTER_ROW_STYLES : DEFAULT_ROW_STYLES;

  const { canScore } = useCanScoreMatch({
    team1_id: match.team1Id ?? null,
    team2_id: match.team2Id ?? null,
    iscompleted: isPrevious,
  });

  // Format date and time
  const { formattedDate, formattedTime } = matchDateParts(match.date);

  // Determine if user's team won (for completed matches)
  const isTeam1 = match.team1Id === myTeam.id;
  const myTeamWins = (isTeam1 ? match.team1_game_wins : match.team2_game_wins) ?? 0;
  const opponentWins = (isTeam1 ? match.team2_game_wins : match.team1_game_wins) ?? 0;
  const didWin = isPrevious && myTeamWins > opponentWins;
  const didLose = isPrevious && myTeamWins < opponentWins;

  const row = (
    <Link to="/schedule" className="group block">
      <div className="py-3">
        <MobileDateTime
          formattedDate={formattedDate}
          formattedTime={formattedTime}
          styles={rowStyles}
        />

        <div className="flex items-center justify-between gap-2">
          <MatchTeamsRow
            myTeam={myTeam}
            opponent={opponent}
            isPrevious={isPrevious}
            myTeamWins={myTeamWins}
            opponentWins={opponentWins}
            didWin={didWin}
            didLose={didLose}
            styles={rowStyles}
          />

          <DesktopDateTime
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            styles={rowStyles}
          />

          {/* Arrow only on mobile */}
          <ChevronRight
            className={cn(
              'size-5 group-hover:translate-x-1 transition-all duration-200 md:hidden flex-shrink-0',
              rowStyles.chevronColor
            )}
          />
        </div>
      </div>
    </Link>
  );

  return (
    <div>
      {row}
      {!isPrevious && canScore && (
        <Link
          to={`/matches/${match.id}/live`}
          className="mb-2 flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          aria-label={`Score ${myTeam.name} vs ${opponent.name} live`}
        >
          <Radio className="size-4" aria-hidden />
          Score live
        </Link>
      )}
    </div>
  );
};
