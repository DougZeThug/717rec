
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTeamData } from "@/hooks/useTeamData";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";
import { useScheduleData } from "@/hooks/useScheduleData";
import { filterAndSortMatches } from "@/utils/scheduleUtils";

import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import DeleteMatchDialog from "@/components/schedule/DeleteMatchDialog";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import TimeslotGrouping from "@/components/schedule/TimeslotGrouping";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  const { matchesData, matchesLoading } = useScheduleData();
  const { groupedTimeslots, isLoading: timeslotsLoading } = useMatchTimeslots(selectedDate);

  const {
    matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch
  } = useMatchManagement(matchesData || []);

  const filteredMatches = filterAndSortMatches(matches, activeTab, searchTerm, teams);

  // Adapter functions to handle the parameter mismatches
  const handleCreateMatchAdapter = (matchData: any) => {
    return handleCreateMatch(matchData, teams || []);
  };

  const handleUpdateMatchAdapter = (matchData: any) => {
    return handleUpdateMatch(matchData, teams || []);
  };

  const handleDeleteMatchAdapter = () => {
    return handleDeleteMatch(teams || []);
  };

  if (teamsLoading || matchesLoading) {
    return (
      <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
          <p className="text-lg">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <ScheduleHeader 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onNewMatch={() => {
            setEditingMatch(undefined);
            setIsFormOpen(true);
          }}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <div className="mb-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Clock className="h-5 w-5 mr-2" />
                Timeslots for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeslotGrouping 
                groupedTimeslots={groupedTimeslots} 
                isLoading={timeslotsLoading} 
              />
            </CardContent>
          </Card>
        </div>

        <ScheduleContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filteredMatches={filteredMatches}
          teams={teams || []}
          onEditMatch={(match) => {
            setEditingMatch(match);
            setIsFormOpen(true);
          }}
          onDeleteMatch={(matchId) => setDeleteMatchId(matchId)}
        />
      </div>
      
      <MatchFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        match={editingMatch}
        teams={teams || []}
        onSubmit={editingMatch ? handleUpdateMatchAdapter : handleCreateMatchAdapter}
      />
      
      <DeleteMatchDialog 
        isOpen={deleteMatchId !== null}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={handleDeleteMatchAdapter}
      />
    </div>
  );
};

export default Schedule;
