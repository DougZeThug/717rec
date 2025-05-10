
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamPairingMap, TimeBlockTeamsMap } from "@/types/autoSchedule";
import { useIsMobile } from "@/hooks/use-mobile";
import TeamsTab from "./tabs/TeamsTab";
import MatchesTab from "./tabs/MatchesTab";
import ExportTab from "./tabs/ExportTab";

interface ScheduleWorkflowTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  generatedPairings: TeamPairingMap;
  generatedMatches: any[];
  unmatchedTeamIds: string[];
  isGenerating: boolean;
  oddBlocks: number;
  totalTeams: number;
  onApplySchedule: () => void;
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
  onApplySchedule
}) => {
  const isMobile = useIsMobile();
  
  // Get shorter tab labels for mobile
  const getTabLabel = (tab: string) => {
    if (isMobile) {
      switch(tab) {
        case "teams": return "Teams";
        case "matches": return "Matches";
        case "export": return "Export";
        default: return tab;
      }
    }
    
    return {
      "teams": "Available Teams",
      "matches": "Generated Matches",
      "export": "Export Schedule"
    }[tab] || tab;
  };

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="teams" className="px-1 sm:px-3 text-xs sm:text-sm">
              <span className="truncate">{getTabLabel("teams")}</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="px-1 sm:px-3 text-xs sm:text-sm">
              <span className="truncate">{getTabLabel("matches")}</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="px-1 sm:px-3 text-xs sm:text-sm">
              <span className="truncate">{getTabLabel("export")}</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-4">
            <TabsContent value="teams" className="mt-0">
              <TeamsTab 
                timeBlockTeams={timeBlockTeams}
                selectedDate={selectedDate}
                unmatchedTeamIds={unmatchedTeamIds}
                oddBlocks={oddBlocks}
                totalTeams={totalTeams}
              />
            </TabsContent>
            
            <TabsContent value="matches" className="mt-0">
              <MatchesTab 
                selectedDate={selectedDate}
                generatedPairings={generatedPairings}
                isGenerating={isGenerating}
                onApplySchedule={onApplySchedule}
              />
            </TabsContent>
            
            <TabsContent value="export" className="mt-0">
              <ExportTab 
                generatedMatches={generatedMatches}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScheduleWorkflowTabs;
