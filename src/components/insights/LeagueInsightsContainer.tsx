import { Lightbulb } from 'lucide-react';
import React, { lazy, Suspense } from 'react';

import { SectionHeader } from '@/components/ui/CollapsibleSection';
import { ErrorDisplay } from '@/components/ui/error-display';
import { LoadingState } from '@/components/ui/loading-state';
import { Skeleton } from '@/components/ui/skeleton';
import WinterSection from '@/components/winter/WinterSection';
import { useLeagueInsights } from '@/hooks/useLeagueInsights';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import DivisionMatchupsCard from './DivisionMatchupsCard';
import LeagueOverviewCards from './LeagueOverviewCards';
import LeagueParityCard from './LeagueParityCard';
import TopPerformersSection from './TopPerformersSection';

const DivisionStrengthChart = lazy(() => import('./DivisionStrengthChart'));

const LeagueInsightsContainer: React.FC = () => {
  const { overview, divisionStrength, parity, topPerformers, isLoading, error, refetch } =
    useLeagueInsights();
  const { isWinterTheme } = useSeasonalTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] py-8">
        <LoadingState message="Crunching the numbers..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorDisplay
          variant="card"
          error="We could not load league insights. Please try again."
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-16">
        <Lightbulb className="mx-auto size-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h2>
        <p className="text-muted-foreground">
          League insights will appear once teams have played some matches.
        </p>
      </div>
    );
  }

  return (
    <WinterSection
      showIcicles
      lightIcicles
      className={cn(
        'max-w-7xl mx-auto px-2 sm:px-4',
        isWinterTheme ? 'bg-transparent' : 'bg-gray-50 dark:bg-transparent'
      )}
    >
      <SectionHeader
        title="League Insights"
        icon={Lightbulb}
        iconColor="text-amber-500"
        description="A look at the state of the league"
      />

      <div className="space-y-6">
        {/* Overview stat cards */}
        <LeagueOverviewCards overview={overview} />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<Skeleton className="h-[320px] w-full rounded-lg" />}>
            <DivisionStrengthChart divisions={divisionStrength} />
          </Suspense>
          {parity && <LeagueParityCard parity={parity} totalTeams={overview.totalTeams} />}
        </div>

        {/* Division-vs-division aggregate records */}
        <DivisionMatchupsCard />

        {/* Top performers */}
        <TopPerformersSection performers={topPerformers} />
      </div>
    </WinterSection>
  );
};

export default LeagueInsightsContainer;
