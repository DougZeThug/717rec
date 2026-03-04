import { ArrowLeft, Trophy } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import AnimatedBreadcrumbs from '@/components/navigation/AnimatedBreadcrumbs';
import HeadToHeadRecords from '@/components/stats/HeadToHeadRecords';
import RivalryHighlights from '@/components/teams/RivalryHighlights';
import MatchList from '@/components/teams/MatchList';
import PlayerList from '@/components/teams/PlayerList';
import StatBreakdown from '@/components/teams/StatBreakdown';
import TeamAdvancedStatsSection from '@/components/teams/TeamAdvancedStatsSection';
import TeamAnalysis from '@/components/teams/TeamAnalysis';
import TeamCareerPowerScoreChart from '@/components/teams/TeamCareerPowerScoreChart';
import TeamDetailsStickyNav from '@/components/teams/TeamDetailsStickyNav';
import TeamHeader from '@/components/teams/TeamHeader';
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

const TeamDetails = () => {
  const { teamId: teamParam } = useParams<{ teamId: string }>();
  const { teamId, isResolving } = useResolveTeamSlug(teamParam);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; scrollPosition?: number } | undefined;

  const { team, isLoading } = useTeamDetails(teamId);
  const { pastMatches, isLoadingMatches } = useTeamMatches(teamId);
  const { rankings } = useTeamRankings();

  const teamRanking = rankings?.find((r) => r.teamId === teamId);
  const teamRank = teamRanking ? rankings.findIndex((r) => r.teamId === teamId) + 1 : undefined;
  const totalTeams = rankings?.length;

  // Custom breadcrumbs with team name (must be before early returns to maintain hook order)
  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Teams', href: '/teams' },
      { label: team?.name || 'Loading...' },
    ],
    [team?.name]
  );

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

  // Handle back navigation with scroll restoration
  const handleBack = () => {
    if (locationState?.from) {
      navigate(locationState.from);
      // Restore scroll position after navigation
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
        <p className="mb-4">The team you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/teams')}>Back to Teams</Button>
      </div>
    );
  }

  const winPct = team.win_percentage ? team.win_percentage * 100 : 0;
  const gamePct = team.game_win_percentage ? team.game_win_percentage * 100 : 0;
  const sweepStats = calculateSweepRate(teamId || '', pastMatches);
  const clutchRecord = calculateClutchRecord(teamId || '', pastMatches);

  // Custom breadcrumbs with team name
  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Teams', href: '/teams' },
      { label: team.name },
    ],
    [team.name]
  );

  return (
    <>
      <TeamDetailsStickyNav />
      <div className="container mx-auto px-4 py-4 md:py-8 space-y-4">
        {/* Breadcrumbs - full version on desktop */}
        <div className="hidden md:block">
          <AnimatedBreadcrumbs items={breadcrumbs} className="mb-4" />
        </div>

        {/* Mobile breadcrumb - compact version with back button */}
        <div className="flex items-center gap-2 md:hidden mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 px-3"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={16} className="mr-1" aria-hidden="true" />
            Back
          </Button>
          <div className="flex items-center text-xs text-muted-foreground">
            <span>Teams</span>
            <span className="mx-1">/</span>
            <span className="text-foreground font-medium">{team.name}</span>
          </div>
        </div>

        {/* Desktop back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="hidden md:inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Hero Section - Tighter on mobile */}
        <TeamHeader team={team} winPercentage={winPct.toFixed(1)} pastMatches={pastMatches} />

        {/* 1. Team Stats */}
        <section id="stats" className="scroll-mt-20" aria-labelledby="stats-heading">
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
            clutchWins={clutchRecord.clutchWins}
            clutchWinPct={clutchRecord.clutchWinPct}
            clutchGame3s={clutchRecord.game3Matches}
          />

          {/* 2. Players */}
          <div className="mt-4">
            <PlayerList players={team.players || []} />
          </div>
        </section>

        {/* Team Analysis */}
        <section id="analysis" className="scroll-mt-20" aria-labelledby="analysis-heading">
          {teamId && <TeamAnalysis teamId={teamId} teamName={team.name} />}
        </section>

        {/* 3. Rivalry Highlights & Head-to-Head Records */}
        <section id="h2h" className="scroll-mt-20 space-y-4" aria-labelledby="h2h-heading">
          {teamId && <RivalryHighlights teamId={teamId} />}
          {teamId && <HeadToHeadRecords teamId={teamId} teamName={team.name} />}
        </section>

        {/* 4. Match History */}
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

        {/* 5. Career Stats */}
        <section id="career" className="scroll-mt-20" aria-labelledby="career-heading">
          {teamId && <TeamTotals teamId={teamId} />}

          {/* 6. Advanced Stats - Season-by-Season Breakdown */}
          {teamId && <TeamAdvancedStatsSection teamId={teamId} />}

          {/* Career Power Score Trend */}
          {teamId && <TeamCareerPowerScoreChart teamId={teamId} />}
        </section>

        {/* 7. Team Achievements */}
        <section id="achievements" className="scroll-mt-20" aria-labelledby="achievements-heading">
          {teamId && (
            <CollapsibleSection
              title="Team Achievements"
              icon={Trophy}
              iconColor="text-amber-500"
              defaultOpen={false}
              headingId="achievements-heading"
            >
              <TeamBadgeCollection
                teamId={teamId}
                size="lg"
                maxDisplay={12}
                orientation="horizontal"
                className="gap-3"
                showEmptyState
              />
            </CollapsibleSection>
          )}
        </section>
      </div>
    </>
  );
};

export default TeamDetails;
