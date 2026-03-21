import { BarChart3, Target, Trophy, Users } from 'lucide-react';
import React from 'react';

import { SummaryCard } from '@/components/ui/summary-card';
import { LeagueOverview } from '@/hooks/useLeagueInsights';

interface LeagueOverviewCardsProps {
  overview: LeagueOverview;
}

const LeagueOverviewCards: React.FC<LeagueOverviewCardsProps> = ({ overview }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        icon={Users}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        title="Teams"
        value={overview.totalTeams}
        gradient="blue"
        index={0}
      />
      <SummaryCard
        icon={Trophy}
        iconColor="text-amber-600"
        iconBgColor="bg-amber-100 dark:bg-amber-900/30"
        title="Matches Played"
        value={overview.totalMatches}
        gradient="amber"
        index={1}
      />
      <SummaryCard
        icon={BarChart3}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        title="Avg Power Score"
        value={overview.avgPowerScore}
        description={`Median: ${overview.medianPowerScore}`}
        gradient="purple"
        index={2}
      />
      <SummaryCard
        icon={Target}
        iconColor="text-green-600"
        iconBgColor="bg-green-100 dark:bg-green-900/30"
        title="Avg Win Rate"
        value={`${overview.avgWinPct}%`}
        gradient="green"
        index={3}
      />
    </div>
  );
};

export default LeagueOverviewCards;
