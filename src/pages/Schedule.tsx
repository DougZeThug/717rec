
import React, { useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { useTeamData } from "@/hooks/useTeamData";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";
import { useScheduleData } from "@/hooks/useScheduleData";
import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import DeleteMatchDialog from "@/components/schedule/DeleteMatchDialog";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import TimeslotGrouping from "@/components/schedule/TimeslotGrouping";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  const { 
    matchesData, 
    matchesLoading, 
    upcomingMatches, 
    completedMatches 
  } = useScheduleData();
  
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

  const filteredMatches = React.useMemo(() => {
    const sourceMatches = activeTab === "upcoming" ? upcomingMatches : completedMatches;
    if (!searchTerm) return sourceMatches;
    return sourceMatches.filter(match => {
      const team1Name = match.team1Details?.name || "";
      const team2Name = match.team2Details?.name || "";
      const searchLower = searchTerm.toLowerCase();
      return (
        team1Name.toLowerCase().includes(searchLower) ||
        team2Name.toLowerCase().includes(searchLower) ||
        match.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [activeTab, upcomingMatches, completedMatches, searchTerm]);

  const handleCreateMatchAdapter = (matchData: any) => handleCreateMatch(matchData, teams || []);
  const handleUpdateMatchAdapter = (matchData: any) => handleUpdateMatch(matchData, teams || []);
  const handleDeleteMatchAdapter = () => handleDeleteMatch(teams || []);

  if (teamsLoading || matchesLoading) {
    return (
      <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 flex items-center justify-center font-inter">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
          <p className="text-lg">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 font-inter">
      <div className="max-w-7xl mx-auto">
        <ScheduleHeader 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <div className="mb-8 mt-2">
          <div className="bg-muted border rounded-md p-4 shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-base font-inter tracking-wide font-semibold">
                Timeslots for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <TimeslotGrouping 
              groupedTimeslots={groupedTimeslots} 
              isLoading={timeslotsLoading} 
            />
          </div>
        </div>

        <ScheduleContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filteredMatches={filteredMatches}
          teams={teams || []}
          selectedDate={selectedDate}
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

