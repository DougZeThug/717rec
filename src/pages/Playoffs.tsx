import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BracketCreationDialog from "@/components/playoffs/BracketCreationDialog";
import TeamDivisionDialog from "@/components/playoffs/TeamDivisionDialog";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import { usePlayoffData } from "@/hooks/usePlayoffData";

const Playoffs = () => {
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [bracketDialogOpen, setBracketDialogOpen] = useState(false);
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
  
  const handleEditMatch = (matchId: string) => {
    // The match editor will now be handled by the BracketView component directly
    console.log("Edit match requested:", matchId);
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
          onEditMatch={handleEditMatch}
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
    </div>
  );
};

export default Playoffs;
