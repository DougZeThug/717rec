import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamForm from "@/components/teams/TeamForm";
import { useTeams } from "@/hooks/useTeams";
import MatchForm from "@/components/schedule/MatchForm";
import TimeslotAssignment from "@/components/timeslots/TimeslotAssignment";
import TimeslotList from "@/components/timeslots/TimeslotList";
import { useTimeslots } from "@/hooks/useTimeslots";
import { useTeamData } from "@/hooks/useTeamData";
import { Team } from "@/types";
import PendingMatchesSection from "@/components/admin/PendingMatchesSection";
import EditScoresSection from "@/components/admin/EditScoresSection";
import { CalendarIcon, ClipboardEdit, Award, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTeam } = useTeams();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const teamQuery = useTeamData();
  const teams = teamQuery.data || [];
  const isLoadingTeams = teamQuery.isLoading;
  
  const { 
    timeslots, 
    isLoading: isLoadingTimeslots, 
    addTimeslot, 
    deleteTimeslot 
  } = useTimeslots(selectedDate);

  const handleTeamSubmit = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      const newTeam = await createTeam(teamData);
      toast({
        title: "Team Created",
        description: `${newTeam.name} has been successfully created.`,
      });
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const handleTimeslotAssign = async (teamId: string, timeslot: string) => {
    try {
      await addTimeslot(selectedDate, teamId, timeslot);
      toast({
        title: "Timeslot Assigned",
        description: "Team timeslot has been successfully assigned.",
      });
    } catch (error) {
      console.error("Error assigning timeslot:", error);
    }
  };

  const handleBatchTimeslotAssign = async (teamIds: string[], timeslot: string) => {
    try {
      const assignmentPromises = teamIds.map(teamId => 
        addTimeslot(selectedDate, teamId, timeslot)
      );
      
      await Promise.all(assignmentPromises);
      
      toast({
        title: "Timeslots Assigned",
        description: `${teamIds.length} team timeslots have been set for ${format(selectedDate, 'MMMM d, yyyy')}`,
      });
    } catch (error) {
      console.error("Error during batch assignment:", error);
      toast({
        title: "Error",
        description: "Some timeslots could not be assigned. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTimeslotDelete = async (id: string) => {
    try {
      await deleteTimeslot(id);
      toast({
        title: "Timeslot Removed",
        description: "Timeslot assignment has been removed.",
      });
    } catch (error) {
      console.error("Error removing timeslot:", error);
    }
  };

  const handleMatchSubmit = async (matchData: any) => {
    toast({
      title: "Match Created",
      description: "New match has been scheduled.",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="teams" className="w-full">
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
        </TabsList>
        
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Create Team</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamForm 
                onSubmit={handleTeamSubmit}
                onCancel={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Create Match</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTeams ? (
                <p>Loading teams...</p>
              ) : (
                <MatchForm 
                  teams={teams}
                  onSubmit={handleMatchSubmit}
                  onCancel={() => {}}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeslots">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Assign Timeslots</CardTitle>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px] pl-3 text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Assign a New Timeslot</h3>
                  {isLoadingTeams ? (
                    <p>Loading teams...</p>
                  ) : (
                    <TimeslotAssignment 
                      selectedDate={selectedDate}
                      teams={teams}
                      existingTimeslots={timeslots}
                      onAssign={handleTimeslotAssign}
                      onBatchAssign={handleBatchTimeslotAssign}
                    />
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Timeslots</h3>
                  {isLoadingTimeslots ? (
                    <p>Loading timeslots...</p>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-md border">
                      <TimeslotList 
                        timeslots={timeslots} 
                        teams={teams}
                        onDelete={handleTimeslotDelete}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scores">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <EditScoresSection />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Approve Results</CardTitle>
              </CardHeader>
              <CardContent>
                <PendingMatchesSection />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
