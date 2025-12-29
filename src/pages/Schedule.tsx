import React, { useState, useEffect, useRef } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";
import { useScheduleData } from "@/hooks/useScheduleData";
import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import ScheduleContent from "@/components/schedule/ScheduleContent";
import DeleteMatchDialog from "@/components/schedule/DeleteMatchDialog";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import ScheduleContentSkeleton from "@/components/schedule/ScheduleContentSkeleton";
import { normalizeDate } from "@/utils/dateNormalization";
import { scheduleLog } from "@/utils/logger";
import PageLayout from "@/components/layout/PageLayout";

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get upcoming Thursday (or today if it's Thursday)
  const getUpcomingThursday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
    
    if (dayOfWeek === 4) {
      // Today is Thursday, return today
      return today;
    }
    
    // Calculate days until next Thursday
    const daysUntilThursday = dayOfWeek < 4 
      ? 4 - dayOfWeek  // This week's Thursday
      : 7 - dayOfWeek + 4;  // Next week's Thursday
    
    const upcomingThursday = new Date(today);
    upcomingThursday.setDate(today.getDate() + daysUntilThursday);
    
    return upcomingThursday;
  };
  
  const [selectedDate, setSelectedDate] = useState<Date>(getUpcomingThursday());
  const [activeTab, setActiveTab] = useState("timeslots");
  const hasInitializedTab = useRef(false);
  
  // Log date for debugging
  useEffect(() => {
    scheduleLog("Current selected date:", {
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
    isDeleting,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch
  } = useMatchManagement(matchesData || []);

  // Reset initialization flag when date changes
  useEffect(() => {
    hasInitializedTab.current = false;
  }, [selectedDate]);

  // Smart default tab logic - only set once per date selection
  useEffect(() => {
    // Don't override if already initialized for this date
    if (hasInitializedTab.current) return;
    
    // Wait for data to load
    if (matchesLoading || timeslotsLoading) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    // Mark as initialized
    hasInitializedTab.current = true;
    
    // If selected date is in the past, default to completed
    if (selected < today) {
      setActiveTab("completed");
      return;
    }
    
    // For today or future dates:
    // Priority 1: If there are upcoming matches, show upcoming tab
    if (upcomingMatches && upcomingMatches.length > 0) {
      setActiveTab("upcoming");
      return;
    }
    
    // Priority 2: If there are timeslots, show timeslots tab
    const hasTimeslots = Object.keys(groupedTimeslots).length > 0;
    if (hasTimeslots) {
      setActiveTab("timeslots");
      return;
    }
    
    // Default fallback to timeslots
    setActiveTab("timeslots");
  }, [selectedDate, matchesLoading, timeslotsLoading, upcomingMatches, groupedTimeslots]);

  // Handle date selection with proper normalization
  const handleDateSelect = (date: Date) => {
    // Create consistent UTC date
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    const normalizedDate = new Date(Date.UTC(year, month, day));
    scheduleLog("Date selection changed:", {
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
    <PageLayout withBackground={true} gradientVariant="blueOrange">
      <div className="max-w-7xl mx-auto font-inter">
        <ScheduleHeader 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />

        {/* Matches section with Timeslots tab */}
        {isLoading ? (
          <ScheduleContentSkeleton activeTab={activeTab} />
        ) : (
          <ScheduleContent 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filteredMatches={filteredMatches}
            teams={teams || []}
            selectedDate={selectedDate}
            groupedTimeslots={groupedTimeslots}
            timeslotsLoading={timeslotsLoading}
            onEditMatch={(match) => {
              setEditingMatch(match);
              setIsFormOpen(true);
            }}
            onDeleteMatch={(matchId) => setDeleteMatchId(matchId)}
          />
        )}
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
        isDeleting={isDeleting}
      />
    </PageLayout>
  );
};

export default Schedule;
