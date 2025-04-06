
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Plus, Search, Calendar, CheckCircle } from "lucide-react";
import { mockTeams, mockMatches } from "@/data/mockData";
import MatchCard from "@/components/schedule/MatchCard";
import MatchForm from "@/components/schedule/MatchForm";
import { Match } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const Schedule = () => {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [teams] = useState(mockTeams);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const { toast } = useToast();

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  const filteredMatches = matches
    .filter(match => {
      // Filter based on active tab
      if (activeTab === "upcoming") {
        return !match.isCompleted;
      } else if (activeTab === "completed") {
        return match.isCompleted;
      }
      return true;
    })
    .filter(match => {
      // Filter based on search term
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        getTeamName(match.team1Id).toLowerCase().includes(searchLower) ||
        getTeamName(match.team2Id).toLowerCase().includes(searchLower) ||
        match.location.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleCreateMatch = (matchData: Omit<Match, "id">) => {
    const newMatch: Match = {
      ...matchData,
      id: Date.now().toString(),
    };
    
    setMatches([...matches, newMatch]);
    setIsFormOpen(false);
    toast({
      title: "Match Created",
      description: `Match between ${getTeamName(newMatch.team1Id)} and ${getTeamName(newMatch.team2Id)} has been scheduled.`,
    });

    // If match is completed, update team records
    if (newMatch.isCompleted && newMatch.winnerId && newMatch.loserId) {
      updateTeamRecords(newMatch.winnerId, newMatch.loserId);
    }
  };

  const handleUpdateMatch = (matchData: Omit<Match, "id">) => {
    if (!editingMatch) return;
    
    const updatedMatches = matches.map(match => {
      if (match.id === editingMatch.id) {
        return {
          ...match,
          ...matchData
        };
      }
      return match;
    });
    
    setMatches(updatedMatches);
    setEditingMatch(undefined);
    toast({
      title: "Match Updated",
      description: `Match details have been successfully updated.`,
    });

    // If match is newly completed, update team records
    const updatedMatch = { ...editingMatch, ...matchData };
    if (
      updatedMatch.isCompleted && 
      updatedMatch.winnerId && 
      updatedMatch.loserId &&
      (!editingMatch.isCompleted || 
        editingMatch.winnerId !== updatedMatch.winnerId)
    ) {
      updateTeamRecords(updatedMatch.winnerId, updatedMatch.loserId);
    }
  };

  const handleDeleteMatch = () => {
    if (!deleteMatchId) return;
    
    const matchToDelete = matches.find(match => match.id === deleteMatchId);
    const updatedMatches = matches.filter(match => match.id !== deleteMatchId);
    
    setMatches(updatedMatches);
    setDeleteMatchId(null);
    
    if (matchToDelete) {
      toast({
        title: "Match Deleted",
        description: `Match between ${getTeamName(matchToDelete.team1Id)} and ${getTeamName(matchToDelete.team2Id)} has been deleted.`,
        variant: "destructive"
      });
    }
  };

  // This function would actually update team records in a real database
  // For now, it just shows a toast notification
  const updateTeamRecords = (winnerId: string, loserId: string) => {
    const winnerName = getTeamName(winnerId);
    const loserName = getTeamName(loserId);
    
    toast({
      title: "Team Records Updated",
      description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
    });
  };

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Schedule</h1>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search matches"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Button 
              onClick={() => {
                setEditingMatch(undefined);
                setIsFormOpen(true);
              }}
              className="bg-cornhole-green hover:bg-cornhole-green/90"
            >
              <Plus className="h-4 w-4 mr-2" /> New Match
            </Button>
          </div>
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
            {filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match}
                    teams={teams}
                    onEdit={match => {
                      setEditingMatch(match);
                      setIsFormOpen(true);
                    }}
                    onDelete={matchId => setDeleteMatchId(matchId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-500">No upcoming matches found</h3>
                <p className="text-gray-500 mt-2">
                  {searchTerm ? "Try a different search term" : "Get started by creating a new match"}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6">
            {filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match}
                    teams={teams}
                    onEdit={match => {
                      setEditingMatch(match);
                      setIsFormOpen(true);
                    }}
                    onDelete={matchId => setDeleteMatchId(matchId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-500">No completed matches found</h3>
                <p className="text-gray-500 mt-2">
                  {searchTerm ? "Try a different search term" : "Once matches are played, they'll appear here"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create/Edit Match Dialog */}
      <Dialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingMatch ? "Edit Match" : "Create New Match"}</DialogTitle>
          </DialogHeader>
          <MatchForm 
            match={editingMatch}
            teams={teams}
            onSubmit={editingMatch ? handleUpdateMatch : handleCreateMatch}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteMatchId !== null} onOpenChange={() => setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the match from the schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMatch} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Schedule;
