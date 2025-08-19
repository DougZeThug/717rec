
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamManagementTab from "@/components/admin/teams/TeamManagementTab";
import PendingMatchesSection from "@/components/admin/PendingMatchesSection";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import BatchMatchCreationTab from "@/components/admin/batch-matches/BatchMatchCreationTab";
import MassScoresTab from "@/components/admin/scores/MassScoresTab";
import AutoScheduleTab from "@/components/admin/auto-schedule/AutoScheduleTab";
import SeasonManagementTab from "@/components/admin/seasons/SeasonManagementTab";

const AdminTabs = () => {
  return (
    <Tabs defaultValue="teams" className="space-y-4">
      <TabsList className="flex flex-wrap md:flex-nowrap gap-2 h-auto md:h-10">
        <TabsTrigger value="teams">Team Management</TabsTrigger>
        <TabsTrigger value="pending-matches">Pending Matches</TabsTrigger>
        <TabsTrigger value="seasons">Season Management</TabsTrigger>
        <TabsTrigger value="scores">Mass Scores</TabsTrigger>
        <TabsTrigger value="batch-matches">Batch Matches</TabsTrigger>
        <TabsTrigger value="auto-schedule">Auto Schedule</TabsTrigger>
        <TabsTrigger value="timeslots">Timeslots</TabsTrigger>
      </TabsList>

      <TabsContent value="teams" className="space-y-4">
        <TeamManagementTab />
      </TabsContent>

      <TabsContent value="pending-matches" className="space-y-4">
        <PendingMatchesSection />
      </TabsContent>

      <TabsContent value="seasons" className="space-y-4">
        <SeasonManagementTab />
      </TabsContent>

      <TabsContent value="scores" className="space-y-4">
        <MassScoresTab />
      </TabsContent>

      <TabsContent value="batch-matches" className="space-y-4">
        <BatchMatchCreationTab />
      </TabsContent>
      
      <TabsContent value="auto-schedule" className="space-y-4">
        <AutoScheduleTab />
      </TabsContent>

      <TabsContent value="timeslots" className="space-y-4">
        <TimeslotsTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
