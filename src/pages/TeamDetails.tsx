import { ArrowLeft, BarChart3, GraduationCap, Swords, TrendingUp, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import AnimatedBreadcrumbs from '@/components/navigation/AnimatedBreadcrumbs';
import HeadToHeadRecords from '@/components/stats/HeadToHeadRecords';
import MatchList from '@/components/teams/MatchList';
import PlayerList from '@/components/teams/PlayerList';
import RivalryHighlights from '@/components/teams/RivalryHighlights';
import StatBreakdown from '@/components/teams/StatBreakdown';
import TeamAdvancedStatsSection from '@/components/teams/TeamAdvancedStatsSection';
import TeamCareerPowerScoreChart from '@/components/teams/TeamCareerPowerScoreChart';
import TeamDetailsStickyNav from '@/components/teams/TeamDetailsStickyNav';
import TeamHeader from '@/components/teams/TeamHeader';
import TeamPerformanceCards from '@/components/teams/TeamPerformanceCards';
import TeamReportCard from '@/components/teams/TeamReportCard';
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

  const teamRankIndex = rankings?.findIndex((r) => r.teamId === teamId) ?? -1;
  const teamRank = teamRankIndex >= 0 ? teamRankIndex + 1 : undefined;
  const teamRanking = teamRankIndex >= 0 ? rankings![teamRankIndex] : undefined;
  const totalTeams = rankings?.length;

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
        <p className="mb-4">The team you're looking for doesn't exist.</p>
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
          <ArrowLeft className="h-4 w-4" />
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
            wins={team.wins}
            losses={team.losses}
          />
        </section>

        {/* 2. Roster - default open */}
        <PlayerList players={team.players || []} />

        {/* 3. Team Stats & Advanced - combined, default closed */}
        <section id="stats" className="scroll-mt-20" aria-labelledby="stats-heading">
          <CollapsibleSection
            title="Team Stats & Advanced"
            icon={BarChart3}
            iconColor="text-blue-500"
            defaultOpen={false}
            headingId="stats-heading"
            summaryValue={`${team.wins}-${team.losses}`}
          >
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
            {/* Advanced Stats within the same section */}
            {teamId && (
              <div className="mt-4">
                <TeamAdvancedStatsSection teamId={teamId} />
              </div>
            )}
          </CollapsibleSection>
        </section>

        {/* 4. Report Card - default closed */}
        <section id="report-card" className="scroll-mt-20" aria-labelledby="report-card-heading">
          {teamId && <TeamReportCard teamId={teamId} />}
        </section>

        {/* 5. Rivalry Highlights & Head-to-Head Records - default closed */}
        <section id="h2h" className="scroll-mt-20 space-y-3" aria-labelledby="h2h-heading">
          {teamId && <RivalryHighlights teamId={teamId} />}
          {teamId && <HeadToHeadRecords teamId={teamId} teamName={team.name} />}
        </section>

        {/* 6. Match History - default closed */}
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

        {/* 7. Career Stats - default closed */}
        <section id="career" className="scroll-mt-20" aria-labelledby="career-heading">
          {teamId && <TeamTotals teamId={teamId} />}

          {/* Career Power Score Trend */}
          {teamId && <TeamCareerPowerScoreChart teamId={teamId} />}
        </section>

        {/* 8. Team Achievements - default closed */}
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
