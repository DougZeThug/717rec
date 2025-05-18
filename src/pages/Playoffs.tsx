
import React from "react";
import PlayoffHeader from "@/components/playoffs/PlayoffHeader";
import { usePlayoffData } from "@/hooks/usePlayoffData";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayoffRealtime } from "@/hooks/usePlayoffRealtime";
import { usePlayoffState } from "@/hooks/playoffs/usePlayoffState";
import { usePlayoffEditMatch } from "@/hooks/playoffs/usePlayoffEditMatch";
import { usePlayoffBracketManagement } from "@/hooks/playoffs/usePlayoffBracketManagement";
import AdminView from "@/components/playoffs/views/AdminView";
import PlayoffView from "@/components/playoffs/views/PlayoffView";
import RealtimeIndicator from "@/components/playoffs/indicators/RealtimeIndicator";
import PlayoffDialogs from "@/components/playoffs/dialogs/PlayoffDialogs";

const Playoffs = () => {
  // Set up state using custom hooks
  const {
    selectedBracketId, setSelectedBracketId,
    teamDialogOpen, setTeamDialogOpen,
    bracketDialogOpen, setBracketDialogOpen,
    activeTab, setActiveTab,
    deletingBracket, setDeletingBracket,
    isDeleting, setIsDeleting
  } = usePlayoffState();
  
  const { editingMatch, isQuickEdit, handleEditMatch, handleCloseMatchEditor, handleSaveMatchScore } = usePlayoffEditMatch();

  const { profile } = useAuth();
  const isAdmin = profile?.is_admin || false;
  
  // Fetch playoff data
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
  
  // Set up bracket management
  const { confirmDeleteBracket } = usePlayoffBracketManagement(
    refetchBrackets,
    selectedBracketId,
    setSelectedBracketId
  );
  
  // Subscribe to real-time updates for the selected bracket
  const { realtimeEnabled, lastUpdatedMatch } = usePlayoffRealtime(selectedBracketId);
  
  // Refetch bracket data when we receive a real-time update
  React.useEffect(() => {
    if (lastUpdatedMatch) {
      refetchBrackets();
    }
  }, [lastUpdatedMatch, refetchBrackets]);

  // Event handlers
  const handleCreateBracket = () => {
    setBracketDialogOpen(true);
  };
  
  const handleEditMatchClick = (matchId: string, quickEdit: boolean = false) => {
    handleEditMatch(matchId, quickEdit)(bracket);
  };

  const handleDeleteBracket = (bracketId: string, bracketName: string) => {
    setDeletingBracket({ id: bracketId, name: bracketName });
  };
  
  const handleConfirmDeleteBracket = async () => {
    if (!deletingBracket) return;
    await confirmDeleteBracket(
      deletingBracket.id,
      deletingBracket.name,
      isDeleting,
      setIsDeleting
    );
  };
  
  const handleSaveScore = async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => {
    await handleSaveMatchScore(
      matchId, 
      team1Score, 
      team2Score, 
      games, 
      team1GameWins, 
      team2GameWins,
      refetchBrackets
    );
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
        
        {/* Admin View with Tabs */}
        {bracket && isAdmin && (
          <AdminView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
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
            onEditMatch={handleEditMatchClick}
            onDeleteBracket={isAdmin ? handleDeleteBracket : undefined}
          />
        )}
        
        {/* Regular View */}
        {(!bracket || !isAdmin) && (
          <PlayoffView
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
            onEditMatch={handleEditMatchClick}
            onDeleteBracket={isAdmin ? handleDeleteBracket : undefined}
          />
        )}
        
        {/* Realtime indicator */}
        <RealtimeIndicator enabled={!!realtimeEnabled && !!selectedBracketId} />
      </div>

      {/* All dialogs */}
      <PlayoffDialogs
        // Team division dialog props
        teamDialogOpen={teamDialogOpen}
        setTeamDialogOpen={setTeamDialogOpen}
        teamsByDivision={teamsByDivision}
        availableDivisions={availableDivisions}
        teamsLoading={teamsLoading}
        onTeamDivisionChange={handleTeamDivisionChange}
        
        // Bracket creation dialog props
        bracketDialogOpen={bracketDialogOpen}
        setBracketDialogOpen={setBracketDialogOpen}
        divisions={divisions || []}
        teams={teams || []}
        onBracketCreated={handleBracketCreated}
        
        // Match editor props
        editingMatch={editingMatch}
        isQuickEdit={isQuickEdit}
        onCloseMatchEditor={handleCloseMatchEditor}
        onSaveMatchScore={handleSaveScore}
        
        // Delete bracket props
        deletingBracket={deletingBracket}
        setDeletingBracket={setDeletingBracket}
        onConfirmDelete={handleConfirmDeleteBracket}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Playoffs;
