
import React, { useState } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";
import { useScheduleData } from "@/hooks/useScheduleData";
import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import DeleteMatchDialog from "@/components/schedule/DeleteMatchDialog";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import TimeslotGrouping from "@/components/schedule/TimeslotGrouping";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { Clock } from "lucide-react";
import ScheduleContentSkeleton from "@/components/schedule/ScheduleContentSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeDate } from "@/utils/dateNormalization";

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Smart default tab based on day of week
  const getDefaultTab = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
    return dayOfWeek === 4 ? "upcoming" : "completed"; // Thursday = upcoming
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { resolvedTheme } = useTheme();
  
  // Log date for debugging
  React.useEffect(() => {
    console.log("Schedule - Current selected date:", {
      selectedDate,
      selectedDateString: selectedDate.toString(),
      selectedDateIso: selectedDate.toISOString(),
      normalizedDate: normalizeDate(selectedDate, "Schedule")
    });
  }, [selectedDate]);
  
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

  // Handle date selection with proper normalization
  const handleDateSelect = (date: Date) => {
    // Create consistent UTC date
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    const normalizedDate = new Date(Date.UTC(year, month, day));
    console.log("Schedule - Date selection changed:", {
      originalDate: date,
      normalizedDate,
      dateString: normalizedDate.toString(),
      isoString: normalizedDate.toISOString()
    });
    
    setSelectedDate(normalizedDate);
  };

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

  // Consider both matches and teams loading states
  const isLoading = matchesLoading || teamsLoading;

  return (
    <div className="min-h-screen cornhole-bg dark:bg-gray-900 py-8 px-4 md:px-8 font-inter">
      <div className="max-w-7xl mx-auto">
        <ScheduleHeader 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* REORDERED: Matches section appears first now */}
        {isLoading ? (
          <ScheduleContentSkeleton activeTab={activeTab} />
        ) : (
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
        )}

        {/* Timeslots section now appears second */}
        <div className="mb-8 mt-8">
          <div className="bg-muted dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-base font-inter tracking-wide font-semibold dark:text-white">
                Timeslots for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            {timeslotsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : (
              <TimeslotGrouping 
                groupedTimeslots={groupedTimeslots} 
                isLoading={timeslotsLoading} 
              />
            )}
          </div>
        </div>
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
