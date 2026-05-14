import { BarChart3 } from 'lucide-react';
import React, { useState } from 'react';

import { TeamAdvancedStatsInsightsTab } from '@/components/teams/TeamAdvancedStatsInsightsTab';
import { TeamAdvancedStatsSeasonsTab } from '@/components/teams/TeamAdvancedStatsSeasonsTab';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamSeasonBreakdown } from '@/hooks/useTeamSeasonBreakdown';

interface TeamAdvancedStatsSectionProps {
  teamId: string;
}

const TeamAdvancedStatsSection: React.FC<TeamAdvancedStatsSectionProps> = ({ teamId }) => {
  const { advancedStats, isLoading } = useTeamSeasonBreakdown(teamId);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonId)) {
        next.delete(seasonId);
      } else {
        next.add(seasonId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <CollapsibleSection
        title="Advanced Stats"
        icon={BarChart3}
        iconColor="text-indigo-500"
        defaultOpen={false}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-full"></div>
          {['adv-stats-row-1', 'adv-stats-row-2', 'adv-stats-row-3'].map((k) => (
            <div key={k} className="h-12 bg-muted rounded w-full"></div>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  if (!advancedStats || advancedStats.seasons.length === 0) {
    return (
      <CollapsibleSection
        title="Advanced Stats"
        icon={BarChart3}
        iconColor="text-indigo-500"
        defaultOpen={false}
      >
        <div className="text-center py-8">
          <BarChart3 className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No advanced stats available</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Stats will appear after completing seasons
          </p>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Advanced Stats"
      icon={BarChart3}
      iconColor="text-indigo-500"
      defaultOpen={false}
    >
      <Tabs defaultValue="seasons" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="seasons" className="text-xs md:text-sm">
            Season-by-Season
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs md:text-sm">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seasons">
          <TeamAdvancedStatsSeasonsTab
            advancedStats={advancedStats}
            expandedSeasons={expandedSeasons}
            onToggleSeason={toggleSeason}
          />
        </TabsContent>

        <TabsContent value="insights">
          <TeamAdvancedStatsInsightsTab advancedStats={advancedStats} />
        </TabsContent>
      </Tabs>
    </CollapsibleSection>
  );
};

export default React.memo(TeamAdvancedStatsSection);
