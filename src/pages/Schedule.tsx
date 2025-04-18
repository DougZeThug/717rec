
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
  
  // Fetch matches from Supabase
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date');
        
      if (error) throw error;
      
      // Transform Supabase data to Match type
      return data.map((match): Match => ({
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
    }
  });
  
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

  // Get timeslots for the currently selected date
  const { groupedTimeslots, isLoading: timeslotsLoading } = useMatchTimeslots(selectedDate);

  // Update matches when matchesData changes
  useEffect(() => {
    if (matchesData) {
      // This is handled by useMatchManagement initialization
    }
  }, [matchesData]);

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
    .sort((a, b) => new Date(a.date || "").getTime() - new Date(b.date || "").getTime());

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
