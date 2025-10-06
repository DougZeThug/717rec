
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import TeamsTab from "@/components/admin/auto-schedule/tabs/TeamsTab";
import MatchesTab from "@/components/admin/auto-schedule/tabs/MatchesTab";
import ExportTab from "@/components/admin/auto-schedule/tabs/ExportTab";
import { TimeBlockTeamsMap, TeamPairingMap, MatchQualityMetrics, AutoScheduleMatch } from "@/types/autoSchedule";
import { ValidationResult } from "@/utils/autoSchedule/validation";

interface ScheduleWorkflowTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  originalTimeBlockTeams: TimeBlockTeamsMap;
  generatedPairings: TeamPairingMap;
  generatedMatches: any[] | null;
  unmatchedTeamIds: string[];
  isGenerating: boolean;
  oddBlocks: number;
  totalTeams: number;
  matchQualityMetrics: MatchQualityMetrics | null;
  dualMatchMode?: boolean;
  onApplySchedule: () => void;
  onSaveSchedule?: () => Promise<boolean>;
  isSaving?: boolean;
  onManualTeamAssign?: (updatedTeams: TimeBlockTeamsMap) => void;
  // Edit mode props
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  editableMatches?: AutoScheduleMatch[];
  validation?: ValidationResult | null;
  onUpdateMatchTeam?: (matchId: string, teamPosition: 'team1' | 'team2', newTeamId: string) => void;
  onUpdateMatchTimeslot?: (matchId: string, newTimeslot: string) => void;
  onSwapTeams?: (matchId: string) => void;
  onRemoveMatch?: (matchId: string) => void;
  onResetEdits?: () => void;
  hasUnsavedEdits?: boolean;
}

const ScheduleWorkflowTabs: React.FC<ScheduleWorkflowTabsProps> = ({
  activeTab,
  setActiveTab,
  selectedDate,
  timeBlockTeams,
  originalTimeBlockTeams,
  generatedPairings,
  generatedMatches,
  unmatchedTeamIds,
  isGenerating,
  oddBlocks,
  totalTeams,
  matchQualityMetrics,
  dualMatchMode,
  onApplySchedule,
  onSaveSchedule,
  isSaving,
  onManualTeamAssign,
  isEditMode,
  onToggleEditMode,
  editableMatches,
  validation,
  onUpdateMatchTeam,
  onUpdateMatchTimeslot,
  onSwapTeams,
  onRemoveMatch,
  onResetEdits,
  hasUnsavedEdits
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
              originalTimeBlockTeams={originalTimeBlockTeams}
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
              isEditMode={isEditMode}
              onToggleEditMode={onToggleEditMode}
              editableMatches={editableMatches}
              validation={validation}
              onUpdateMatchTeam={onUpdateMatchTeam}
              onUpdateMatchTimeslot={onUpdateMatchTimeslot}
              onSwapTeams={onSwapTeams}
              onRemoveMatch={onRemoveMatch}
              onResetEdits={onResetEdits}
              hasUnsavedEdits={hasUnsavedEdits}
            />
          </TabsContent>
          
          <TabsContent value="export" className="p-4">
            <ExportTab
              selectedDate={selectedDate}
              generatedMatches={generatedMatches}
              matchQualityMetrics={matchQualityMetrics}
              onApplySchedule={onApplySchedule}
              onSaveSchedule={onSaveSchedule}
              isSaving={isSaving}
              hasUnsavedEdits={hasUnsavedEdits}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ScheduleWorkflowTabs;
