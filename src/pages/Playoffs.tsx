import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import TeamDivisionDialog from "@/components/playoffs/TeamDivisionDialog";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import { usePlayoffData } from "@/hooks/usePlayoffData";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MatchScoreEditor, QuickScoreEditor } from "@/components/playoffs/match-score-editor";
import { PlayoffMatch } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import PlayoffAdminSection from "@/components/playoffs/admin/PlayoffAdminSection";
import { usePlayoffRealtime } from "@/hooks/usePlayoffRealtime";
import { usePlayoffBracketData } from "@/hooks/usePlayoffBracketData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteBracketDialog from "@/components/playoffs/DeleteBracketDialog";
import { BracketService } from "@/services/BracketService";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import { useQueryClient } from "@tanstack/react-query";

const Playoffs = () => {
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("view");
  const [deletingBracket, setDeletingBracket] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;
  
  const {
    teams,
    teamsLoading,
    allBrackets,
    bracketsLoading,
    divisions,
    divisionsLoading,
    bracket,
    bracketLoading,
    teamsByDivision,
    bracketsByDivision,
    handleBracketCreated,
    handleTeamDivisionChange,
    refetchBrackets
  } = usePlayoffData(selectedBracketId);
  
  // Subscribe to real-time updates for the selected bracket
  const { realtimeEnabled, lastUpdatedMatch } = usePlayoffRealtime(selectedBracketId);

  // Refetch bracket data when we receive a real-time update
  useEffect(() => {
    if (lastUpdatedMatch) {
      refetchBrackets();
    }
  }, [lastUpdatedMatch, refetchBrackets]);

  const handleCreateBracket = () => {
    setBracketDialogOpen(true);
  };
  
  const handleEditMatch = (matchId: string, quickEdit: boolean = false) => {
    if (!bracket) return;
    
    const match = bracket.matches.find(m => m.id === matchId);
    if (!match) {
      toast({
        title: "Error",
        description: `Match not found: ${matchId}`,
        variant: "destructive"
      });
      return;
    }
    
    setEditingMatch(match);
    setIsQuickEdit(quickEdit);
  };

  const handleCloseMatchEditor = () => {
    setEditingMatch(null);
    setIsQuickEdit(false);
  };
  
  const handleSaveMatchScore = async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number; }[],
    team1GameWins: number,
    team2GameWins: number
  ) => {
    try {
      // Here we would save the match score to the database
      // This is just a placeholder for now
      console.log("Saving match score", {
        matchId,
        team1Score,
        team2Score,
        games,
        team1GameWins,
        team2GameWins
      });
      
      toast({
        title: "Score Saved",
        description: "Match score has been updated successfully.",
      });
      
      // Refresh the brackets data
      await refetchBrackets();
      handleCloseMatchEditor();
    } catch (error) {
      console.error("Error saving match score:", error);
      toast({
        title: "Error",
        description: "Failed to save match score. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    setDeletingBracket({ id: bracketId, name: bracketName });
  };
  
  const confirmDeleteBracket = async () => {
    if (!deletingBracket) return;
    
    setIsDeleting(true);
    
    try {
      await BracketService.deleteBracket(deletingBracket.id);
      
      toast({
        title: "Bracket Deleted",
        description: `"${deletingBracket.name}" has been successfully deleted.`,
      });
      
      // Reset selected bracket if we're deleting the current one
      if (selectedBracketId === deletingBracket.id) {
        setSelectedBracketId(null);
      }
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await invalidateMatchRelatedQueries(queryClient);
      
      // Refetch bracket data
      refetchBrackets();
    } catch (error) {
      console.error("Error deleting bracket:", error);
      toast({
        title: "Error",
        description: "Failed to delete bracket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingBracket(null);
    }
  };

  const isLoading = bracketsLoading || divisionsLoading || teamsLoading || bracketLoading;
  const allBracketsData = allBrackets || [];
  const availableDivisions = divisions?.map(div => div.name) || [];

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <PlayoffHeader 
          onCreateBracket={handleCreateBracket} 
          onOpenTeamDialog={() => setTeamDialogOpen(true)} 
        />
        
        {bracket && isAdmin && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="my-4">
            <TabsList>
              <TabsTrigger value="view">Bracket View</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="view" className="pt-2">
              <PlayoffPageContent
                availableDivisions={availableDivisions}
                bracketsByDivision={bracketsByDivision}
                selectedBracketId={selectedBracketId}
                bracket={bracket}
                teams={teams || []}
                bracketLoading={bracketLoading}
                allBracketsData={allBracketsData}
                isLoading={isLoading}
                onCreateBracket={handleCreateBracket}
                onViewBracket={setSelectedBracketId}
                onEditBracket={handleCreateBracket}
                onEditMatch={(matchId) => handleEditMatch(matchId, true)}
                onDeleteBracket={isAdmin ? handleDeleteBracket : undefined}
              />
            </TabsContent>
            
            <TabsContent value="admin" className="pt-2">
              <PlayoffAdminSection
                bracket={bracket}
                teams={teams || []}
                onEditMatch={handleEditMatch}
              />
            </TabsContent>
          </Tabs>
        )}
        
        {/* If not admin or no bracket selected, just show the normal view */}
        {(!bracket || !isAdmin) && (
          <PlayoffPageContent
            availableDivisions={availableDivisions}
            bracketsByDivision={bracketsByDivision}
            selectedBracketId={selectedBracketId}
            bracket={bracket}
            teams={teams || []}
            bracketLoading={bracketLoading}
            allBracketsData={allBracketsData}
            isLoading={isLoading}
            onCreateBracket={handleCreateBracket}
            onViewBracket={setSelectedBracketId}
            onEditBracket={handleCreateBracket}
            onEditMatch={(matchId) => handleEditMatch(matchId, true)}
            onDeleteBracket={isAdmin ? handleDeleteBracket : undefined}
          />
        )}
        
        {/* Realtime indicator */}
        {realtimeEnabled && selectedBracketId && (
          <div className="fixed bottom-4 right-4 z-20 bg-green-100 dark:bg-green-900/30 rounded-full px-3 py-1 text-xs flex items-center shadow-md">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            <span className="text-green-700 dark:text-green-400">Live updates enabled</span>
          </div>
        )}
      </div>

      <TeamDivisionDialog 
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        teamsByDivision={teamsByDivision}
        availableDivisions={availableDivisions}
        teamsLoading={teamsLoading}
        onTeamDivisionChange={handleTeamDivisionChange}
      />

      <BracketCreationDialog
        open={bracketDialogOpen}
        onOpenChange={setBracketDialogOpen}
        divisions={divisions || []}
        teams={teams || []}
        onBracketCreated={handleBracketCreated}
      />
      
      {/* Match Score Editor Dialog */}
      <Dialog 
        open={!!editingMatch}
        onOpenChange={(open) => {
          if (!open) handleCloseMatchEditor();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {editingMatch && isQuickEdit && (
            <QuickScoreEditor 
              match={editingMatch}
              teams={teams || []}
              onSave={handleSaveMatchScore}
              onCancel={handleCloseMatchEditor}
            />
          )}
          
          {editingMatch && !isQuickEdit && (
            <MatchScoreEditor 
              match={editingMatch}
              teams={teams || []}
              onSave={handleSaveMatchScore}
              onCancel={handleCloseMatchEditor}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Bracket Confirmation Dialog */}
      <DeleteBracketDialog
        open={!!deletingBracket}
        onOpenChange={(open) => {
          if (!open) setDeletingBracket(null);
        }}
        bracketName={deletingBracket?.name || ""}
        onConfirm={confirmDeleteBracket}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Playoffs;
