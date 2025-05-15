
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import TeamsTab from "@/components/admin/auto-schedule/tabs/TeamsTab";
import MatchesTab from "@/components/admin/auto-schedule/tabs/MatchesTab";
import ExportTab from "@/components/admin/auto-schedule/tabs/ExportTab";
import { Team } from "@/types";
import { TimeBlockTeamsMap, TeamPairingMap, MatchQualityMetrics } from "@/types/autoSchedule";

interface ScheduleWorkflowTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  generatedPairings: TeamPairingMap;
  generatedMatches: any[] | null;
  unmatchedTeamIds: string[];
  isGenerating: boolean;
  oddBlocks: number;
  totalTeams: number;
  matchQualityMetrics: MatchQualityMetrics | null;
  dualMatchMode?: boolean;
  onApplySchedule: () => void;
  onManualTeamAssign?: (updatedTeams: TimeBlockTeamsMap) => void;
}

const ScheduleWorkflowTabs: React.FC<ScheduleWorkflowTabsProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  timeBlockTeams,
  generatedPairings,
  generatedMatches,
  unmatchedTeamIds,
  isGenerating,
  oddBlocks,
  totalTeams,
  matchQualityMetrics,
  dualMatchMode,
  onApplySchedule,
  onManualTeamAssign
}) => {
  return (
    <div className="lg:col-span-2">
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-0">
            <TabsTrigger value="teams">1. Teams</TabsTrigger>
            <TabsTrigger value="pairings">2. Matches</TabsTrigger>
            <TabsTrigger value="export">3. Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="p-4">
            <TeamsTab
              timeBlockTeams={timeBlockTeams}
              selectedDate={selectedDate}
              unmatchedTeamIds={unmatchedTeamIds}
              oddBlocks={oddBlocks}
              totalTeams={totalTeams}
              onManualTeamAssign={onManualTeamAssign}
            />
          </TabsContent>
          
          <TabsContent value="pairings" className="p-4">
            <MatchesTab
              selectedDate={selectedDate}
              timeBlockTeams={timeBlockTeams}
              generatedPairings={generatedPairings}
              unmatchedTeamIds={unmatchedTeamIds}
              isGenerating={isGenerating}
              matchQualityMetrics={matchQualityMetrics}
              dualMatchMode={dualMatchMode}
              onApplySchedule={onApplySchedule}
            />
          </TabsContent>
          
          <TabsContent value="export" className="p-4">
            <ExportTab
              selectedDate={selectedDate}
              generatedMatches={generatedMatches}
              matchQualityMetrics={matchQualityMetrics}
              onApplySchedule={onApplySchedule}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ScheduleWorkflowTabs;
