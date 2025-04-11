
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import TeamCard from "@/components/teams/TeamCard";
import TeamForm from "@/components/teams/TeamForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*');

      if (error) {
        throw error;
      }

      // Transform the database data to our Team type
      const teamsData = data.map((team: any): Team => ({
        id: team.id,
        name: team.name,
        logoUrl: team.logo_url,
        imageUrl: team.image_url,
        players: team.players ? team.players.map((playerName: string) => ({
          name: playerName
        })) : [],
        wins: 0,
        losses: 0,
        created_at: team.created_at,
        division: team.division_id
      }));

      setTeams(teamsData);
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

      {isFormOpen && (
        <div className="mb-8 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Team</h2>
          <TeamForm 
            onSubmit={handleCreateTeam} 
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center">
          <p>Loading teams...</p>
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <TeamCard 
              key={team.id} 
              team={team}
              onDelete={() => {
                // Handle team deletion
              }}
              onEdit={() => {
                // Handle team editing
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No teams available. Add a team to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Teams;
