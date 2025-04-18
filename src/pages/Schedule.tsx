
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { useTeamData } from "@/hooks/useTeamData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";
import { Match } from "@/types";

import ScheduleHeader from "@/components/schedule/ScheduleHeader";
import MatchGrid from "@/components/schedule/MatchGrid";
import DeleteMatchDialog from "@/components/schedule/DeleteMatchDialog";
import MatchFormDialog from "@/components/schedule/MatchFormDialog";
import TimeslotGrouping from "@/components/schedule/TimeslotGrouping";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  
  // Fetch matches from Supabase with improved logging to debug issues
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      console.log("Fetching matches data...");
      
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date');
        
      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }
      
      // Log raw response to verify data
      console.log("Raw matches response:", data);
      
      // Transform Supabase data to Match type
      const formattedData = data.map((match): Match => ({
        id: match.id,
        team1Id: match.team1_id,
        team2Id: match.team2_id,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        date: match.date,
        location: match.location || '',
        iscompleted: match.iscompleted,
        winnerId: match.winner_id,
        loserId: match.loser_id,
        round_number: match.round_number,
        position: match.position,
        bracket_id: match.bracket_id,
        match_type: match.match_type,
        next_match_id: match.next_match_id,
        next_loser_match_id: match.next_loser_match_id,
        best_of: match.best_of
      }));
      
      console.log("Formatted matches data:", formattedData);
      return formattedData;
    },
    // Remove staleTime to ensure we always have fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });
  
  // Get timeslots for the currently selected date
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

  // Filter matches based on search term and active tab
  const filteredMatches = matches
    .filter(match => {
      if (activeTab === "upcoming") {
        return !match.iscompleted;
      } else if (activeTab === "completed") {
        return match.iscompleted;
      }
      return true;
    })
    .filter(match => {
      if (!searchTerm || !teams) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const team1 = teams.find(t => t.id === match.team1Id);
      const team2 = teams.find(t => t.id === match.team2Id);
      
      return (
        (team1?.name || "").toLowerCase().includes(searchLower) ||
        (team2?.name || "").toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by date ascending (earliest first)
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

  // Callback for when a date is selected
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Handlers with data invalidation
  const handleMatchCreated = async (matchData: Omit<Match, "id">) => {
    const success = await handleCreateMatch(matchData, teams || []);
    if (success) {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    }
  };
  
  const handleMatchUpdated = async (matchData: Omit<Match, "id">) => {
    const success = await handleUpdateMatch(matchData, teams || []);
    if (success) {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    }
  };
  
  const handleMatchDeleted = async () => {
    const success = await handleDeleteMatch(teams || []);
    if (success) {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    }
  };

  // Effect to set up a polling mechanism to refresh data periodically
  useEffect(() => {
    // Set up polling to refresh matches data every 30 seconds
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [queryClient]);

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

  // Log data after loading for debugging purposes
  console.log("Total matches available:", matches.length);
  console.log("Filtered matches count:", filteredMatches.length);
  console.log("Teams count:", teams?.length || 0);
  console.log("Group timeslots:", groupedTimeslots);

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
          onDateSelect={handleDateSelect}
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
              teams={teams || []}
              searchTerm={searchTerm}
              isCompleted={false}
              onEdit={(match) => {
                setEditingMatch(match);
                setIsFormOpen(true);
              }}
              onDelete={(matchId) => setDeleteMatchId(matchId)}
            />
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6">
            <MatchGrid 
              matches={filteredMatches}
              teams={teams || []}
              searchTerm={searchTerm}
              isCompleted={true}
              onEdit={(match) => {
                setEditingMatch(match);
                setIsFormOpen(true);
              }}
              onDelete={(matchId) => setDeleteMatchId(matchId)}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <MatchFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        match={editingMatch}
        teams={teams || []}
        onSubmit={(matchData) => {
          if (editingMatch) {
            handleMatchUpdated(matchData);
          } else {
            handleMatchCreated(matchData);
          }
        }}
      />
      
      <DeleteMatchDialog 
        isOpen={deleteMatchId !== null}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={handleMatchDeleted}
      />
    </div>
  );
};

export default Schedule;
