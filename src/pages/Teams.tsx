
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
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
import { Plus, Search } from "lucide-react";
import TeamCard from "@/components/teams/TeamCard";
import TeamForm from "@/components/teams/TeamForm";
import type { Team } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch teams from Supabase
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('name');
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Transform to our application Team type
          const transformedTeams: Team[] = data.map(team => ({
            id: team.id,
            name: team.name,
            logoUrl: team.logo_url,
            imageUrl: team.image_url,
            // Convert string[] to Player[] by mapping each string to a Player object
            players: team.players ? team.players.map((playerName: string) => ({
              name: playerName
            })) : [],
            wins: 0, // We'll calculate this from matches later
            losses: 0, // We'll calculate this from matches later
            created_at: team.created_at,
            division: team.division_id // This will be the division ID from Supabase
          }));
          
          setTeams(transformedTeams);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        toast({
          title: "Error",
          description: "Failed to load teams. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, [toast]);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
    try {
      // Prepare data for Supabase
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          logo_url: teamData.logoUrl,
          image_url: teamData.imageUrl,
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
        wins: teamData.wins,
        losses: teamData.losses,
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
    if (!editingTeam) return;
    
    try {
      // Prepare data for Supabase
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamData.name,
          logo_url: teamData.logoUrl,
          image_url: teamData.imageUrl,
          players: teamData.players.map(p => p.name),
          division_id: teamData.division
        })
        .eq('id', editingTeam.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      const updatedTeams = teams.map(team => {
        if (team.id === editingTeam.id) {
          return {
            ...team,
            ...teamData
          };
        }
        return team;
      });
      
      setTeams(updatedTeams);
      setEditingTeam(undefined);
      toast({
        title: "Team Updated",
        description: `${teamData.name} has been successfully updated.`,
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
      const teamToDelete = teams.find(team => team.id === deleteTeamId);
      
      // Delete the team from Supabase
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', deleteTeamId);
        
      if (error) {
        throw error;
      }

      // If team had an image in storage, delete it
      if (teamToDelete?.imageUrl && teamToDelete.imageUrl.includes('team-images')) {
        try {
          // Extract the file path from the URL
          const filePathMatch = teamToDelete.imageUrl.match(/team-images\/([^?]+)/);
          if (filePathMatch && filePathMatch[1]) {
            const filePath = filePathMatch[1];
            
            // Delete the file from storage
            await supabase.storage
              .from('team-images')
              .remove([filePath]);
          }
        } catch (storageError) {
          console.error("Error removing team image:", storageError);
          // Continue with team deletion even if image deletion fails
        }
      }
      
      // Update local state
      const updatedTeams = teams.filter(team => team.id !== deleteTeamId);
      
      setTeams(updatedTeams);
      setDeleteTeamId(null);
      
      if (teamToDelete) {
        toast({
          title: "Team Deleted",
          description: `${teamToDelete.name} has been successfully deleted.`,
          variant: "destructive"
        });
      }
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
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Teams</h1>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search teams"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Button 
              onClick={() => {
                setEditingTeam(undefined);
                setIsFormOpen(true);
              }}
              className="bg-cornhole-green hover:bg-cornhole-green/90"
            >
              <Plus className="h-4 w-4 mr-2" /> New Team
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cornhole-navy"></div>
            <p className="mt-2 text-gray-500">Loading teams...</p>
          </div>
        ) : filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeams.map(team => (
              <TeamCard 
                key={team.id} 
                team={team} 
                onEdit={team => {
                  setEditingTeam(team);
                  setIsFormOpen(true);
                }}
                onDelete={teamId => setDeleteTeamId(teamId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-500">No teams found</h3>
            <p className="text-gray-500 mt-2">
              {searchTerm ? "Try a different search term" : "Get started by creating a new team"}
            </p>
          </div>
        )}
      </div>
      
      {/* Create/Edit Team Dialog */}
      <Dialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
          </DialogHeader>
          <TeamForm 
            team={editingTeam}
            onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteTeamId !== null} onOpenChange={() => setDeleteTeamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team and remove it from the league.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Teams;
