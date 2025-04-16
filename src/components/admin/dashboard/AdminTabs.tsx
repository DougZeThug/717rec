
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Calendar, ClipboardEdit, TableProperties, Users } from "lucide-react";
import TeamsTab from "@/components/admin/teams/TeamsTab";
import MatchesTab from "@/components/admin/matches/MatchesTab";
import TimeslotsTab from "@/components/admin/timeslots/TimeslotsTab";
import ScoresTab from "@/components/admin/scores/ScoresTab";
import MassScoresTab from "@/components/admin/scores/MassScoresTab";

interface AdminTabsProps {
  defaultTab?: string;
}

const AdminTabs: React.FC<AdminTabsProps> = ({ defaultTab = "teams" }) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="teams" className="flex items-center gap-2">
          <Users size={18} />
          <span>Teams</span>
        </TabsTrigger>
        <TabsTrigger value="matches" className="flex items-center gap-2">
          <Award size={18} />
          <span>Matches</span>
        </TabsTrigger>
        <TabsTrigger value="timeslots" className="flex items-center gap-2">
          <Calendar size={18} />
          <span>Timeslots</span>
        </TabsTrigger>
        <TabsTrigger value="scores" className="flex items-center gap-2">
          <ClipboardEdit size={18} />
          <span>Scores</span>
        </TabsTrigger>
        <TabsTrigger value="mass-scores" className="flex items-center gap-2">
          <TableProperties size={18} />
          <span>Mass Entry</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="teams">
        <TeamsTab />
      </TabsContent>
      
      <TabsContent value="matches">
        <MatchesTab />
      </TabsContent>
      
      <TabsContent value="timeslots">
        <TimeslotsTab />
      </TabsContent>
      
      <TabsContent value="scores">
        <ScoresTab />
      </TabsContent>
      
      <TabsContent value="mass-scores">
        <MassScoresTab />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
