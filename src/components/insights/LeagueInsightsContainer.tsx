import { Lightbulb } from 'lucide-react';
import React from 'react';

import { SectionHeader } from '@/components/ui/CollapsibleSection';
import LoadingState from '@/components/ui/loading-state';
import WinterSection from '@/components/winter/WinterSection';
import { useLeagueInsights } from '@/hooks/useLeagueInsights';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import DivisionStrengthChart from './DivisionStrengthChart';
import LeagueOverviewCards from './LeagueOverviewCards';
import LeagueParityCard from './LeagueParityCard';
import TopPerformersSection from './TopPerformersSection';

const LeagueInsightsContainer: React.FC = () => {
  const { overview, divisionStrength, parity, topPerformers, isLoading } = useLeagueInsights();
  const { isWinterTheme } = useSeasonalTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] py-8">
        <LoadingState message="Crunching the numbers..." size="lg" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-16">
        <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
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
          <DivisionStrengthChart divisions={divisionStrength} />
          {parity && <LeagueParityCard parity={parity} totalTeams={overview.totalTeams} />}
        </div>

        {/* Top performers */}
        <TopPerformersSection performers={topPerformers} />
      </div>
    </WinterSection>
  );
};

export default LeagueInsightsContainer;
