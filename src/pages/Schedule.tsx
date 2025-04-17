
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { useTeamData } from "@/hooks/useTeamData";
import { mockMatches } from "@/data/mockData";
import { useMatchManagement } from "@/hooks/useMatchManagement";
import { useMatchTimeslots } from "@/hooks/useMatchTimeslots";

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
  const { data: teams, isLoading: teamsLoading } = useTeamData();
  
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
  } = useMatchManagement(mockMatches);

  // Get timeslots for the currently selected date
  const { groupedTimeslots, isLoading: timeslotsLoading } = useMatchTimeslots(selectedDate);

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

  if (teamsLoading) {
    return (
      <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
          <p className="text-lg">Loading team data...</p>
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
            handleUpdateMatch(matchData, teams || []);
          } else {
            handleCreateMatch(matchData, teams || []);
          }
        }}
      />
      
      <DeleteMatchDialog 
        isOpen={deleteMatchId !== null}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={() => handleDeleteMatch(teams || [])}
      />
    </div>
  );
};

export default Schedule;
