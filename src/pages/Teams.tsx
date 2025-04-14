
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import TeamCard from "@/components/teams/TeamCard";
import TeamForm from "@/components/teams/TeamForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      
      // Simple fetch that only gets the essential fields
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, image_url, players, created_at, division_id, seed')
        .order('name');

      if (error) {
        throw error;
      }

      // Process the data to match our Team type, with safe fallbacks for missing fields
      const teamsData = data.map((team: any): Team => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        logoUrl: team.logo_url || undefined,
        imageUrl: team.image_url || undefined,
        // Handle missing players array safely
        players: Array.isArray(team.players) 
          ? team.players.map((playerName: string) => ({ name: playerName })) 
          : [],
        wins: 0, // These will be populated separately if needed
        losses: 0,
        created_at: team.created_at,
        division: team.division_id
      }));

      setTeams(teamsData);
      console.log("Teams fetched successfully:", teamsData);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      // Prepare data for Supabase
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          logo_url: teamData.logoUrl,
          image_url: teamData.imageUrl || null, // Use null if no image
          players: teamData.players.map(p => p.name),
          seed: null, // Default
          division_id: teamData.division
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Transform the new team to our application Team type
      const newTeam: Team = {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        players: data.players ? data.players.map((playerName: string) => ({
          name: playerName
        })) : [],
        wins: 0,
        losses: 0,
        created_at: data.created_at,
        division: data.division_id
      };
      
      setTeams([...teams, newTeam]);
      setIsFormOpen(false);
      toast({
        title: "Team Created",
        description: `${newTeam.name} has been successfully created.`,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    if (!teamToEdit) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: teamData.name,
          logo_url: teamData.logoUrl,
          image_url: teamData.imageUrl || null,
          players: teamData.players.map(p => p.name),
          division_id: teamData.division
        })
        .eq('id', teamToEdit.id)
        .select()
        .single();
        
      if (error) {
        throw error;
      }

      // Update the teams state with the updated team
      const updatedTeam: Team = {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url,
        imageUrl: data.image_url,
        players: data.players ? data.players.map((playerName: string) => ({
          name: playerName
        })) : [],
        wins: teamToEdit.wins,
        losses: teamToEdit.losses,
        created_at: data.created_at,
        division: data.division_id
      };
      
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      setTeamToEdit(null);
      toast({
        title: "Team Updated",
        description: `${updatedTeam.name} has been successfully updated.`,
      });
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: "Failed to update team. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', deleteTeamId);
        
      if (error) {
        throw error;
      }
      
      setTeams(teams.filter(team => team.id !== deleteTeamId));
      setDeleteTeamId(null);
      toast({
        title: "Team Deleted",
        description: "The team has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive"
      });
      setDeleteTeamId(null);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add Team
        </Button>
      </div>

      {(isFormOpen || teamToEdit) && (
        <div className="mb-8 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {teamToEdit ? "Edit Team" : "Create New Team"}
          </h2>
          <TeamForm 
            team={teamToEdit || undefined}
            onSubmit={teamToEdit ? handleUpdateTeam : handleCreateTeam} 
            onCancel={() => {
              setIsFormOpen(false);
              setTeamToEdit(null);
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-20 w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team}
              onDelete={(teamId) => setDeleteTeamId(teamId)}
              onEdit={(team) => setTeamToEdit(team)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No teams available. Add a team to get started.</p>
        </div>
      )}

      <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Teams;
