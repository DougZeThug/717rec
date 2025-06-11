
import React, { useState } from "react";
import { Match } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Flame, Trophy } from "lucide-react";
import StatsPageHeader from "./StatsPageHeader";
import StatsSummarySection from "./StatsSummarySection";
import StatsChartsSection from "./StatsChartsSection";
import FullRankingsSection from "./FullRankingsSection";
import LoadingStateContainer from "./LoadingStateContainer";
import { WeeklyHeatIndex } from "@/components/stats/weekly";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer: React.FC<StatsContainerProps> = ({
  matches,
  isLoadingMatches,
  matchesError,
}) => {
  const [activeTab, setActiveTab] = useState("standings");

  if (isLoadingMatches) {
    return <LoadingStateContainer />;
  }

  if (matchesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Error loading matches: {matchesError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <StatsPageHeader />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standings" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Standings & Stats
          </TabsTrigger>
          <TabsTrigger value="weekly-heat" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Weekly Heat Index
          </TabsTrigger>
          <TabsTrigger value="playoffs" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Playoff Picture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-6">
          <StatsSummarySection />
          <StatsChartsSection />
          <FullRankingsSection />
        </TabsContent>

        <TabsContent value="weekly-heat" className="space-y-6">
          <WeeklyHeatIndex />
        </TabsContent>

        <TabsContent value="playoffs" className="space-y-6">
          <div className="text-center text-muted-foreground py-12">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Playoff standings and seeding information coming soon!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsContainer;
