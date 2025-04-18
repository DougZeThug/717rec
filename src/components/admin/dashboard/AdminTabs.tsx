
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamsTab from "@/components/admin/teams/TeamsTab";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import MatchesTab from "@/components/admin/matches/MatchesTab";
import BatchMatchCreationTab from "@/components/admin/batch-matches/BatchMatchCreationTab";

const AdminTabs = () => {
  return (
    <Tabs defaultValue="teams" className="space-y-4">
      <TabsList>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="matches">Matches</TabsTrigger>
        <TabsTrigger value="batch-matches">Batch Matches</TabsTrigger>
        <TabsTrigger value="timeslots">Timeslots</TabsTrigger>
      </TabsList>

      <TabsContent value="teams" className="space-y-4">
        <TeamsTab />
      </TabsContent>

      <TabsContent value="matches" className="space-y-4">
        <MatchesTab />
      </TabsContent>

      <TabsContent value="batch-matches" className="space-y-4">
        <BatchMatchCreationTab />
      </TabsContent>

      <TabsContent value="timeslots" className="space-y-4">
        <TimeslotsTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
