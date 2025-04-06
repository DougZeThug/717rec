
import React, { useState } from "react";
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
import { mockTeams } from "@/data/mockData";
import TeamCard from "@/components/teams/TeamCard";
import TeamForm from "@/components/teams/TeamForm";
import { Team } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTeam = (teamData: Omit<Team, "id" | "created_at">) => {
    const newTeam: Team = {
      ...teamData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    
    setTeams([...teams, newTeam]);
    setIsFormOpen(false);
    toast({
      title: "Team Created",
      description: `${newTeam.name} has been successfully created.`,
    });
  };

  const handleUpdateTeam = (teamData: Omit<Team, "id" | "created_at">) => {
    if (!editingTeam) return;
    
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
  };

  const handleDeleteTeam = () => {
    if (!deleteTeamId) return;
    
    const teamToDelete = teams.find(team => team.id === deleteTeamId);
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

        {filteredTeams.length > 0 ? (
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
