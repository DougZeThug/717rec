
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  const createTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
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
      toast({
        title: "Team Created",
        description: `${newTeam.name} has been successfully created.`,
      });
      
      return newTeam;
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateTeam = async (teamId: string, teamData: Omit<Team, "id" | "created_at">) => {
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
        .eq('id', teamId)
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
        wins: 0,
        losses: 0,
        created_at: data.created_at,
        division: data.division_id
      };
      
      setTeams(teams.map(team => team.id === updatedTeam.id ? updatedTeam : team));
      
      toast({
        title: "Team Updated",
        description: `${updatedTeam.name} has been successfully updated.`,
      });
      
      return updatedTeam;
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: "Error",
        description: "Failed to update team. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
        
      if (error) {
        throw error;
      }
      
      setTeams(teams.filter(team => team.id !== teamId));
      
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
      throw error;
    }
  };

  return {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam
  };
}
