
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle } from "lucide-react";
import { Match, Team } from "@/types";
import MatchGrid from "./MatchGrid";

interface ScheduleContentProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  filteredMatches: Match[];
  teams: Team[];
  onEditMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  activeTab,
  setActiveTab,
  filteredMatches,
  teams,
  onEditMatch,
  onDeleteMatch
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
      <TabsList className="w-full md:w-auto">
        <TabsTrigger value="upcoming" className="flex-1 md:flex-grow-0">
          <Calendar className="h-4 w-4 mr-2" />
          Upcoming Matches
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex-1 md:flex-grow-0">
          <CheckCircle className="h-4 w-4 mr-2" />
          Completed Matches
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upcoming" className="mt-6">
        <MatchGrid 
          matches={filteredMatches}
          teams={teams}
          searchTerm=""
          isCompleted={false}
          onEdit={onEditMatch}
          onDelete={onDeleteMatch}
        />
      </TabsContent>
      
      <TabsContent value="completed" className="mt-6">
        <MatchGrid 
          matches={filteredMatches}
          teams={teams}
          searchTerm=""
          isCompleted={true}
          onEdit={onEditMatch}
          onDelete={onDeleteMatch}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ScheduleContent;
