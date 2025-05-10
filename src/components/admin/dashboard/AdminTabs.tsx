
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamsTab from "@/components/admin/teams/TeamsTab";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import BatchMatchCreationTab from "@/components/admin/batch-matches/BatchMatchCreationTab";
import MassScoresTab from "@/components/admin/scores/MassScoresTab";
import StatsTab from "@/components/admin/stats/StatsTab";
import AutoScheduleTab from "@/components/admin/auto-schedule/AutoScheduleTab";

const AdminTabs = () => {
  return (
    <Tabs defaultValue="teams" className="space-y-4">
      <TabsList className="flex flex-wrap md:flex-nowrap gap-2 h-auto md:h-10">
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="scores">Mass Scores</TabsTrigger>
        <TabsTrigger value="batch-matches">Batch Matches</TabsTrigger>
        <TabsTrigger value="auto-schedule">Auto Schedule</TabsTrigger>
        <TabsTrigger value="timeslots">Timeslots</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>

      <TabsContent value="teams" className="space-y-4">
        <TeamsTab />
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

      <TabsContent value="stats" className="space-y-4">
        <StatsTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
