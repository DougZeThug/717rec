
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import TeamDivisionDialog from "@/components/playoffs/TeamDivisionDialog";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import { usePlayoffData } from "@/hooks/usePlayoffData";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MatchScoreEditor, QuickScoreEditor } from "@/components/playoffs/match-score-editor";
import { PlayoffMatch } from "@/types";

const Playoffs = () => {
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();
  
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
        />
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
              challongeTournamentId={bracket?.challongeTournamentId}
              challongeMatchId={editingMatch.challongeMatchId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Playoffs;
