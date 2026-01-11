import { ArrowLeft, Trophy } from 'lucide-react';
import React, { lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import AnimatedBreadcrumbs from '@/components/navigation/AnimatedBreadcrumbs';
import HeadToHeadRecords from '@/components/stats/HeadToHeadRecords';
import MatchList from '@/components/teams/MatchList';
import PlayerList from '@/components/teams/PlayerList';
import StatBreakdown from '@/components/teams/StatBreakdown';
import TeamAdvancedStatsSection from '@/components/teams/TeamAdvancedStatsSection';
import TeamAnalysis from '@/components/teams/TeamAnalysis';
import TeamDetailsStickyNav from '@/components/teams/TeamDetailsStickyNav';
import TeamHeader from '@/components/teams/TeamHeader';
import TeamTotals from '@/components/teams/TeamTotals';

// Lazy load chart component to reduce initial bundle size
const TeamCareerPowerScoreChart = lazy(() => import('@/components/teams/TeamCareerPowerScoreChart'));
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamDetails } from '@/hooks/useTeamDetails';
import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamRankings } from '@/hooks/useTeamRankings';
import { teamLog } from '@/utils/logger';
import { calculateSweepRate } from '@/utils/teamDetailsUtils/sweepRateUtils';

const TeamDetails = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const { team, isLoading } = useTeamDetails(teamId);
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { rankings } = useTeamRankings();

  const teamRanking = rankings?.find((r) => r.teamId === teamId);
  const teamRank = teamRanking ? rankings.findIndex((r) => r.teamId === teamId) + 1 : undefined;
  const totalTeams = rankings?.length;

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

  if (isLoading || isLoadingMatches) {
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
        <p className="mb-4">The team you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/teams')}>Back to Teams</Button>
      </div>
    );
  }

  const winPct = team.win_percentage ? team.win_percentage * 100 : 0;
  const gamePct = team.game_win_percentage ? team.game_win_percentage * 100 : 0;
  const sweepStats = calculateSweepRate(teamId || '', pastMatches);

  // Custom breadcrumbs with team name
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Teams', href: '/teams' },
    { label: team.name },
  ];

  return (
    <>
      <TeamDetailsStickyNav />
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-4">
        {/* Breadcrumbs - hidden on mobile */}
        <div className="hidden md:block">
          <AnimatedBreadcrumbs items={breadcrumbs} className="mb-4" />
        </div>

        <Button
          variant="ghost"
          className="mb-2 md:mb-4 min-h-11 px-3 md:h-10 md:px-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} className="mr-1 md:mr-2" /> Back
        </Button>

        {/* Hero Section - Tighter on mobile */}
        <TeamHeader team={team} winPercentage={winPct.toFixed(1)} pastMatches={pastMatches} />

        {/* 1. Team Stats */}
        <section id="stats" className="scroll-mt-20">
          <StatBreakdown
            wins={team.wins}
            losses={team.losses}
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
          />

          {/* 2. Players */}
          <div className="mt-4">
            <PlayerList players={team.players || []} />
          </div>
        </section>

        {/* Team Analysis */}
        <section id="analysis" className="scroll-mt-20">
          {teamId && <TeamAnalysis teamId={teamId} teamName={team.name} />}
        </section>

        {/* 3. Head-to-Head Records */}
        <section id="h2h" className="scroll-mt-20">
          {teamId && <HeadToHeadRecords teamId={teamId} teamName={team.name} />}
        </section>

        {/* 4. Match History */}
        <section id="matches" className="scroll-mt-20">
          <MatchList
            title="Match History"
            matches={pastMatches}
            isLoading={isLoadingMatches}
            teamId={teamId || ''}
            isPast={true}
            highlightWinnerLoser={true}
            collapsible={true}
            defaultOpen={false}
          />
        </section>

        {/* 5. Career Stats */}
        <section id="career" className="scroll-mt-20">
          {teamId && <TeamTotals teamId={teamId} />}

          {/* 6. Advanced Stats - Season-by-Season Breakdown */}
          {teamId && <TeamAdvancedStatsSection teamId={teamId} />}

          {/* Career Power Score Trend */}
          {teamId && (
            <Suspense fallback={<Skeleton className="h-[300px] w-full mt-4" />}>
              <TeamCareerPowerScoreChart teamId={teamId} />
            </Suspense>
          )}
        </section>

        {/* 7. Team Achievements */}
        <section id="achievements" className="scroll-mt-20">
          {teamId && (
            <CollapsibleSection
              title="Team Achievements"
              icon={Trophy}
              iconColor="text-amber-500"
              defaultOpen={false}
            >
              <TeamBadgeCollection
                teamId={teamId}
                size="lg"
                maxDisplay={12}
                orientation="horizontal"
                className="gap-3"
                showEmptyState={true}
              />
            </CollapsibleSection>
          )}
        </section>
      </div>
    </>
  );
};

export default TeamDetails;
