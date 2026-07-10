import { ArrowLeft, BarChart3, GraduationCap, Swords, TrendingUp, Trophy } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import AnimatedBreadcrumbs from '@/components/navigation/AnimatedBreadcrumbs';
import HeadToHeadRecords from '@/components/stats/HeadToHeadRecords';
import MatchList from '@/components/teams/MatchList';
import PlayerList from '@/components/teams/PlayerList';
import RivalryHighlights from '@/components/teams/RivalryHighlights';
import StatBreakdown from '@/components/teams/StatBreakdown';
import TeamAdvancedStatsSection from '@/components/teams/TeamAdvancedStatsSection';
import TeamDetailsStickyNav from '@/components/teams/TeamDetailsStickyNav';
import TeamHeader from '@/components/teams/TeamHeader';
import TeamPerformanceCards from '@/components/teams/TeamPerformanceCards';
import TeamPlayerStatsSection from '@/components/teams/TeamPlayerStatsSection';
import TeamTotals from '@/components/teams/TeamTotals';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolveTeamSlug } from '@/hooks/useResolveTeamSlug';
import { useTeamDetails } from '@/hooks/useTeamDetails';
import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { teamLog } from '@/utils/logger';
import { calculateClutchRecord } from '@/utils/teamDetailsUtils/matchOutcomeUtils';
import { calculateSweepRate } from '@/utils/teamDetailsUtils/sweepRateUtils';

// Recharts-backed components — lazy-loaded so the recharts vendor chunk
// only downloads when the user opens these collapsible sections.
const TeamReportCard = lazy(() => import('@/components/teams/TeamReportCard'));
const TeamCareerPowerScoreChart = lazy(
  () => import('@/components/teams/TeamCareerPowerScoreChart')
);
const ChartFallback = () => <Skeleton className="h-48 w-full" />;

type TeamDetail = NonNullable<ReturnType<typeof useTeamDetails>['team']>;
type TeamRanking = NonNullable<ReturnType<typeof useTeamRankings>['rankings']>[number];
type SweepStats = ReturnType<typeof calculateSweepRate>;
type ClutchRecord = ReturnType<typeof calculateClutchRecord>;

// Derive this team's rank, ranking row, and the field size from the rankings list.
const getTeamRankInfo = (
  rankings: ReturnType<typeof useTeamRankings>['rankings'],
  teamId: string | undefined
): {
  teamRank: number | undefined;
  teamRanking: TeamRanking | undefined;
  totalTeams: number | undefined;
} => {
  const index = rankings?.findIndex((r) => r.teamId === teamId) ?? -1;
  return {
    teamRank: index >= 0 ? index + 1 : undefined,
    teamRanking: index >= 0 ? rankings?.[index] : undefined,
    totalTeams: rankings?.length,
  };
};

// Debug log of the current render's team data (no-op in production logger).
const logTeamRender = (team: TeamDetail | null | undefined) => {
  teamLog(
    'TeamDetails rendering with team data:',
    team
      ? {
          name: team.name,
          power_score: team.power_score,
          sos: team.sos,
          win_percentage: team.win_percentage || 0,
          game_win_percentage: team.game_win_percentage || 0,
        }
      : 'Loading team...'
  );
};

interface TeamStatsSectionProps {
  team: TeamDetail;
  teamId: string | undefined;
  winPct: number;
  gamePct: number;
  teamRank: number | undefined;
  totalTeams: number | undefined;
  teamRanking: TeamRanking | undefined;
  sweepStats: SweepStats;
  clutchRecord: ClutchRecord;
}

const TeamStatsSection = ({
  team,
  teamId,
  winPct,
  gamePct,
  teamRank,
  totalTeams,
  teamRanking,
  sweepStats,
  clutchRecord,
}: TeamStatsSectionProps) => (
  <section id="stats" className="scroll-mt-20" aria-labelledby="stats-heading">
    <CollapsibleSection
      title="Stats & Report Card"
      icon={BarChart3}
      iconColor="text-blue-500"
      defaultOpen={false}
      headingId="stats-heading"
      summaryValue={`${team.wins}-${team.losses}`}
    >
      <StatBreakdown
        wins={team.wins ?? 0}
        losses={team.losses ?? 0}
        winPercentage={winPct.toFixed(1)}
        gamesWon={team.game_wins || 0}
        gamesLost={team.game_losses || 0}
        gameWinPercentage={gamePct.toFixed(1)}
        strengthOfSchedule={team.sos?.toFixed(3) || '0.000'}
        closeMatchLosses={team.close_match_losses || 0}
        powerScore={team.power_score || 0}
        rank={teamRank}
        totalTeams={totalTeams}
        rankChange={teamRanking?.rankChange}
        sweeps={sweepStats.sweeps}
        sweepRate={sweepStats.sweepRate}
        clutchWins={clutchRecord.clutchWins}
        clutchWinPct={clutchRecord.clutchWinPct}
        clutchGame3s={clutchRecord.game3Matches}
      />
      {teamId && (
        <div className="mt-4">
          <TeamAdvancedStatsSection teamId={teamId} />
        </div>
      )}
      {teamId && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
            <GraduationCap size={16} className="text-violet-500" />
            Report Card
          </h3>
          <Suspense fallback={<ChartFallback />}>
            <TeamReportCard teamId={teamId} standalone />
          </Suspense>
        </div>
      )}
    </CollapsibleSection>
  </section>
);

interface TeamMatchupsSectionProps {
  teamId: string | undefined;
  teamName: string;
}

const TeamMatchupsSection = ({ teamId, teamName }: TeamMatchupsSectionProps) => (
  <section id="h2h" className="scroll-mt-20" aria-labelledby="h2h-heading">
    <CollapsibleSection
      title="Matchups & Rivalries"
      icon={Swords}
      iconColor="text-rose-500"
      defaultOpen={false}
      headingId="h2h-heading"
    >
      {teamId && <RivalryHighlights teamId={teamId} standalone />}
      {teamId && (
        <div className="mt-4">
          <HeadToHeadRecords teamId={teamId} teamName={teamName} standalone />
        </div>
      )}
    </CollapsibleSection>
  </section>
);

const TeamCareerSection = ({ teamId }: { teamId: string | undefined }) => (
  <section id="career" className="scroll-mt-20" aria-labelledby="career-heading">
    <CollapsibleSection
      title="Career & Achievements"
      icon={TrendingUp}
      iconColor="text-purple-500"
      defaultOpen={false}
      headingId="career-heading"
    >
      {teamId && <TeamTotals teamId={teamId} standalone />}
      {teamId && (
        <div className="mt-4">
          <Suspense fallback={<ChartFallback />}>
            <TeamCareerPowerScoreChart teamId={teamId} standalone />
          </Suspense>
        </div>
      )}
      {teamId && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
            <Trophy size={16} className="text-amber-500" />
            Achievements
          </h3>
          <TeamBadgeCollection
            teamId={teamId}
            size="lg"
            maxDisplay={12}
            orientation="horizontal"
            className="gap-3"
            showEmptyState
          />
        </div>
      )}
    </CollapsibleSection>
  </section>
);

const TeamDetails = () => {
  const { teamId: teamParam } = useParams<{ teamId: string }>();
  const { teamId, isResolving } = useResolveTeamSlug(teamParam);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; scrollPosition?: number } | undefined;

  const { team, isLoading } = useTeamDetails(teamId);
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { rankings } = useTeamRankings();

  const { teamRank, teamRanking, totalTeams } = getTeamRankInfo(rankings, teamId);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Teams', href: '/teams' },
      { label: team?.name || 'Loading...' },
    ],
    [team?.name]
  );

  logTeamRender(team);

  const handleBack = () => {
    if (locationState?.from) {
      navigate(locationState.from);
      if (locationState.scrollPosition !== undefined) {
        setTimeout(() => {
          window.scrollTo({
            top: locationState.scrollPosition,
            behavior: 'smooth',
          });
        }, 100);
      }
    } else {
      navigate(-1);
    }
  };

  if (isLoading || isLoadingMatches || isResolving) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg mb-8" />
        <Skeleton className="h-8 w-60 mb-2" />
        <Skeleton className="h-24 w-full rounded-lg mb-4" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
        <p className="mb-4">The team you&apos;re looking for doesn&apos;t exist.</p>
        <Button onClick={() => navigate('/teams')}>Back to Teams</Button>
      </div>
    );
  }

  const winPct = team.win_percentage ? team.win_percentage * 100 : 0;
  const gamePct = team.game_win_percentage ? team.game_win_percentage * 100 : 0;
  const sweepStats = calculateSweepRate(teamId || '', pastMatches);
  const clutchRecord = calculateClutchRecord(teamId || '', pastMatches);

  return (
    <>
      <TeamDetailsStickyNav />
      <div className="container mx-auto px-4 py-2 md:py-8 space-y-2 md:space-y-4">
        {/* Breadcrumbs - full version on desktop */}
        <div className="hidden md:block">
          <AnimatedBreadcrumbs items={breadcrumbs} className="mb-4" />
        </div>

        {/* Mobile back button only */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 px-3"
            onClick={handleBack}
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={16} className="mr-1" aria-hidden="true" />
            Back
          </Button>
        </div>

        {/* Desktop back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="hidden md:inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {/* Hero Section */}
        <TeamHeader team={team} winPercentage={winPct.toFixed(1)} pastMatches={pastMatches} />

        {/* 1. Performance Cards (always visible) */}
        <section id="performance" className="scroll-mt-20">
          <TeamPerformanceCards
            powerScore={team.power_score || 0}
            rank={teamRank}
            totalTeams={totalTeams}
            rankChange={teamRanking?.rankChange}
            wins={team.wins ?? 0}
            losses={team.losses ?? 0}
          />
        </section>

        {/* 2. Roster - default open */}
        <PlayerList players={team.players || []} />

        {/* 2b. Live-scoring player stats (renders only once data exists) */}
        <TeamPlayerStatsSection teamId={teamId} />

        {/* 3. Stats & Report Card - combined, default closed */}
        <TeamStatsSection
          team={team}
          teamId={teamId}
          winPct={winPct}
          gamePct={gamePct}
          teamRank={teamRank}
          totalTeams={totalTeams}
          teamRanking={teamRanking}
          sweepStats={sweepStats}
          clutchRecord={clutchRecord}
        />

        {/* 4. Matchups & Rivalries - combined, default closed */}
        <TeamMatchupsSection teamId={teamId} teamName={team.name} />

        {/* 5. Match History - default closed */}
        <section id="matches" className="scroll-mt-20" aria-labelledby="matches-heading">
          <MatchList
            title="Match History"
            matches={pastMatches}
            isLoading={isLoadingMatches}
            teamId={teamId || ''}
            isPast
            highlightWinnerLoser
            collapsible
            defaultOpen={false}
            headingId="matches-heading"
          />
        </section>

        {/* 6. Career & Achievements - combined, default closed */}
        <TeamCareerSection teamId={teamId} />
      </div>
    </>
  );
};

export default TeamDetails;
